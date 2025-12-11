import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Request } from 'express';
import { AuditService } from '../../modules/audit/audit.service';

interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

type AuditRequest = Request<
  Record<string, string>,
  unknown,
  unknown,
  Record<string, string>
> & {
  user?: AuthenticatedUser;
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuditRequest>();

    if (!request) {
      return next.handle();
    }

    const { method } = request;
    const routePath =
      typeof request.originalUrl === 'string'
        ? request.originalUrl
        : typeof request.url === 'string'
          ? request.url
          : 'unknown';
    const bodyPayload =
      request.body &&
      typeof request.body === 'object' &&
      !Array.isArray(request.body)
        ? (request.body as Record<string, unknown>)
        : {};
    const entityIdValue = request.params?.id;
    const parsedEntityId =
      entityIdValue && !Number.isNaN(Number(entityIdValue))
        ? Number(entityIdValue)
        : undefined;
    const forwardedFor = request.get('x-forwarded-for');
    const ip =
      forwardedFor?.split(',')[0].trim() ??
      request.ip ??
      request.socket.remoteAddress ??
      '';
    const userAgent = request.get('user-agent') ?? undefined;

    const userId = request.user?.id ?? undefined;

    const logSuccess = async (): Promise<void> => {
      await this.auditService.logAction({
        userId,
        action: method,
        entity: routePath,
        entityId: parsedEntityId,
        newValue: bodyPayload,
        oldValue: null,
        ip,
        userAgent,
      });
    };

    const logError = async (error: unknown): Promise<void> => {
      const errorPayload: Record<string, unknown> = {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };

      await this.auditService.logAction({
        userId,
        action: `ERROR_${method}`,
        entity: routePath,
        entityId: parsedEntityId,
        newValue: errorPayload,
        oldValue: null,
        ip,
        userAgent,
      });
    };

    return next.handle().pipe(
      tap(() => {
        void logSuccess();
      }),
      catchError((error) => {
        void logError(error);
        return throwError(() => error as unknown);
      }),
    );
  }
}
