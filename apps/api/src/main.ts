import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { API_PREFIX, configureApp } from './common/configure-app';

async function bootstrap(): Promise<void> {
  const app = configureApp(await NestFactory.create(AppModule));

  const port = app.get(ConfigService).getOrThrow<number>('PORT');
  await app.listen(port);

  console.log(`API listening on http://localhost:${port}/${API_PREFIX}`);
}

void bootstrap();
