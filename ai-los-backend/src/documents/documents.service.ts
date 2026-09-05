import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LoanDocument } from './entities/loan-document.entity';
import { LoanApplication } from '../applications/entities/loan-application.entity';

@Injectable()
export class DocumentsService {
  constructor(
  @InjectRepository(LoanDocument)
  private readonly documentRepository: Repository<LoanDocument>,

  @InjectRepository(LoanApplication)
  private readonly applicationRepository: Repository<LoanApplication>,
) {}

  async uploadDocument(
    applicationId: number,
    customerId: string,
    documentType: string,
    file: Express.Multer.File,
  ) {
    const application = await this.applicationRepository.findOne({
  where: {
    id: applicationId,
  },
});

if (!application) {
  throw new BadRequestException('Application not found');
}

if (application.customerId !== customerId) {
  throw new BadRequestException(
    'You do not have access to this application',
  );
}

if (application.status !== 'DRAFT') {
  throw new BadRequestException(
    'Documents can only be uploaded before submission',
  );
}
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (documentType !== 'SALARY_SLIP') {
      throw new BadRequestException(
        'Unsupported document type',
      );
    }

    const uploadDirectory = join(
      process.cwd(),
      'uploads',
      'applications',
      String(applicationId),
    );

    await mkdir(uploadDirectory, {
      recursive: true,
    });

    const storedFileName = `${Date.now()}-${file.originalname}`;

    const filePath = join(
      uploadDirectory,
      storedFileName,
    );

    await writeFile(filePath, file.buffer);

    const document = this.documentRepository.create({
      applicationId,
      documentType,
      originalFileName: file.originalname,
      storedFileName,
      filePath,
      mimeType: file.mimetype,
      fileSize: file.size,
    });

    return this.documentRepository.save(document);
  }


  async findDocuments(
  applicationId: number,
  customerId: string,
) {
  const application = await this.applicationRepository.findOne({
    where: {
      id: applicationId,
    },
  });

  if (!application) {
    throw new BadRequestException('Application not found');
  }

  if (application.customerId !== customerId) {
    throw new BadRequestException(
      'You do not have access to this application',
    );
  }

  return this.documentRepository.find({
    where: {
      applicationId,
    },
    order: {
      uploadedAt: 'DESC',
    },
  });
  }

  async deleteDocument(
  applicationId: number,
  documentId: number,
  customerId: string,
) {
  const application = await this.applicationRepository.findOne({
    where: {
      id: applicationId,
    },
  });

  if (!application) {
    throw new BadRequestException('Application not found');
  }

  if (application.customerId !== customerId) {
    throw new BadRequestException(
      'You do not have access to this application',
    );
  }

  if (application.status !== 'DRAFT') {
  throw new BadRequestException(
    'Documents can only be deleted before submission',
  );
}

  const document = await this.documentRepository.findOne({
    where: {
      id: documentId,
      applicationId,
    },
  });

  if (!document) {
    throw new BadRequestException('Document not found');
  }

  await this.documentRepository.remove(document);

  return {
    message: 'Document deleted successfully',
  };
  }

  async replaceDocument(
  applicationId: number,
  documentId: number,
  customerId: string,
  file: Express.Multer.File,
  ) {
  const application = await this.applicationRepository.findOne({
    where: {
      id: applicationId,
    },
  });

  if (!application) {
    throw new BadRequestException('Application not found');
  }

  if (application.customerId !== customerId) {
    throw new BadRequestException(
      'You do not have access to this application',
    );
  }

  if (application.status !== 'DRAFT') {
  throw new BadRequestException(
    'Documents can only be replaced before submission',
  );
}

  if (!file) {
    throw new BadRequestException('File is required');
  }

  const document = await this.documentRepository.findOne({
    where: {
      id: documentId,
      applicationId,
    },
  });

  if (!document) {
    throw new BadRequestException('Document not found');
  }

  const uploadDirectory = join(
    process.cwd(),
    'uploads',
    'applications',
    String(applicationId),
  );

  await mkdir(uploadDirectory, {
    recursive: true,
  });

  const storedFileName = `${Date.now()}-${file.originalname}`;

  const filePath = join(
    uploadDirectory,
    storedFileName,
  );

  await writeFile(filePath, file.buffer);

  document.originalFileName = file.originalname;
  document.storedFileName = storedFileName;
  document.filePath = filePath;
  document.mimeType = file.mimetype;
  document.fileSize = file.size;

  return this.documentRepository.save(document);
  }
}