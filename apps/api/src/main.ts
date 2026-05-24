import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser') as () => ReturnType<typeof import('cookie-parser')>;
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Security headers via Helmet
  app.use(helmet());

  // Cookie parser — required for httpOnly JWT cookie extraction
  app.use(cookieParser());

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  // CORS — accept localhost (dev) + configured production origin
  const prodOrigin = configService.get<string>('CORS_ORIGIN', '');
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    ...(prodOrigin ? [prodOrigin] : []),
  ];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global pipes — validates all incoming DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = configService.get<number>('PORT', 4000);
  await app.listen(port);

  console.log(`🏛️  Arbitration Sandbox API running on http://localhost:${port}`);
}

bootstrap();
