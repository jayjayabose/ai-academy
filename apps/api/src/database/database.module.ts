import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { Interaction } from '../interactions/interaction.model';
import { Lead } from '../leads/lead.model';

@Module({
    imports: [
        SequelizeModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                dialect: 'postgres' as const,
                host: config.getOrThrow<string>('DB_HOST'),
                port: config.getOrThrow<number>('DB_PORT'),
                username: config.getOrThrow<string>('DB_USER'),
                password: config.getOrThrow<string>('DB_PASSWORD'),
                database: config.getOrThrow<string>('DB_NAME'),

                models: [Lead, Interaction],

                // Decision 3: migrations own the schema. If this were true it would
                // silently fight Umzug and produce drift that only appears on a
                // fresh clone.
                synchronize: false,

                // Decision 4: set globally so no individual model can forget it.
                define: { underscored: true },

                logging: false,
            }),
        }),
    ],
})
export class DatabaseModule {}
