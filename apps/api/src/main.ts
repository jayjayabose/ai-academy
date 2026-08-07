import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Decision 7: single global prefix so the Angular dev proxy is one clean
  // `/api` -> localhost:3000 rule.
  app.setGlobalPrefix('api');

  const port = app.get(ConfigService).getOrThrow<number>('PORT');
  await app.listen(port);

  console.log(`API listening on http://localhost:${port}/api`);
}

void bootstrap();
