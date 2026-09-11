import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
// import type { Multer, memoryStorage } from 'multer';

import { DocumentsService } from './documents.service';

import { KeycloakAuthGuard } from '../auth/guards/keycloak-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.interface';
import type { Multer } from 'multer';
import { memoryStorage } from 'multer';

@Controller('applications/:applicationId/documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
  ) {}

  @Get()
  @UseGuards(KeycloakAuthGuard)
  findDocuments(
    @Param('applicationId') applicationId: string,
    @Request() request: AuthenticatedRequest,
  ) {
    const customerId = request.user.sub;
    const roles = request.user.realm_access?.roles ?? [];

    return this.documentsService.findDocuments(
      Number(applicationId),
      customerId,
      roles,
    );
  }
  
  @Post()
  @UseGuards(KeycloakAuthGuard)
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
  uploadDocument(
    @Param('applicationId') applicationId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('documentType') documentType: string,
    @Request() request: AuthenticatedRequest,
  ) {
    const customerId = request.user.sub;

    return this.documentsService.uploadDocument(
      Number(applicationId),
      customerId,
      documentType,
      file,
    );
  }

  @Delete(':documentId')
  @UseGuards(KeycloakAuthGuard)
  deleteDocument(
  @Param('applicationId') applicationId: string,
  @Param('documentId') documentId: string,
  @Request() request: AuthenticatedRequest,
  ) {
  const customerId = request.user.sub;

  return this.documentsService.deleteDocument(
    Number(applicationId),
    Number(documentId),
    customerId,
  );
}

  @Patch(':documentId')
  @UseGuards(KeycloakAuthGuard)
  @UseInterceptors(
  FileInterceptor('file', {
    storage: memoryStorage(),
  }),
)
replaceDocument(
  @Param('applicationId') applicationId: string,
  @Param('documentId') documentId: string,
  @UploadedFile() file: Express.Multer.File,
  @Request() request: AuthenticatedRequest,
) {
  const customerId = request.user.sub;

  return this.documentsService.replaceDocument(
    Number(applicationId),
    Number(documentId),
    customerId,
    file,
  );
}
}