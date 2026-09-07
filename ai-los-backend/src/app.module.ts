import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoanProductsModule } from './loan-products/loan-products.module';
import { ApplicationsModule } from './applications/applications.module';
import { DocumentsModule } from './documents/documents.module';
import { EligibilityModule } from './eligibility/eligibility.module';
import { ReviewsModule } from './reviews/reviews.module';
import { DecisionsModule } from './decisions/decisions.module';
import { AiModule } from './ai/ai.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
     TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,

      autoLoadEntities: true,
      synchronize: true,
    }),
    HealthModule,
    AuthModule,
    LoanProductsModule,
    ApplicationsModule,
    DocumentsModule,
    EligibilityModule,
    ReviewsModule,
    DecisionsModule,
    AiModule,
  ],
  // controllers: [AppController, HeatlhController],
  // providers: [AppService],
})
export class AppModule {}