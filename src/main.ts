import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,        // strips properties not defined in the DTO
    forbidNonWhitelisted: true, // throws an error if extra properties are sent
    transform: true,        // auto-transforms payloads to DTO instances
  }));
  await app.listen(3000);
}
bootstrap();
