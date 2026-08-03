import { Controller, Get } from '@nestjs/common';
import { HealthReport, HealthService } from './health.service';

/** Mounted at /api/health — the global prefix is set in main.ts. */
@Controller('health')
export class HealthController {
    constructor(private readonly health: HealthService) {}

    @Get()
    liveness(): { status: 'ok' } {
        return { status: 'ok' };
    }

    @Get('db')
    readiness(): Promise<HealthReport> {
        return this.health.check();
    }
}
