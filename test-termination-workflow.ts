import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import path from 'path';

const TRANSFORMER_API_URL = 'http://localhost:3002/api';
const PDF_FILLER_API_URL = 'http://localhost:3001/api';

// --- Configuration ---
const PDF_TEMPLATE_NAME = 'Allied-Term-Form-2.pdf';
const TRANSFORMER_TEMPLATE_KEY = 'crm-to-allied-term-form-v1';
// -------------------

// --- MOCK DATA ---
// We are defining a mock employee object that matches the structure of our CRM's canonical model.
// This replaces the need to fetch data from the live CRM service for this test.
const mockTerminatedEmployee = {
    firstName: "John (Mock)",
    lastName: "Terminated",
    birthdate: "1985-05-20T00:00:00.000Z",
    email: "john.terminated@example.com",
    phone: "555-123-4567",
    account: {
        name: "Mock Company Inc."
    },
    employeeProfile: {
        employmentStatus: "Terminated",
        terminationDate: "2025-09-09T00:00:00.000Z"
    }
};
// ---------------

async function runTerminationTest() {
  console.log('--- Running Full Termination Workflow E2E Test (with Mock Data) ---');

  try {
    // 1. Use the mock employee data
    console.log('\n[Step 1] Using mock terminated employee data.');
    console.log(`   - Testing with employee: ${mockTerminatedEmployee.firstName} ${mockTerminatedEmployee.lastName}`);

    // 2. Transform the data using the Data Transformer
    console.log(`\n[Step 2] Sending mock CRM data to Data Transformer using template: "${TRANSFORMER_TEMPLATE_KEY}"...`);
    const transformResponse = await fetch(`${TRANSFORMER_API_URL}/transform/export/${TRANSFORMER_TEMPLATE_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: [mockTerminatedEmployee] }), // The transformer expects an array
    });
    if (!transformResponse.ok) {
        throw new Error(`Data Transformer failed: ${await transformResponse.text()}`);
    }
    const transformedData = await transformResponse.json() as any[];
    console.log('   - Data successfully transformed into PDF field format.');

    // 3. Fill the PDF using the PDF Filler service
    console.log(`\n[Step 3] Sending transformed data to PDF Filler for template: "${PDF_TEMPLATE_NAME}"...`);
    const pdfFillResponse = await fetch(`${PDF_FILLER_API_URL}/fill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            templateName: PDF_TEMPLATE_NAME,
            data: transformedData[0], // Send the first (and only) object from the array
        }),
    });
    if (!pdfFillResponse.ok) {
        throw new Error(`PDF Filler failed: ${await pdfFillResponse.text()}`);
    }
    console.log('   - PDF successfully filled.');

    // 4. Save the resulting PDF to a file
    const pdfBuffer = await pdfFillResponse.buffer();
    const outputPath = path.join(process.cwd(), `TERMINATION_FORM_${mockTerminatedEmployee.lastName}.pdf`);
    await fs.writeFile(outputPath, pdfBuffer);

    console.log('\n--- ✅ SUCCESS! ---');
    console.log(`The completed termination form has been saved to: ${outputPath}`);
    console.log('------------------');

  } catch (error) {
    console.error('\n--- ❌ TEST FAILED ---');
    console.error(error);
    process.exit(1);
  }
}

runTerminationTest();