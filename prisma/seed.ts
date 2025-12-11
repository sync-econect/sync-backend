import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
const SALT_ROUNDS = 12;

async function main() {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log('Iniciando seed...');

  const adminPassword = await bcrypt.hash('Admin@123', SALT_ROUNDS);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@econect.ms.gov.br' },
    update: {},
    create: {
      email: 'admin@econect.ms.gov.br',
      name: 'Administrador do Sistema',
      passwordHash: adminPassword,
      role: 'ADMIN',
      active: true,
    },
  });
  console.log(`Usuário admin criado: ${adminUser.email}`);

  const operatorPassword = await bcrypt.hash('Operador@123', SALT_ROUNDS);
  const operatorUser = await prisma.user.upsert({
    where: { email: 'operador@econect.ms.gov.br' },
    update: {},
    create: {
      email: 'operador@econect.ms.gov.br',
      name: 'Operador de Teste',
      passwordHash: operatorPassword,
      role: 'OPERATOR',
      active: true,
    },
  });
  console.log(`Usuário operador criado: ${operatorUser.email}`);

  const unit = await prisma.unit.upsert({
    where: { code: 'UG001' },
    update: {},
    create: {
      code: 'UG001',
      name: 'Secretaria de Estado de Fazenda',
      tokenHomologacao: 'token-homolog-exemplo',
      ambiente: 'HOMOLOGACAO',
    },
  });
  console.log(`Unidade criada: ${unit.name}`);

  const endpoint = await prisma.endpointConfig.upsert({
    where: { module: 'CONTRATO' },
    update: {},
    create: {
      module: 'CONTRATO',
      endpoint: '/contratos',
      method: 'POST',
      description: 'Envio de contratos',
    },
  });
  console.log(`Endpoint configurado: ${endpoint.module}`);

  const existingRules = await prisma.validationRule.findMany({
    where: { code: { in: ['CD001', 'CT001'] } },
  });

  if (existingRules.length === 0) {
    const ruleImpeditiva = await prisma.validationRule.create({
      data: {
        module: 'COMPRA_DIRETA',
        field: 'valor',
        operator: 'GREATER_THAN',
        value: '330000',
        level: 'IMPEDITIVA',
        code: 'CD001',
        message:
          'Valor de Compra Direta para Obra de Engenharia não pode exceder R$ 330.000,00',
      },
    });
    console.log(`Regra impeditiva criada: ${ruleImpeditiva.code}`);

    const ruleAlerta = await prisma.validationRule.create({
      data: {
        module: 'CONTRATO',
        field: 'vigencia',
        operator: 'GREATER_THAN',
        value: '365',
        level: 'ALERTA',
        code: 'CT001',
        message: 'Contrato com vigência superior a 1 ano requer justificativa',
      },
    });
    console.log(`Regra de alerta criada: ${ruleAlerta.code}`);
  } else {
    console.log('Regras já existem, pulando criação...');
  }

  console.log('Seed executado com sucesso!');

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
