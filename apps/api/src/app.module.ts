import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { RootConfigModule } from './config/root-config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { InteractionsModule } from './interactions/interactions.module';
import { LeadsModule } from './leads/leads.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    RootConfigModule,
    DatabaseModule,
    // Phase 0 pre-wiring: both feature modules are registered here, as skeletons,
    // so the two parallel branches never both edit this file.
    AuthModule,
    HealthModule,
    LeadsModule,
    InteractionsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
