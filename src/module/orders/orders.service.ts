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
  PRODUCT_NOT_AVAILABLE,
  QUANTITY_INVALID,
  RECENT_ORDERS_LIMIT,
  notEnoughStock,
} from './orders.constants';

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
