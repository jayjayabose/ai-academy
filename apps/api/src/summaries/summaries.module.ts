import { Module } from '@nestjs/common';
import { ANTHROPIC_CLIENT, createAnthropicClient } from './anthropic-client';
import { SummariesService } from './summaries.service';

/**
 * No SequelizeModule import, deliberately: SummariesService never touches the
 * database. It takes a lead and its interactions and returns three fields;
 * LeadsService owns reading and writing them.
 */
@Module({
  providers: [
    SummariesService,
    { provide: ANTHROPIC_CLIENT, useFactory: createAnthropicClient },
  ],
  exports: [SummariesService],
})
export class SummariesModule {}
