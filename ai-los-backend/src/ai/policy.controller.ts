import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { PolicyDocument } from './entities/policy-document.entity';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { PolicyIngestionService } from './rag/policy-ingestion.service';

@Controller('policies')
export class PolicyController {
  constructor(
  @InjectRepository(PolicyDocument)
  private readonly policyDocumentRepository: Repository<PolicyDocument>,

  private readonly policyIngestionService: PolicyIngestionService,
) {}

  @Post()
  @Roles('manager')
  @UseGuards(KeycloakAuthGuard, RolesGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
      fileFilter: (req, file, callback) => {
        if (file.mimetype !== 'application/pdf') {
          return callback(
            new BadRequestException(
              'Only PDF files are allowed',
            ),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  async uploadPolicy(
    @UploadedFile() file: Express.Multer.File,
    @Body('name') name: string,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Policy PDF is required',
      );
    }

    if (!name) {
      throw new BadRequestException(
        'Policy name is required',
      );
    }

    const uploadDirectory = join(
      process.cwd(),
      'uploads',
      'policies',
    );

    await mkdir(uploadDirectory, {
      recursive: true,
    });

    const storedFileName =
      `${Date.now()}-${file.originalname}`;

    const filePath = join(
      uploadDirectory,
      storedFileName,
    );

    await writeFile(
      filePath,
      file.buffer,
    );

    const policy =
      this.policyDocumentRepository.create({
        name,
        filePath,
        mimeType: file.mimetype,
      });

    return this.policyDocumentRepository.save(policy);
  }

  @Post(':id/ingest')
@Roles('manager')
@UseGuards(KeycloakAuthGuard, RolesGuard)
async ingestPolicy(
  @Param('id', ParseIntPipe) id: number,
) {
  return this.policyIngestionService.ingestPolicy(id);
}
}