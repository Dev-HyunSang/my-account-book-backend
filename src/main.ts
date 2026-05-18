import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Account Book API')
      .setDescription(
        'Personal account-book backend — auth, health, incomes, and recurring transactions.',
      )
      .addTag('auth', 'Register / login / refresh / logout')
      .addTag('incomes', 'Income entries (date, amount, memo) for the authenticated user')
      .addTag('health', 'Liveness and readiness probes')
      .setVersion('0.1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      useGlobalPrefix: true,
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = process.env.PORT ?? 3000;
  console.log(`Listening on port ${port}`);
  console.log(`Swagger REST API Docs on http://localhost:${port}/api/v1/api/docs`);
  await app.listen(port);
}

bootstrap();
