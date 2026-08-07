import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Lead } from './lead.model';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  imports: [SequelizeModule.forFeature([Lead])],
  controllers: [LeadsController],
  providers: [LeadsService],
  // InteractionsModule needs it: creating an interaction under a lead that does
  // not exist must 404, and exporting the service keeps one definition of that
  // message rather than a second existence check written slightly differently.
  exports: [LeadsService],
})
export class LeadsModule {}
