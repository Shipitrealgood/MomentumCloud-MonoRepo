import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * A simple utility script to fetch and print all field names for a specific PDF template
 * that has already been ingested into the database.
 */
async function getFieldsForTemplate(templateId: string) {
  console.log(`🔍 Searching for fields for template ID: "${templateId}"...`);
  try {
    // --- THIS IS THE UPGRADED QUERY ---
    // We've added a nested 'include' to also fetch the options for each field.
    const template = await prisma.pdfTemplate.findUnique({
      where: { templateId },
      include: {
        fields: {
          orderBy: {
            name: 'asc', // Sort fields alphabetically
          },
          include: {
            options: true, // Fetch the options for each field
          }
        },
      },
    });
    // --- END OF UPGRADED QUERY ---

    if (!template) {
      console.error(`❌ Error: No template found with ID "${templateId}".`);
      return;
    }

    console.log(`\n--- Fields for: ${template.originalFileName} ---`);
    // --- THIS IS THE UPGRADED DISPLAY LOGIC ---
    template.fields.forEach(field => {
      let output = `- ${field.name} (Type: ${field.type})`;
      // If the field has options, list them
      if (field.options.length > 0) {
        const optionValues = field.options.map(opt => `'${opt.value}'`).join(', ');
        output += ` [Options: ${optionValues}]`;
      }
      console.log(output);
    });
    // --- END OF UPGRADED DISPLAY LOGIC ---
    console.log('--- End of Fields ---\n');

  } catch (error: any) {
    console.error('An error occurred:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// --- Script Execution (No changes here) ---
const templateIdArg = process.argv[2];
if (!templateIdArg) {
  console.error('Error: Please provide the template file name as an argument.');
  console.error('Example: npm run get:fields -w @momentum/momentum-pdf -- allied-term-form-2');
  process.exit(1);
}

getFieldsForTemplate(templateIdArg);