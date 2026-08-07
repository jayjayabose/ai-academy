import { Module } from '@nestjs/common';
import { RootConfigModule } from './config/root-config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [RootConfigModule, DatabaseModule, HealthModule],
})
export class AppModule {}
