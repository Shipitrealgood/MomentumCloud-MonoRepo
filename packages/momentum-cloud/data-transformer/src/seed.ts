import { PrismaClient } from '../prisma/generated/client/index.js';

const prisma = new PrismaClient();

const alliedTermFormMappings = [
  // --- Employer Info ---
  { sourceField: 'account.name', destinationField: 'Group Name', formatter: null },

  // --- Employee Info ---
  { sourceField: 'firstName', destinationField: 'Employee First Name', formatter: null },
  { sourceField: 'lastName', destinationField: 'Employee Last Name', formatter: null },
  
  // --- Date Splitting for Birthdate ---
  { sourceField: 'birthdate', destinationField: 'Employee Date of Birth Year', formatter: 'date-year' },
  { sourceField: 'birthdate', destinationField: 'Employee Date of Birth Month', formatter: 'date-month' },
  { sourceField: 'birthdate', destinationField: 'Employee Date of Birth Day', formatter: 'date-day' },

  // --- Termination Info & Logic ---
  { sourceField: 'employeeProfile.terminationDate', destinationField: 'Coverage Termination Year', formatter: 'date-year' },
  { sourceField: 'employeeProfile.terminationDate', destinationField: 'Coverage Termination Date Month', formatter: 'date-month' },
  { sourceField: 'employeeProfile.terminationDate', destinationField: 'Coverage Termination Date Day', formatter: 'date-day' },

  // --- Boolean Logic ---
  { sourceField: 'employeeProfile.employmentStatus', destinationField: 'Checkbox - Termination Reason - Employees Termination', formatter: 'is-terminated' },
];

async function main() {
  console.log('Seeding Data Transformer templates...');

  const templateKey = 'crm-to-allied-term-form-v1';

  const template = await prisma.dataTemplate.upsert({
    where: { templateKey },
    update: {},
    create: {
      templateKey: templateKey,
      name: 'CRM to Allied Termination Form v1',
      type: 'EXPORT',
      description: 'Transforms canonical CRM contact data into the format required by the Allied Term Form PDF.',
    },
  });

  console.log(`Upserted template: ${template.name}`);

  // Delete old mappings to ensure a clean slate
  await prisma.dataTemplateField.deleteMany({ where: { templateId: template.id } });

  // Create new mappings
  await prisma.dataTemplateField.createMany({
    data: alliedTermFormMappings.map(m => ({
      templateId: template.id,
      sourceField: m.sourceField,
      destinationField: m.destinationField,
      formatter: m.formatter,
    })),
  });

  console.log(`✅ Successfully seeded ${alliedTermFormMappings.length} field mappings for ${template.name}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });