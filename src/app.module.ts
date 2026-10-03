import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import redisConfig from './config/redis.config';
import twilioConfig from './config/twilio.config';
import llmConfig from './config/llm.config';
import mailConfig from './config/mail.config';
import alertsConfig from './config/alerts.config';
import paystackConfig from './config/paystack.config';
import { redisConnectionOptions } from './common/utils/redis-connection.util';
import { DEFAULT_JOB_OPTIONS } from './common/queue.constants';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import appConfig from './config/app.config';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { WhatsappModule } from './module/whatsapp/whatsapp.module';
import { PaymentsModule } from './module/payments/payments.module';
import { LifecycleModule } from './module/lifecycle/lifecycle.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        redisConfig,
        twilioConfig,
        llmConfig,
        mailConfig,
        alertsConfig,
        paystackConfig,
      ],
      validate: validateEnv,
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: redisConnectionOptions(config),
        defaultJobOptions: DEFAULT_JOB_OPTIONS,
      }),
    }),

    PrismaModule,
    WhatsappModule,
    PaymentsModule,
    LifecycleModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
