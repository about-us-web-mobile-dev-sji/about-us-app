import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import cookieParser from 'cookie-parser';
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  const corsOptions = {
    origin: new URL(process.env.AUTH_WEB_ORIGIN || 'http://localhost:4200')
      .origin,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };
  app.use(cookieParser());
  app.enableCors(corsOptions);
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
