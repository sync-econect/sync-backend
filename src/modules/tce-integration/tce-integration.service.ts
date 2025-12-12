import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Remittance, Prisma } from '../../../generated/prisma/client';
import { TceMockService, TceResponse } from './tce-mock.service';
import { UserPermissionsService } from '../user-permissions/user-permissions.service';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

export interface SendResult {
  remittance: Remittance;
  response: TceResponse;
  duration: number;
}

@Injectable()
export class TceIntegrationService {
  private readonly logger = new Logger(TceIntegrationService.name);
  private readonly isMockMode: boolean;
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private httpService: HttpService,
    private tceMockService: TceMockService,
    private userPermissionsService: UserPermissionsService,
  ) {
    this.isMockMode =
      this.configService.get<string>('TCE_API_MOCK', 'true') === 'true';
    this.baseUrl = this.configService.get<string>(
      'TCE_API_BASE_URL',
      'https://api.tce.ms.gov.br/esfinge',
    );
    this.timeout = parseInt(
      this.configService.get<string>('TCE_API_TIMEOUT', '30000'),
      10,
    );

    this.logger.log(
      `TCE Integration initialized - Mock Mode: ${this.isMockMode}`,
    );
  }

  async sendRemittance(
    remittanceId: number,
    userId?: number,
  ): Promise<SendResult> {
    const remittance = await this.prisma.client.remittance.findUnique({
      where: { id: remittanceId },
      include: { unit: true },
    });

    if (!remittance) {
      throw new NotFoundException(
        `Remittance com ID ${remittanceId} não encontrada`,
      );
    }

    // Verifica permissão granular por UG e módulo
    if (userId) {
      const hasPermission = await this.userPermissionsService.checkPermission({
        userId,
        unitId: remittance.unitId,
        module: remittance.module,
        action: 'transmit',
      });

      if (!hasPermission) {
        throw new ForbiddenException(
          'Você não tem permissão para transmitir remessas desta UG/módulo',
        );
      }
    }

    if (remittance.status !== 'READY') {
      throw new Error(
        `Remessa não está pronta para envio. Status atual: ${remittance.status}`,
      );
    }

    await this.prisma.client.remittance.update({
      where: { id: remittanceId },
      data: { status: 'SENDING' },
    });

    const endpoint = await this.getEndpoint(remittance.module);
    const token = this.getToken(
      remittance.unit.ambiente,
      remittance.unit.tokenProducao,
      remittance.unit.tokenHomologacao,
    );

    const startTime = Date.now();
    let response: TceResponse;

    try {
      await this.logRequest(
        remittanceId,
        endpoint,
        remittance.payload as Record<string, unknown>,
        token,
      );

      if (this.isMockMode) {
        response = await this.tceMockService.sendToTce(
          endpoint,
          remittance.payload as Record<string, unknown>,
        );
      } else {
        response = await this.sendToRealApi(
          endpoint,
          remittance.payload as Record<string, unknown>,
          token,
        );
      }

      const duration = Date.now() - startTime;

      await this.logResponse(remittanceId, response, duration);

      const updatedRemittance = await this.updateRemittanceAfterSend(
        remittanceId,
        response,
      );

      return {
        remittance: updatedRemittance,
        response,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';

      await this.logResponse(
        remittanceId,
        {
          success: false,
          message: errorMessage,
        },
        duration,
        500,
      );

      await this.prisma.client.remittance.update({
        where: { id: remittanceId },
        data: {
          status: 'ERROR',
          errorMsg: errorMessage,
        },
      });

      throw error;
    }
  }

  private async sendToRealApi(
    endpoint: string,
    payload: Record<string, unknown>,
    token: string,
  ): Promise<TceResponse> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await firstValueFrom(
        this.httpService.post<TceResponse>(url, payload, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          timeout: this.timeout,
        }),
      );

      return {
        success: true,
        protocolo: response.data.protocolo,
        message: response.data.message ?? 'Sucesso',
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        const responseData = error.response?.data as Record<string, unknown>;
        return {
          success: false,
          message:
            (responseData?.message as string) ??
            error.message ??
            'Erro na comunicação',
          errors: (responseData?.errors as string[]) ?? [],
        };
      }
      throw error;
    }
  }

  private async logRequest(
    remittanceId: number,
    endpoint: string,
    payload: Record<string, unknown>,
    token: string,
  ): Promise<void> {
    await this.prisma.client.remittanceLog.create({
      data: {
        remittanceId,
        direction: 'REQUEST',
        url: `${this.baseUrl}${endpoint}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.substring(0, 10)}...`,
        } as Prisma.InputJsonValue,
        body: payload as Prisma.InputJsonValue,
      },
    });
  }

  private async logResponse(
    remittanceId: number,
    response: TceResponse,
    duration: number,
    statusCode?: number,
  ): Promise<void> {
    await this.prisma.client.remittanceLog.create({
      data: {
        remittanceId,
        direction: 'RESPONSE',
        statusCode: statusCode ?? (response.success ? 200 : 400),
        body: response as unknown as Prisma.InputJsonValue,
        duration,
      },
    });
  }

  private async updateRemittanceAfterSend(
    remittanceId: number,
    response: TceResponse,
  ): Promise<Remittance> {
    if (response.success) {
      return this.prisma.client.remittance.update({
        where: { id: remittanceId },
        data: {
          status: 'SENT',
          protocol: response.protocolo,
          sentAt: new Date(),
          errorMsg: null,
        },
      });
    } else {
      return this.prisma.client.remittance.update({
        where: { id: remittanceId },
        data: {
          status: 'ERROR',
          errorMsg: response.message ?? 'Erro no envio',
        },
      });
    }
  }

  private async getEndpoint(module: string): Promise<string> {
    const config = await this.prisma.client.endpointConfig.findFirst({
      where: { module, active: true },
    });

    if (config) {
      return config.endpoint;
    }

    return `/${module.toLowerCase().replace(/_/g, '-')}`;
  }

  private getToken(
    ambiente: string,
    tokenProducao: string | null,
    tokenHomologacao: string | null,
  ): string {
    if (ambiente === 'PRODUCAO' && tokenProducao) {
      return tokenProducao;
    }
    return tokenHomologacao ?? 'mock-token';
  }

  async getRemittanceLogs(remittanceId: number) {
    const remittance = await this.prisma.client.remittance.findUnique({
      where: { id: remittanceId },
    });

    if (!remittance) {
      throw new NotFoundException(
        `Remittance com ID ${remittanceId} não encontrada`,
      );
    }

    return this.prisma.client.remittanceLog.findMany({
      where: { remittanceId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
