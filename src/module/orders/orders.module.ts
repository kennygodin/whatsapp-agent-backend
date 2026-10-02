import { Module } from '@nestjs/common';
import { LeadsModule } from '../leads/leads.module';
import { ProductsModule } from '../products/products.module';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';
import { PaystackModule } from '../paystack/paystack.module';

@Module({
  imports: [LeadsModule, ProductsModule, PaystackModule],
  providers: [OrdersRepository, OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
