import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Validation } from '../../../generated/prisma/client';
import {
  evaluateRule,
  getFieldValue,
  safeStringify,
  ValidationOperator,
} from './operators/validation-operators';

export interface ValidationResult {
  rawDataId: number;
  module: string;
  hasBlockingErrors: boolean;
  validations: ValidationResultItem[];
  summary: {
    total: number;
    impeditivas: number;
    alertas: number;
  };
}

export interface ValidationResultItem {
  ruleId: number;
  code: string;
  level: string;
  field: string;
  message: string;
  value: string;
}

@Injectable()
export class ValidationsService {
  constructor(private prisma: PrismaService) {}

  async validateRawData(rawDataId: number): Promise<ValidationResult> {
    const rawData = await this.prisma.client.rawData.findUnique({
      where: { id: rawDataId },
    });

    if (!rawData) {
      throw new NotFoundException(`RawData com ID ${rawDataId} não encontrado`);
    }

    const rules = await this.prisma.client.validationRule.findMany({
      where: {
        module: rawData.module,
        active: true,
      },
    });

    const validationResults: ValidationResultItem[] = [];
    const payload = rawData.payload as Record<string, unknown>;

    for (const rule of rules) {
      const fieldValue = getFieldValue(payload, rule.field);
      const ruleViolated = evaluateRule(
        fieldValue,
        rule.operator as ValidationOperator,
        rule.value,
      );

      if (ruleViolated) {
        const valueString = safeStringify(fieldValue);

        validationResults.push({
          ruleId: rule.id,
          code: rule.code,
          level: rule.level,
          field: rule.field,
          message: rule.message,
          value: valueString,
        });

        await this.prisma.client.validation.create({
          data: {
            rawId: rawDataId,
            ruleId: rule.id,
            level: rule.level,
            code: rule.code,
            message: rule.message,
            field: rule.field,
            value: valueString,
          },
        });
      }
    }

    const impeditivas = validationResults.filter(
      (v) => v.level === 'IMPEDITIVA',
    ).length;
    const alertas = validationResults.filter(
      (v) => v.level === 'ALERTA',
    ).length;

    return {
      rawDataId,
      module: rawData.module,
      hasBlockingErrors: impeditivas > 0,
      validations: validationResults,
      summary: {
        total: validationResults.length,
        impeditivas,
        alertas,
      },
    };
  }

  async getValidationsByRawData(rawDataId: number): Promise<Validation[]> {
    const rawData = await this.prisma.client.rawData.findUnique({
      where: { id: rawDataId },
    });

    if (!rawData) {
      throw new NotFoundException(`RawData com ID ${rawDataId} não encontrado`);
    }

    return this.prisma.client.validation.findMany({
      where: { rawId: rawDataId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async clearValidations(rawDataId: number): Promise<{ count: number }> {
    const rawData = await this.prisma.client.rawData.findUnique({
      where: { id: rawDataId },
    });

    if (!rawData) {
      throw new NotFoundException(`RawData com ID ${rawDataId} não encontrado`);
    }

    const result = await this.prisma.client.validation.deleteMany({
      where: { rawId: rawDataId },
    });

    return { count: result.count };
  }

  async revalidate(rawDataId: number): Promise<ValidationResult> {
    await this.clearValidations(rawDataId);
    return this.validateRawData(rawDataId);
  }

  async findAll(filters?: {
    rawId?: number;
    level?: string;
    code?: string;
  }): Promise<Validation[]> {
    return this.prisma.client.validation.findMany({
      where: {
        ...(filters?.rawId && { rawId: filters.rawId }),
        ...(filters?.level && { level: filters.level }),
        ...(filters?.code && { code: filters.code }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number): Promise<Validation> {
    const validation = await this.prisma.client.validation.findUnique({
      where: { id },
    });

    if (!validation) {
      throw new NotFoundException(`Validation com ID ${id} não encontrada`);
    }

    return validation;
  }
}
