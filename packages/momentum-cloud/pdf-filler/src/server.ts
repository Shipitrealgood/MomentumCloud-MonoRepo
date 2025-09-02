import express from 'express';
import { PDFDocument, PDFRadioGroup } from 'pdf-lib'; // Import PDFRadioGroup
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PDF_FILLER_PORT || 3001;

app.use(express.json());

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'PDF Filler Service is running' });
});

// --- PDF Field Inspector Endpoint (Upgraded to return options) ---
app.get('/api/get-fields', async (req, res) => {
    const { templateName } = req.query;

    if (!templateName || typeof templateName !== 'string') {
        return res.status(400).json({ message: 'Missing "templateName" query parameter.' });
    }

    try {
        const templateId = path.basename(templateName, '.pdf').toLowerCase().replace(/[^a-z0-9]/g, '-');

        // THIS IS THE UPGRADED QUERY, MATCHING OUR DEBUG SCRIPT
        const template = await prisma.pdfTemplate.findUnique({
            where: { templateId },
            include: {
                fields: {
                    include: {
                        options: true // Also fetch the options for each field
                    }
                }
            },
        });

        if (!template) {
            throw new Error(`Template not found in database: ${templateId}`);
        }

        // THIS IS THE UPGRADED RESPONSE
        const fieldsWithDetails = template.fields.map(field => ({
            name: field.name,
            type: field.type,
            options: field.options.map(opt => opt.value),
        }));

        res.status(200).json({
            template: templateName,
            fieldCount: fieldsWithDetails.length,
            fields: fieldsWithDetails,
        });

    } catch (error: any) {
        res.status(404).json({ message: error.message });
    }
});

// --- PDF Filling Endpoint (Upgraded to handle multiple field types) ---
app.post('/api/fill', async (req, res) => {
    const { templateName, data } = req.body;

    if (!templateName || !data) {
        return res.status(400).json({ message: 'Request body must include "templateName" and "data" object.' });
    }

    try {
        const templateId = path.basename(templateName, '.pdf').toLowerCase().replace(/[^a-z0-9]/g, '-');
        const template = await prisma.pdfTemplate.findUnique({
            where: { templateId },
            include: { fields: true },
        });

        if (!template) {
            throw new Error(`Template not found in database: ${templateId}`);
        }

        const templatePath = path.resolve(__dirname, `../${template.filePath}`);
        const pdfBytes = await fs.readFile(templatePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();
        const schemaFields = new Map(template.fields.map((f: any) => [f.name, f.type]));

        for (const [fieldName, fieldValue] of Object.entries(data)) {
            const fieldType = schemaFields.get(fieldName);
            if (!fieldType) {
                console.warn(`Skipping field "${fieldName}" as it does not exist in the template schema.`);
                continue;
            }

            try {
                switch (fieldType) {
                    case 'PDFTextField':
                        form.getTextField(fieldName).setText(String(fieldValue ?? ''));
                        break;
                    case 'PDFCheckBox':
                        if (fieldValue) {
                            form.getCheckBox(fieldName).check();
                        } else {
                            form.getCheckBox(fieldName).uncheck();
                        }
                        break;
                    case 'PDFRadioGroup':
                        form.getRadioGroup(fieldName).select(String(fieldValue));
                        break;
                    default:
                        console.warn(`Unsupported field type "${fieldType}" for field "${fieldName}".`);
                }
            } catch (e: any) {
                console.error(`Could not fill field "${fieldName}" of type "${fieldType}". Reason: ${e.message}`);
            }
        }

        const filledPdfBytes = await pdfDoc.save();
        res.setHeader('Content-Disposition', `attachment; filename="filled_${templateName}"`);
        res.setHeader('Content-Type', 'application/pdf');
        res.send(Buffer.from(filledPdfBytes));

    } catch (error: any) {
        if (error.message.includes('Template not found')) {
             return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error filling PDF: ' + error.message });
    }
});

app.listen(port, () => {
    console.log(`✅ PDF Filler Service is running on http://localhost:${port}`);
});
