import { Module } from '@nestjs/common';
import { CustomersRepository } from './customers.repository';
import { LeadsRepository } from './leads.repository';
import { LeadsService } from './leads.service';

@Module({
  providers: [CustomersRepository, LeadsRepository, LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
