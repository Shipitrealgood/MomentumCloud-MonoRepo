import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PDF_FILLER_URL = 'http://localhost:3001/api/fill';
const TEMPLATE_NAME = 'Allied-Termination-Form.pdf';

// Define a type for the expected error object from our server
interface ErrorResponse {
    message: string;
}

// Type guard to safely check if an unknown value is an ErrorResponse
function isErrorResponse(value: unknown): value is ErrorResponse {
    return (
        typeof value === 'object' &&
        value !== null &&
        'message' in value &&
        typeof (value as { message: unknown }).message === 'string'
    );
}


async function runTest() {
    console.log(`🚀 Starting test for PDF template: ${TEMPLATE_NAME}`);

    // ===================================================================
    // TODO: STEP 1 - UPDATE THESE FIELD NAMES
    // Use the /api/get-fields endpoint to get the real names from your PDF
    // and replace the placeholder keys below (e.g., 'employeeFullName', 'termDate').
    // ===================================================================
    const testData = {
  // PDF Field Name              :  Value to Fill
  'Group Name':                  'Momentum Cloud, Inc.',
  'Employee Name':               'John Doe',
  'Employee Last Name':          'Doe',
  'Employee First Name':         'John',
  'Social Security Number':      '999-99-9999',
  'Coverage Termination Month':  '09',
  'Coverage Terminaton Day':     '30',
  'Coverage Termination Year':   '2025',
    // Add any other fields you want to test...
};
    // ===================================================================

    console.log('Sending this data to the filler service:', testData);

    try {
        const response = await fetch(PDF_FILLER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                templateName: TEMPLATE_NAME,
                data: testData,
            }),
        });

        if (!response.ok) {
            const errorBody: unknown = await response.json();
            // Use the type guard to safely access the message property
            if (isErrorResponse(errorBody)) {
                throw new Error(`Service responded with status ${response.status}: ${errorBody.message}`);
            } else {
                // Handle cases where the error response is not in the expected format
                throw new Error(`Service responded with status ${response.status} and an unknown error format: ${JSON.stringify(errorBody)}`);
            }
        }

        const buffer = await response.arrayBuffer();
        const outputPath = path.resolve(__dirname, `../test-output/filled_${Date.now()}.pdf`);
        
        // Ensure the output directory exists
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        
        await fs.writeFile(outputPath, Buffer.from(buffer));

        console.log(`\n✅ Success! Filled PDF saved to:`);
        console.log(outputPath);

    } catch (error: any) {
        console.error('\n❌ Test Failed:', error.message);
    }
}

runTest();