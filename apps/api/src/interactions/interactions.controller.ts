import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import { Interaction } from './interaction.model';
import { InteractionsService } from './interactions.service';

/**
 * Mounted at /api/leads/:leadId/interactions.
 *
 * Nested because the parent is semantically required for creation. Interaction
 * is a composed resource with independent identity — lifecycle-dependent on Lead
 * (hence ON DELETE CASCADE) but not access-dependent — so the flat routes go in
 * when something needs them, which nothing does yet (contract §4).
 */
@Controller('leads/:leadId/interactions')
export class InteractionsController {
  constructor(private readonly interactions: InteractionsService) {}

  @Post()
  create(
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Body() dto: CreateInteractionDto,
  ): Promise<Interaction> {
    return this.interactions.create(leadId, dto);
  }
}
