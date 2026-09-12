import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  // Correction du typage TypeScript pour le callback CORS
  app.enableCors({
    origin: (
      origin: string | undefined, 
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      if (!origin || origin === 'null' || origin.includes('localhost')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();