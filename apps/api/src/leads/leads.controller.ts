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
   * DECLARED BEFORE `:id/score`, and it has to be.
   *
   * Nest matches routes in DECLARATION order, not by specificity. With the two
   * the other way round, `scores` is captured as `:id`, ParseUUIDPipe rejects
   * it, and the bulk endpoint answers 400 to every request — a failure that
   * looks like a client bug and lives in a file nobody suspects. There is an
   * integration test whose entire job is to prove this one returns 200.
   *
   * `scores/recalculate` rather than a bare `recalculate` so the path says what
   * it recalculates; the segment can never collide with a UUID either way, but
   * the collision is a property of the declaration order above, not of the
   * word.
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
