import { SetMetadata } from '@nestjs/common';

export const DOCUMENT_TYPE_KEY = 'documentTypes';
export const RequireDocumentType = (...documentTypes: string[]) =>
  SetMetadata(DOCUMENT_TYPE_KEY, documentTypes);

