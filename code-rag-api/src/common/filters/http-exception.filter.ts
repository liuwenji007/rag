import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error: string | undefined;
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj.message as string) || message;
        error = (responseObj.error as string) || error;
        details = responseObj.details;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    const errorResponse: Record<string, unknown> = {
      code: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (error) {
      errorResponse.error = error;
    }

    if (details) {
      errorResponse.details = details;
    }

    response.status(status).json(errorResponse);
  }
}
