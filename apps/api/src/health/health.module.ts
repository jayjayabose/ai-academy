import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Smoke } from '../database/smoke.model';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
    imports: [SequelizeModule.forFeature([Smoke])],
    controllers: [HealthController],
    providers: [HealthService],
})
export class HealthModule {}
