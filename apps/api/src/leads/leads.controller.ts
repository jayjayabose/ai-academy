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

  /**
   * DECLARED BEFORE `:id/score`, as the rule says — though MEASURED, the two do
   * not actually collide, and the comment should say so rather than repeat a
   * hazard it does not have.
   *
   * Nest matches routes in declaration order, not by specificity, so a literal
   * segment declared after a param route can be captured as the param. That is
   * real: swap the order and add a colliding path and you get it immediately —
   * `POST /api/leads/scores/score` against `@Post(':id/score')` declared first
   * answers `400 Validation failed (uuid is expected)`, which reads like a
   * client bug and lives in a file nobody suspects.
   *
   * It does not bite HERE because the second segment differs: matching
   * `scores/recalculate` against `:id/score` fails on `recalculate` vs `score`
   * whichever way round they are declared. The order is kept anyway, because it
   * is what keeps that true if either path is ever shortened — the day someone
   * writes `@Post('recalculate')` against a `@Post(':id')`, the order is the
   * only thing standing between them.
   *
   * 200 with the whole book, in GET /api/leads order (R3): the client replaces
   * its table from this response, so anything less than every row would leave
   * it merging.
   */
  @Post('scores/recalculate')
  @HttpCode(HttpStatus.OK)
  rescoreAll(): Promise<LeadResource[]> {
    return this.leads.rescoreAll();
  }

  /**
   * 200 with the updated lead, for the same reason `:id/summary` answers 200:
   * this recomputes a field of an existing resource, it does not create a
   * subordinate one with an identity of its own.
   *
   * The whole `Lead` rather than just the score, unlike the summary endpoint.
   * Both score fields live on `Lead` itself, so returning the row costs no new
   * wire type and saves the client from patching two fields into an object it
   * already holds.
   */
  @Post(':id/score')
  @HttpCode(HttpStatus.OK)
  rescore(@Param('id', ParseUUIDPipe) id: string): Promise<LeadResource> {
    return this.leads.rescore(id);
  }
}
