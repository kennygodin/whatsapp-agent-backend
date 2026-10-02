import { Injectable } from '@nestjs/common';
import { isEmail } from 'class-validator';
import { formatNaira } from '../../common/utils/money.util';
import { LeadsService } from '../leads/leads.service';
import { ProductsService } from '../products/products.service';
import { OrderRuleError } from './order-rule.error';
import { OrdersRepository } from './orders.repository';
import {
  EMAIL_INVALID,
  EMAIL_REQUIRED,
  MAX_ORDER_QUANTITY,
  NO_PENDING_ORDER,
  ORDER_CHANGED,
  PAYMENT_CURRENCY,
  PRODUCT_NOT_AVAILABLE,
  QUANTITY_INVALID,
  RECENT_ORDERS_LIMIT,
  notEnoughStock,
  paymentReference,
} from './orders.constants';
import { PaystackService } from '../paystack/paystack.service';
import { OrderStatus } from '../../generated/prisma/enums';

export interface VerifiedPayment {
  reference: string;
  amountKobo: number;
  currency: string;
  paidAt: Date;
}

export type PaymentOutcome =
  | { kind: 'unknown_reference' }
  | { kind: 'already_paid' }
  | { kind: 'paid_cancelled_order'; leadId: string }
  | { kind: 'amount_mismatch'; leadId: string }
  | {
      kind: 'paid';
      leadId: string;
      stockOk: boolean;
      product: string;
      quantity: number;
      total: string;
    };

export interface CreateOrderInput {
  leadId: string;
  customerId: string;
  productId: string;
  quantity: number;
  email?: string;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly productsService: ProductsService,
    private readonly leadsService: LeadsService,
    private readonly paystackService: PaystackService,
  ) {}

  async createForLead(input: CreateOrderInput) {
    const { quantity } = input;
    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_ORDER_QUANTITY
    ) {
      throw new OrderRuleError(QUANTITY_INVALID);
    }

    const product = await this.productsService.findActiveById(input.productId);
    if (!product) {
      throw new OrderRuleError(PRODUCT_NOT_AVAILABLE);
    }
    if (product.stock < quantity) {
      throw new OrderRuleError(notEnoughStock(product.name));
    }

    const email = input.email?.trim().toLowerCase() || undefined;
    if (email && !isEmail(email)) {
      throw new OrderRuleError(EMAIL_INVALID);
    }
    const customer = await this.leadsService.getCustomer(input.customerId);
    if (!customer.email && !email) {
      throw new OrderRuleError(EMAIL_REQUIRED);
    }
    const newEmail = email && email !== customer.email ? email : undefined;

    const order = await this.ordersRepository.replacePendingOrder({
      leadId: input.leadId,
      customerId: input.customerId,
      productId: product.id,
      quantity,
      unitPrice: product.price,
      totalAmount: product.price * quantity,
      email: newEmail,
    });

    await this.leadsService.markOrderStarted(input.leadId);

    return {
      orderId: order.id,
      product: product.name,
      quantity: order.quantity,
      unitPrice: formatNaira(order.unitPrice),
      total: formatNaira(order.totalAmount),
      status: order.status,
    };
  }

  async createPaymentLink(input: { leadId: string; customerId: string }) {
    const order = await this.ordersRepository.findPendingForLead(input.leadId);
    if (!order) {
      throw new OrderRuleError(NO_PENDING_ORDER);
    }

    const summary = {
      product: order.product.name,
      quantity: order.quantity,
      total: formatNaira(order.totalAmount),
    };
    if (order.paymentUrl) {
      return { ...summary, paymentUrl: order.paymentUrl };
    }

    const customer = await this.leadsService.getCustomer(input.customerId);
    if (!customer.email) {
      throw new OrderRuleError(EMAIL_REQUIRED);
    }

    const reference = paymentReference(order.id);
    const { authorizationUrl } =
      await this.paystackService.initializeTransaction({
        email: customer.email,
        amountKobo: order.totalAmount,
        reference,
        metadata: { orderId: order.id, leadId: input.leadId },
      });

    const { count } = await this.ordersRepository.attachPaymentLink(
      order.id,
      reference,
      authorizationUrl,
    );
    if (count === 0) {
      throw new OrderRuleError(ORDER_CHANGED);
    }
    return { ...summary, paymentUrl: authorizationUrl };
  }

  async recordPayment(payment: VerifiedPayment): Promise<PaymentOutcome> {
    const order = await this.ordersRepository.findByReference(
      payment.reference,
    );
    if (!order) {
      return { kind: 'unknown_reference' };
    }
    if (order.status === OrderStatus.paid) {
      return { kind: 'already_paid' };
    }
    if (order.status === OrderStatus.cancelled) {
      return { kind: 'paid_cancelled_order', leadId: order.leadId };
    }
    if (
      payment.amountKobo !== order.totalAmount ||
      payment.currency !== PAYMENT_CURRENCY
    ) {
      return { kind: 'amount_mismatch', leadId: order.leadId };
    }

    const { marked, stockOk } =
      await this.ordersRepository.markPaidAndDecrementStock({
        orderId: order.id,
        productId: order.productId,
        quantity: order.quantity,
        paidAt: payment.paidAt,
      });
    if (!marked) {
      return { kind: 'already_paid' };
    }

    await this.leadsService.markConverted(order.leadId);
    return {
      kind: 'paid',
      leadId: order.leadId,
      stockOk,
      product: order.product.name,
      quantity: order.quantity,
      total: formatNaira(order.totalAmount),
    };
  }

  async recentForCustomer(customerId: string) {
    const orders = await this.ordersRepository.findRecentForCustomer(
      customerId,
      RECENT_ORDERS_LIMIT,
    );
    return orders.map((order) => ({
      orderId: order.id,
      product: order.product.name,
      quantity: order.quantity,
      total: formatNaira(order.totalAmount),
      status: order.status,
      placedAt: order.createdAt.toISOString(),
    }));
  }
}
