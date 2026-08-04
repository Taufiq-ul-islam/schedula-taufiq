import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT) || 3000;

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,        // strips properties not defined in the DTO
    forbidNonWhitelisted: true, // throws an error if extra properties are sent
    transform: true,        // auto-transforms payloads to DTO instances
  }));

  await app.listen(port, '0.0.0.0');
}
bootstrap();
