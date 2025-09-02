import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE_URL = 'http://localhost:3001/api';
const TEMPLATE_NAME = 'Allied-Term-Form-2.pdf'; // Using your new, clean form

type FieldDetail = {
  name: string;
  type: string;
  options: string[];
};

type GetFieldsResponse = {
  template: string;
  fieldCount: number;
  fields: FieldDetail[];
};

async function testFillSuccess() {
  console.log('▶️  Running Test 1: Full Employee Termination PDF (Intelligent)...');

  // Step A: Fetch the template schema to get field options dynamically
  console.log('   - Step A: Fetching template schema to get field options...');
  const schemaResponse = await fetch(`${API_BASE_URL}/get-fields?templateName=${TEMPLATE_NAME}`);
  if (schemaResponse.status !== 200) {
    throw new Error('Could not fetch template schema before filling.');
  }
  const schema = (await schemaResponse.json()) as GetFieldsResponse;
  
  // Dynamically find the first valid option for the main "Gender" field
  const genderField = schema.fields.find(f => f.name === 'Gender');
  if (!genderField || genderField.options.length === 0) {
      throw new Error('Could not dynamically find options for the Gender field.');
  }
  const genderExportValue = genderField.options[0]; // Use the first available option (e.g., 'M')
  console.log(`   - Dynamically found Gender export value: "${genderExportValue}"`);
  
  const testData = {
    // Employer Info
    "Group Name": "Momentum Cloud, Inc.",
    "Group Number": "GRP-12345",

    // Employee Info
    "Employee First Name": "John",
    "Employee Last Name": "Doe",
    "Middle Initial": "A",
    "Employee Social Security Number": "999-99-9999",
    "Employee Date of Birth Month": "01",
    "Employee Date of Birth Day": "15",
    "Employee Date of Birth Year": "1985",
    "Employee Address": "123 Main St",
    "Employee City": "Anytown",
    "Employee Sate": "CA",
    "Employee Zip": "90210",
    "Gender": genderExportValue, // Using the dynamically discovered value

    // Termination Info
    "Coverage Termination Date Month": "09",
    "Coverage Termination Date Day": "02",
    "Coverage Termination Year": "2025",
    
    // Checkboxes for termination reasons
    "Checkbox - Termination Reason - Employees Termination": true,
    "Termination of employment - Involuntary": true,

    // Employee to be terminated section
    "If terminating Employee - Full Name": "John A. Doe",
    "If terminating Employee - Birthdate MM/DD/YYYY": "01/15/1985",
    "If terminating Employee - Employee full SSN": "999-99-9999",

    // Special Notes
    "Special notes - Text field 1": "Employee was terminated for cause.",
  };

  console.log('   - Step B: Sending fill request with dynamically determined data...');
  const response = await fetch(`${API_BASE_URL}/fill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      templateName: TEMPLATE_NAME,
      data: testData,
    }),
  });

  if (response.status !== 200) {
    throw new Error(`Expected status 200 but got ${response.status}`);
  }
  if (!response.headers.get('content-type')?.includes('application/pdf')) {
      throw new Error('Response was not a PDF file.');
  }

  const buffer = await response.arrayBuffer();
  const outputPath = path.resolve(__dirname, `../test-output/filled_${path.basename(TEMPLATE_NAME, '.pdf')}_${Date.now()}.pdf`);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, Buffer.from(buffer));
  console.log(`✅  Test 1 Passed! Filled PDF saved to: ${outputPath}`);

  return true;
}

// ... (The rest of the file remains unchanged)
async function testFillNotFound() {
    console.log('▶️  Running Test 2: Fill PDF with bad template name (Failure)...');
    const response = await fetch(`${API_BASE_URL}/fill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            templateName: 'non-existent-form.pdf',
            data: { "field": "value" },
        }),
    });

    if (response.status !== 404) {
        throw new Error(`Expected status 404 for non-existent template but got ${response.status}`);
    }

    console.log('✅  Test 2 Passed!');
    return true;
}

async function testGetFields() {
    console.log('▶️  Running Test 3: Get Fields (Success)...');
    const response = await fetch(`${API_BASE_URL}/get-fields?templateName=${TEMPLATE_NAME}`);

    if (response.status !== 200) {
        throw new Error(`Expected status 200 but got ${response.status}`);
    }

    const body = await response.json() as GetFieldsResponse;

    if (!body.fields || !Array.isArray(body.fields) || body.fields.length === 0) {
        throw new Error('The /get-fields endpoint did not return the expected field names.');
    }

    console.log('✅  Test 3 Passed!');
    return true;
}

async function runAllTests() {
  console.log('🚀 Starting PDF Filler Test Suite...\n');
  const results = { passed: 0, failed: 0 };

  try {
    await testFillSuccess();
    results.passed++;
  } catch (error: any) {
    console.error('❌  Test 1 Failed:', error.message);
    results.failed++;
  }

  try {
    await testFillNotFound();
    results.passed++;
  } catch (error: any) {
    console.error('❌  Test 2 Failed:', error.message);
    results.failed++;
  }

  try {
    await testGetFields();
    results.passed++;
  } catch (error: any) {
    console.error('❌  Test 3 Failed:', error.message);
    results.failed++;
  }

  console.log('\n--- Test Summary ---');
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log('--------------------');

  if (results.failed > 0) {
      process.exit(1);
  }
}

runAllTests();