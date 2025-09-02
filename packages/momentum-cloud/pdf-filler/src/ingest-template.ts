import { PDFDocument, PDFRadioGroup } from 'pdf-lib';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templatesDir = path.resolve(__dirname, '../templates');

async function ingestTemplate(templateFileName: string) {
  console.log(`🚀 Starting database ingestion for: ${templateFileName}`);

  try {
    const templatePath = path.join(templatesDir, templateFileName);
    const templateId = path.basename(templateFileName, '.pdf').toLowerCase().replace(/[^a-z0-9]/g, '-');
    const relativePath = path.relative(path.resolve(__dirname, '..'), templatePath);
    const pdfBytes = await fs.readFile(templatePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    const fieldsToCreate = [];
    for (const field of fields) {
        const fieldData: any = {
            name: field.getName(),
            type: field.constructor.name,
            options: { create: [] }
        };
        if (field instanceof PDFRadioGroup) {
            const options = field.getOptions();
            fieldData.options.create = options.map(option => ({ value: option.toString() }));
        }
        fieldsToCreate.push(fieldData);
    }

    if (fieldsToCreate.length === 0) {
        console.warn(`⚠️ No fillable fields found in ${templateFileName}.`);
    }

    // --- THIS IS THE UPGRADED LOGIC ---
    // Use `upsert` to handle cases where the template already exists.
    const templateData = {
        templateId: templateId,
        originalFileName: templateFileName,
        filePath: relativePath,
        fields: {
            create: fieldsToCreate,
        },
    };

    // Prisma doesn't have a deep `upsert` that also updates relations,
    // so we'll do it in a transaction for safety: delete the old one if it exists, then create.
    const transaction = await prisma.$transaction([
        // Delete existing fields and options first due to foreign key constraints
        prisma.pdfField.deleteMany({ where: { template: { templateId: templateId } } }),
        // Then delete the old template record
        prisma.pdfTemplate.deleteMany({ where: { templateId: templateId } }),
        // Now create the new template and its fields
        prisma.pdfTemplate.create({
            data: templateData,
            include: {
                fields: { include: { options: true } },
            }
        })
    ]);

    const newTemplate = transaction[2]; // The result of the final `create` operation
    // --- END OF UPGRADED LOGIC ---

    console.log(`✅ Successfully saved/updated schema in database for "${templateFileName}"`);
    console.log(`   - Template ID: ${newTemplate.templateId}`);
    console.log(`   - Fields ingested: ${newTemplate.fields.length}`);

  } catch (error: any) {
    console.error(`❌ Error during database ingestion for ${templateFileName}:`, error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

const templateArg = process.argv[2];
if (!templateArg) {
  console.error('Error: Please provide the template file name as an argument.');
  process.exit(1);
}
ingestTemplate(templateArg);