import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { RootConfigModule } from '../../config/root-config';
import { Interaction } from '../../interactions/interaction.model';
import { Lead } from '../../leads/lead.model';
import { DatabaseModule } from '../database.module';
import { SeedService } from './seed.service';

/**
 * Decision 13: the seeder boots via a NestJS standalone application context with
 * this slim module — not the full AppModule, and not a bare ts-node script.
 *
 * Not AppModule, because the seeder has no use for controllers or an HTTP
 * listener. Not a bare script, because seeding needs *models*: a script would
 * have to re-register them and rebuild the connection config that
 * DatabaseModule already assembles, which is the duplication D3 rejected
 * sequelize-cli to avoid. (migrate.ts gets away with being a bare script only
 * because QueryInterface needs no models.)
 */
@Module({
  imports: [
    RootConfigModule,
    DatabaseModule,
    SequelizeModule.forFeature([Lead, Interaction]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
