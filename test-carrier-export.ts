import fetch from 'node-fetch';

const CRM_API_URL = 'http://localhost:3000/api';
const TRANSFORMER_API_URL = 'http://localhost:3002/api';

async function runTest() {
  console.log('--- Running Carrier Export End-to-End Test ---');

  try {
    // 1. Get sample data from CRM (no change)
    console.log('\n[Step 1] Fetching sample employee data from CRM...');
    const searchResponse = await fetch(`${CRM_API_URL}/contacts/search?name=`);
    const employees = await searchResponse.json() as any[];
    if (employees.length === 0) {
      throw new Error('No sample employees found in CRM. Please add at least one contact.');
    }
    console.log(`   - Found ${employees.length} employee(s). Using the first one for the test.`);
    const sampleEmployee = employees[0];

    // 2. Define a new EXPORT template using the new, simpler JSON endpoint
    const templateKey = `allied-export-v${Date.now()}`;
    console.log(`\n[Step 2] Creating new EXPORT template with key: ${templateKey}...`);
    
    const templateResponse = await fetch(`${TRANSFORMER_API_URL}/templates`, { // Using POST /templates
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateKey: templateKey,
        name: 'Allied Carrier Export Template',
        type: 'EXPORT',
      }),
    });
    if (!templateResponse.ok) throw new Error(`Failed to create template: ${await templateResponse.text()}`);
    console.log(`   - Template shell created successfully.`);
    
    // 3. Define the mappings for this template (no change)
    console.log('\n[Step 3] Defining mappings for the new template...');
    const mappings = {
      mappings: [
        { sourceField: 'firstName', destinationField: 'Participant First Name' },
        { sourceField: 'lastName', destinationField: 'Participant Last Name' },
        { sourceField: 'birthdate', destinationField: 'DOB' },
        { sourceField: 'email', destinationField: 'Contact Email' },
      ]
    };
    const mappingResponse = await fetch(`${TRANSFORMER_API_URL}/templates/${templateKey}/mappings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mappings),
    });
    if (!mappingResponse.ok) throw new Error(`Failed to define mappings: ${await mappingResponse.text()}`);
    console.log(`   - Mappings defined successfully.`);

    // 4. Call the transformer to generate the CSV (no change)
    console.log(`\n[Step 4] Calling transformer to generate the CSV...`);
    const exportResponse = await fetch(`${TRANSFORMER_API_URL}/transform/export/${templateKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [sampleEmployee] }),
    });
    if (!exportResponse.ok) throw new Error(`Failed to export data: ${await exportResponse.text()}`);

    const csvOutput = await exportResponse.text();
    
    console.log('\n--- SUCCESS! ---');
    console.log('Generated Carrier CSV File Content:\n');
    console.log(csvOutput);
    console.log('------------------');

  } catch (error) {
    console.error('\n--- TEST FAILED ---');
    console.error(error);
    process.exit(1);
  }
}

runTest();