import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Interaction } from '../interactions/interaction.model';
import { Lead } from '../leads/lead.model';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [SequelizeModule.forFeature([Lead, Interaction])],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
