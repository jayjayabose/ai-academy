import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuthModule } from '../auth/auth.module';
import { Notification } from './notification.model';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';

/**
 * Pre-registered in AppModule (Phase 0). The gateway and the controller's guard
 * inject TOKEN_VERIFIER; AuthModule is imported explicitly (it is global, so this
 * is a no-op in the app) so that a test module holding only LeadsModule still
 * resolves it.
 */
@Module({
  imports: [AuthModule, SequelizeModule.forFeature([Notification])],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway],
  exports: [NotificationsService],
})
export class NotificationsModule {}
