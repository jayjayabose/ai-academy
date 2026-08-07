import { Module } from '@nestjs/common';
import { RootConfigModule } from './config/root-config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { InteractionsModule } from './interactions/interactions.module';
import { LeadsModule } from './leads/leads.module';

@Module({
  imports: [
    RootConfigModule,
    DatabaseModule,
    HealthModule,
    LeadsModule,
    InteractionsModule,
  ],
})
export class AppModule {}
