import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { Configuration } from './config/configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // 用 pino 作为全局 logger
  app.useLogger(app.get(Logger));

  const config = app.get(ConfigService<Configuration, true>);
  const appCfg = config.get('app', { infer: true });

  app.setGlobalPrefix(appCfg.prefix);
  app.enableCors();

  // 全局参数校验: DTO 上的 class-validator 规则自动生效
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // 全局统一响应 + 异常兜底
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  if (appCfg.swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Nestor API')
      .setDescription('企业级 APP 快速开发脚手架 API 文档')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${appCfg.prefix}/docs`, app, document);
  }

  await app.listen(appCfg.port);
  const logger = app.get(Logger);
  logger.log(
    `Nestor API 已启动: http://localhost:${appCfg.port}/${appCfg.prefix} (docs: /${appCfg.prefix}/docs)`,
    'Bootstrap',
  );
}

void bootstrap();
