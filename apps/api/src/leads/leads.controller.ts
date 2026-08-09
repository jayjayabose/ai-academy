import type {
  Lead as LeadResource,
  LeadDetail,
  LeadSummary,
} from '@ai-academy/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadsService } from './leads.service';

/**
 * Mounted at /api/leads — the global prefix is set in main.ts.
 *
 * Conventions adopted from the playbook rather than debated
 * (nestjs-patterns.md:50,60,66): @Post -> 201, @Patch(':id') not PUT,
 * @Delete(':id') -> 204.
 *
 * ParseUUIDPipe on every :id. Without it a malformed id reaches Postgres and
 * comes back as a 500 wrapping `22P02 invalid input syntax for type uuid`; with
 * it, a clean 400. The frontend distinguishes 404 from everything else
 * (core/api-error.ts:44), so a 500 there would read as "the server is broken"
 * rather than "that is not an id".
 *
 * The return types are the wire types from @ai-academy/shared, not the Sequelize
 * models. Until Day 2 they were the models and the comments claimed otherwise;
 * the summary columns made that inaccuracy load-bearing (see lead-wire.ts).
 */
@Controller('leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  findAll(): Promise<LeadResource[]> {
    return this.leads.findAll();
  }

  /** The same row plus its interactions and its summary. */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<LeadDetail> {
    return this.leads.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateLeadDto): Promise<LeadResource> {
    return this.leads.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadDto,
  ): Promise<LeadResource> {
    return this.leads.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.leads.remove(id);
  }

  /**
   * 200, not the 201 the rest of this controller's POSTs return: this does not
   * create a subordinate resource with its own identity, it (re)computes a field
   * of the lead.
   *
   * That is also why it is a POST on `leads` rather than a nested resource the way
   * interactions are. An interaction has an id and a life of its own; a summary
   * has neither — one per lead, replaced wholesale, gone when the lead is. POST
   * rather than PATCH because the work is not idempotent and the body is empty:
   * the client is asking the server to go and produce something.
   */
  @Post(':id/summary')
  @HttpCode(HttpStatus.OK)
  summarize(@Param('id', ParseUUIDPipe) id: string): Promise<LeadSummary> {
    return this.leads.summarize(id);
  }
}
