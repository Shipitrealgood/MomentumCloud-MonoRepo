import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { EaseApp } from './automation-lib/index.js';
import { EmployeeActions } from './automation-lib/workflows/actions/employee.js';

// Load environment variables from the .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

// Define a type for our test data for type safety
type TerminationDetails = {
  terminationType: 'Involuntary' | 'Voluntary' | 'Gross Misconduct';
  terminationDate: string;
  reason: string;
};

/**
 * A standalone test script to validate the entire terminateEmployee workflow.
 */
async function runTerminateEmployeeTest() {
  // --- CONFIGURATION ---
  // Using 'let' to allow for dynamic data in more advanced test scenarios
  let companyNameToTest: string;
  let employeeNameToTest: string;
  let terminationDetails: TerminationDetails;

  // Load the data into the variables
  companyNameToTest = "in his hands insurance services"; 
  employeeNameToTest = "John Doe1756705690756"; 
  terminationDetails = {
      terminationType: 'Voluntary',
      terminationDate: '01/01/2025',
      reason: 'Resigned for a new opportunity.'
  };
  // -------------------

  if (!process.env.EASE_EMAIL || !process.env.EASE_PASSWORD) {
    throw new Error("Ease credentials must be set in the .env file.");
  }
  if (!companyNameToTest || !employeeNameToTest) {
    throw new Error("Please fill in the company and employee name variables in the test script.");
  }

  const easeApp = new EaseApp();

  try {
    // Step 1: Login. This handles all browser setup.
    await easeApp.login();

    // Step 2: Call the high-level workflow to perform the termination.
    await EmployeeActions.terminateEmployee(
        easeApp.page!,
        companyNameToTest,
        employeeNameToTest,
        terminationDetails
    );

    console.log(`\n✅ Test completed successfully! Employee ${employeeNameToTest} should be terminated.`);

  } catch (error) {
    console.error("\n❌ Test failed:", error);
  } finally {
    // Step 3: Gracefully close the browser session.
    await easeApp.close();
  }
}

runTerminateEmployeeTest();