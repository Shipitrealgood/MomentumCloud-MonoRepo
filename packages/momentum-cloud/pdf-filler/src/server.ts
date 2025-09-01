import express from 'express';
import { PDFDocument } from 'pdf-lib';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PDF_FILLER_PORT || 3001;

// Middleware to parse JSON bodies
app.use(express.json());

// --- Health Check Endpoint ---
// A simple route to confirm the server is up and running.
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'PDF Filler Service is running' });
});


// --- PDF Field Inspector Endpoint ---
// This route reads a PDF and returns the names of its fillable fields.
app.get('/api/get-fields', async (req, res) => {
    const { templateName } = req.query;

    if (!templateName || typeof templateName !== 'string') {
        return res.status(400).json({ message: 'Missing or invalid "templateName" query parameter.' });
    }

    try {
        const templatePath = path.resolve(__dirname, `../templates/${templateName}`);
        
        // Check if the file exists before trying to read it
        await fs.access(templatePath);

        const pdfBytes = await fs.readFile(templatePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();
        const fields = form.getFields();
        const fieldNames = fields.map(f => f.getName());

        res.status(200).json({
            template: templateName,
            fieldCount: fieldNames.length,
            fields: fieldNames,
        });

    } catch (error: any) {
        console.error(`[get-fields] Error processing ${templateName}:`, error);
        if (error.code === 'ENOENT') {
            return res.status(404).json({ message: `Template not found: ${templateName}` });
        }
        res.status(500).json({ message: 'Error inspecting PDF: ' + error.message });
    }
});


// --- PDF Filling Endpoint ---
// This is the core route that fills a PDF with provided data.
app.post('/api/fill', async (req, res) => {
    const { templateName, data } = req.body;

    if (!templateName || !data) {
        return res.status(400).json({ message: 'Request body must include "templateName" and "data" object.' });
    }

    try {
        const templatePath = path.resolve(__dirname, `../templates/${templateName}`);

        // Check if the file exists
        await fs.access(templatePath);
        
        const pdfBytes = await fs.readFile(templatePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();

        // Iterate over the provided data and fill the corresponding fields
        for (const [fieldName, fieldValue] of Object.entries(data)) {
            // This logic can handle different field types in the future (checkboxes, dropdowns, etc.)
            try {
                const field = form.getTextField(fieldName);
                field.setText(String(fieldValue ?? '')); // Ensure value is a string and handle null/undefined
            } catch (e) {
                // This will catch errors if a field name exists but is not a text field.
                console.warn(`Could not fill field "${fieldName}". It may not be a text field or might not exist.`);
            }
        }

        const filledPdfBytes = await pdfDoc.save();

        // Set headers to prompt a file download in the browser/client
        res.setHeader('Content-Disposition', `attachment; filename="filled_${templateName}"`);
        res.setHeader('Content-Type', 'application/pdf');
        res.send(Buffer.from(filledPdfBytes));

    } catch (error: any) {
        console.error(`[fill] Error processing ${templateName}:`, error);
        if (error.code === 'ENOENT') {
            return res.status(404).json({ message: `Template not found: ${templateName}` });
        }
        res.status(500).json({ message: 'Error filling PDF: ' + error.message });
    }
});

app.listen(port, () => {
    console.log(`✅ PDF Filler Service is running on http://localhost:${port}`);
});
