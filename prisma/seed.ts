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

  console.log('🗑️  Limpando banco de dados...');

  // Limpar tabelas na ordem correta (respeitando foreign keys)
  await prisma.remittanceLog.deleteMany();
  await prisma.remittance.deleteMany();
  await prisma.validation.deleteMany();
  await prisma.transformedData.deleteMany();
  await prisma.rawData.deleteMany();
  await prisma.validationRule.deleteMany();
  await prisma.endpointConfig.deleteMany();
  await prisma.userPermission.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.user.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.unit.deleteMany();

  console.log('✅ Banco limpo!');
  console.log('');
  console.log('🌱 Iniciando seed...');

  // ============================================
  // 1. USUÁRIOS
  // ============================================
  console.log('\n📝 Criando usuários...');

  const adminPassword = await bcrypt.hash('Admin@123', SALT_ROUNDS);
  const managerPassword = await bcrypt.hash('Manager@123', SALT_ROUNDS);
  const operatorPassword = await bcrypt.hash('Operador@123', SALT_ROUNDS);
  const viewerPassword = await bcrypt.hash('Viewer@123', SALT_ROUNDS);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@econect.ms.gov.br',
      name: 'Administrador do Sistema',
      passwordHash: adminPassword,
      role: 'ADMIN',
      active: true,
    },
  });
  console.log(`  ✓ Admin: ${adminUser.email} (senha: Admin@123)`);

  const managerUser = await prisma.user.create({
    data: {
      email: 'gerente@econect.ms.gov.br',
      name: 'Gerente de Operações',
      passwordHash: managerPassword,
      role: 'MANAGER',
      active: true,
    },
  });
  console.log(`  ✓ Gerente: ${managerUser.email} (senha: Manager@123)`);

  const operatorUser = await prisma.user.create({
    data: {
      email: 'operador@econect.ms.gov.br',
      name: 'Operador de Contratos',
      passwordHash: operatorPassword,
      role: 'OPERATOR',
      active: true,
    },
  });
  console.log(`  ✓ Operador: ${operatorUser.email} (senha: Operador@123)`);

  const viewerUser = await prisma.user.create({
    data: {
      email: 'auditor@econect.ms.gov.br',
      name: 'Auditor Externo',
      passwordHash: viewerPassword,
      role: 'VIEWER',
      active: true,
    },
  });
  console.log(`  ✓ Visualizador: ${viewerUser.email} (senha: Viewer@123)`);

  // ============================================
  // 2. UNIDADES GESTORAS
  // ============================================
  console.log('\n🏢 Criando unidades gestoras...');

  const units = await Promise.all([
    prisma.unit.create({
      data: {
        code: '090101',
        name: 'Secretaria de Estado de Fazenda',
        tokenHomologacao: 'token-hom-sefaz-2024',
        tokenProducao: 'token-prod-sefaz-2024',
        ambiente: 'HOMOLOGACAO',
        active: true,
      },
    }),
    prisma.unit.create({
      data: {
        code: '090102',
        name: 'Secretaria de Estado de Administração',
        tokenHomologacao: 'token-hom-sad-2024',
        tokenProducao: 'token-prod-sad-2024',
        ambiente: 'HOMOLOGACAO',
        active: true,
      },
    }),
    prisma.unit.create({
      data: {
        code: '090103',
        name: 'Secretaria de Estado de Educação',
        tokenHomologacao: 'token-hom-sed-2024',
        ambiente: 'HOMOLOGACAO',
        active: true,
      },
    }),
    prisma.unit.create({
      data: {
        code: '090104',
        name: 'Secretaria de Estado de Saúde',
        tokenHomologacao: 'token-hom-ses-2024',
        ambiente: 'HOMOLOGACAO',
        active: false,
      },
    }),
  ]);

  units.forEach((u) => console.log(`  ✓ ${u.code} - ${u.name}`));

  // ============================================
  // 3. ENDPOINTS CONFIGURADOS
  // ============================================
  console.log('\n🔗 Criando configurações de endpoints...');

  const endpoints = await Promise.all([
    prisma.endpointConfig.create({
      data: {
      module: 'CONTRATO',
        endpoint: '/api/v1/contratos',
        method: 'POST',
        description: 'Envio de contratos ao TCE',
        active: true,
      },
    }),
    prisma.endpointConfig.create({
      data: {
        module: 'COMPRA_DIRETA',
        endpoint: '/api/v1/compras-diretas',
        method: 'POST',
        description: 'Envio de compras diretas (dispensa/inexigibilidade)',
        active: true,
      },
    }),
    prisma.endpointConfig.create({
      data: {
        module: 'EMPENHO',
        endpoint: '/api/v1/empenhos',
        method: 'POST',
        description: 'Envio de empenhos',
        active: true,
      },
    }),
    prisma.endpointConfig.create({
      data: {
        module: 'LIQUIDACAO',
        endpoint: '/api/v1/liquidacoes',
      method: 'POST',
        description: 'Envio de liquidações',
        active: false,
      },
    }),
  ]);

  endpoints.forEach((e) => console.log(`  ✓ ${e.module} -> ${e.endpoint}`));

  // ============================================
  // 4. REGRAS DE VALIDAÇÃO
  // ============================================
  console.log('\n📋 Criando regras de validação...');

  const validationRules = await Promise.all([
    // Regras IMPEDITIVAS
    prisma.validationRule.create({
      data: {
        module: 'COMPRA_DIRETA',
        field: 'valor',
        operator: 'GREATER_THAN',
        value: '330000',
        level: 'IMPEDITIVA',
        code: 'CD001',
        message:
          'Obra de Engenharia não pode ter valor superior a R$ 330.000,00 para dispensa',
        active: true,
      },
    }),
    prisma.validationRule.create({
      data: {
        module: 'CONTRATO',
        field: 'dataInicio',
        operator: 'IS_NULL',
        value: '',
        level: 'IMPEDITIVA',
        code: 'CT001',
        message: 'Data de início do contrato é obrigatória',
        active: true,
      },
    }),
    prisma.validationRule.create({
      data: {
        module: 'EMPENHO',
        field: 'valor',
        operator: 'LESS_OR_EQUAL',
        value: '0',
        level: 'IMPEDITIVA',
        code: 'EM001',
        message: 'Valor do empenho deve ser maior que zero',
        active: true,
      },
    }),
    // Regras de ALERTA
    prisma.validationRule.create({
      data: {
        module: 'CONTRATO',
        field: 'justificativa',
        operator: 'IS_NULL',
        value: '',
        level: 'ALERTA',
        code: 'CT002',
        message: 'Recomenda-se informar justificativa para o contrato',
        active: true,
      },
    }),
    prisma.validationRule.create({
      data: {
        module: 'COMPRA_DIRETA',
        field: 'fundamentoLegal',
        operator: 'IS_NULL',
        value: '',
        level: 'ALERTA',
        code: 'CD002',
        message: 'Fundamento legal não informado',
        active: true,
      },
    }),
  ]);

  validationRules.forEach((r) =>
    console.log(`  ✓ [${r.level}] ${r.code}: ${r.message.substring(0, 50)}...`)
  );

  // ============================================
  // 5. PERMISSÕES DE USUÁRIOS
  // ============================================
  console.log('\n🔐 Criando permissões de usuários...');

  // Gerente: acesso total a todas UGs para contratos
  await prisma.userPermission.create({
    data: {
      userId: managerUser.id,
      unitId: null, // todas as UGs
      module: 'CONTRATO',
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canTransmit: true,
    },
  });
  console.log(`  ✓ Gerente: Acesso total a CONTRATO (todas UGs)`);

  // Operador: acesso à SEFAZ para contratos e compras diretas
  await prisma.userPermission.create({
    data: {
      userId: operatorUser.id,
      unitId: units[0].id, // SEFAZ
      module: 'CONTRATO',
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: false,
      canTransmit: true,
    },
  });
  await prisma.userPermission.create({
    data: {
      userId: operatorUser.id,
      unitId: units[0].id, // SEFAZ
      module: 'COMPRA_DIRETA',
      canView: true,
      canCreate: true,
      canEdit: true,
      canDelete: false,
      canTransmit: true,
    },
  });
  console.log(`  ✓ Operador: CONTRATO e COMPRA_DIRETA na SEFAZ`);

  // Visualizador: apenas visualização global
  await prisma.userPermission.create({
    data: {
      userId: viewerUser.id,
      unitId: null, // todas as UGs
      module: null, // todos os módulos
      canView: true,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canTransmit: false,
    },
  });
  console.log(`  ✓ Visualizador: Apenas visualização (todas UGs/módulos)`);

  // ============================================
  // 6. DADOS DE ORIGEM (RAW DATA)
  // ============================================
  console.log('\n📦 Criando dados de origem...');

  const rawDataList = await Promise.all([
    // Contrato válido
    prisma.rawData.create({
      data: {
        unitId: units[0].id,
        module: 'CONTRATO',
        competency: '2024-12',
        status: 'RECEIVED',
        payload: {
          numero: '001/2024',
          objeto: 'Aquisição de equipamentos de informática',
          valor: 150000,
          dataInicio: '2024-01-15',
          dataFim: '2024-12-31',
          contratado: {
            cnpj: '12.345.678/0001-90',
            razaoSocial: 'Tech Solutions Ltda',
          },
          justificativa: 'Necessidade de modernização do parque tecnológico',
        },
      },
    }),
    // Contrato sem data de início (vai falhar validação)
    prisma.rawData.create({
      data: {
        unitId: units[0].id,
        module: 'CONTRATO',
        competency: '2024-12',
        status: 'RECEIVED',
        payload: {
          numero: '002/2024',
          objeto: 'Serviços de consultoria',
          valor: 80000,
          dataFim: '2024-06-30',
          contratado: {
            cnpj: '98.765.432/0001-10',
            razaoSocial: 'Consultoria ABC',
          },
        },
      },
    }),
    // Compra Direta válida
    prisma.rawData.create({
      data: {
        unitId: units[0].id,
        module: 'COMPRA_DIRETA',
        competency: '2024-12',
        status: 'RECEIVED',
        payload: {
          numero: 'CD001/2024',
          objeto: 'Material de expediente',
          valor: 25000,
          modalidade: 'DISPENSA',
          fundamentoLegal: 'Art. 75, II da Lei 14.133/2021',
          fornecedor: {
            cnpj: '11.222.333/0001-44',
            razaoSocial: 'Papelaria Central',
          },
        },
      },
    }),
    // Compra Direta com valor alto (vai falhar validação IMPEDITIVA)
    prisma.rawData.create({
      data: {
        unitId: units[1].id,
        module: 'COMPRA_DIRETA',
        competency: '2024-12',
        status: 'RECEIVED',
        payload: {
          numero: 'CD002/2024',
          objeto: 'Obra de Engenharia - Reforma predial',
          valor: 350000, // Acima do limite de 330.000
          modalidade: 'DISPENSA',
          fornecedor: {
            cnpj: '55.666.777/0001-88',
            razaoSocial: 'Construtora XYZ',
          },
        },
      },
    }),
    // Empenho válido
    prisma.rawData.create({
      data: {
        unitId: units[0].id,
        module: 'EMPENHO',
        competency: '2024-12',
        status: 'RECEIVED',
        payload: {
          numero: '2024NE000123',
          valor: 50000,
          dotacao: '09.122.0001.2001.339039',
          credor: {
            cnpj: '12.345.678/0001-90',
            razaoSocial: 'Tech Solutions Ltda',
          },
          historico: 'Pagamento parcial do contrato 001/2024',
          data: '2024-12-01',
        },
      },
    }),
    // Empenho com valor zero (vai falhar validação)
    prisma.rawData.create({
      data: {
        unitId: units[1].id,
        module: 'EMPENHO',
        competency: '2024-12',
        status: 'RECEIVED',
        payload: {
          numero: '2024NE000124',
          valor: 0, // Valor inválido
          dotacao: '09.122.0001.2001.339039',
          credor: {
            cnpj: '98.765.432/0001-10',
            razaoSocial: 'Fornecedor Teste',
          },
          historico: 'Teste de empenho',
          data: '2024-12-05',
        },
      },
    }),
  ]);

  rawDataList.forEach((r) =>
    console.log(`  ✓ ${r.module} - Competência: ${r.competency}`)
  );

  // ============================================
  // 7. LOGS DE AUDITORIA INICIAIS
  // ============================================
  console.log('\n📝 Criando logs de auditoria iniciais...');

  await prisma.auditLog.createMany({
    data: [
      {
        userId: adminUser.id,
        action: 'CREATE',
        entity: 'User',
        entityId: managerUser.id,
        newValue: { email: managerUser.email, role: 'MANAGER' },
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      {
        userId: adminUser.id,
        action: 'CREATE',
        entity: 'Unit',
        entityId: units[0].id,
        newValue: { code: units[0].code, name: units[0].name },
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      {
        userId: adminUser.id,
        action: 'CREATE',
        entity: 'ValidationRule',
        entityId: validationRules[0].id,
        newValue: { code: validationRules[0].code, level: 'IMPEDITIVA' },
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    ],
  });
  console.log(`  ✓ 3 logs de auditoria criados`);

  // ============================================
  // RESUMO FINAL
  // ============================================
  console.log('\n' + '='.repeat(50));
  console.log('🎉 SEED EXECUTADO COM SUCESSO!');
  console.log('='.repeat(50));
  console.log('\n📊 Resumo:');
  console.log(`   • Usuários: 4`);
  console.log(`   • Unidades Gestoras: ${units.length}`);
  console.log(`   • Endpoints: ${endpoints.length}`);
  console.log(`   • Regras de Validação: ${validationRules.length}`);
  console.log(`   • Dados de Origem: ${rawDataList.length}`);
  console.log(`   • Permissões: 4`);

  console.log('\n🔑 Credenciais de acesso:');
  console.log('   ┌─────────────────────────────────────────────────────┐');
  console.log('   │ Perfil        │ Email                   │ Senha    │');
  console.log('   ├─────────────────────────────────────────────────────┤');
  console.log('   │ ADMIN         │ admin@econect.ms.gov.br │ Admin@123│');
  console.log('   │ MANAGER       │ gerente@econect.ms.gov.br│Manager@123│');
  console.log('   │ OPERATOR      │ operador@econect.ms.gov.br│Operador@123│');
  console.log('   │ VIEWER        │ auditor@econect.ms.gov.br│Viewer@123│');
  console.log('   └─────────────────────────────────────────────────────┘');

  console.log('\n📋 Cenários de teste disponíveis:');
  console.log('   1. Contrato válido pronto para transmissão');
  console.log('   2. Contrato sem data de início (IMPEDITIVA)');
  console.log('   3. Compra Direta válida');
  console.log('   4. Compra Direta com valor > 330k (IMPEDITIVA)');
  console.log('   5. Empenho válido');
  console.log('   6. Empenho com valor zero (IMPEDITIVA)');
  console.log('');

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
