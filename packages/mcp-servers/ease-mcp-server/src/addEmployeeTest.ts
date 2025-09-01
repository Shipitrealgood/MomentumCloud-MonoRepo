import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { EaseApp } from './automation-lib/index.js';

// Load environment variables from the .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

/**
 * A standalone test script to validate the addNewEmployee workflow.
 */
async function runAddEmployeeTest() {
  // --- CONFIGURATION ---
  const companyNameToTest = "in his hands insurance services"; // IMPORTANT: Replace with a valid company name from your Ease instance
  const newEmployee = {
    step1: {
      firstName: 'John',
      lastName: 'Doe' + Date.now(), // Add timestamp to ensure uniqueness
      birthDate: '01/01/1990',
      gender: 'Male' as const,
      address: '123 Main St',
      city: 'Anytown',
      state: 'California', // Use the full state name as expected by the dropdown
      zip: '12345',
    },
    step2: {
      employeeType: 'Full-Time',
      status: 'Active',
      hireDate: '01/01/2024',
      hours: '40', // THE FIX: Added the scheduled hours per week.
      compensation: '80000',
      compType: 'Salary' as const,
      payCycle: 'Bi-Weekly',
    },
  };
  // -------------------

  if (!process.env.EASE_EMAIL || !process.env.EASE_PASSWORD) {
    throw new Error("Ease credentials must be set in the .env file.");
  }

  const easeApp = new EaseApp();

  try {
    // This will activate the Playwright Inspector when you run the debug script.
    if (process.env.PWDEBUG === '1') {
      console.log('PWDEBUG is set to 1. Launching browser and pausing for inspector...');
      await easeApp.login();
      await easeApp.page.pause(); // This line triggers the inspector.
    } else {
      await easeApp.login();
    }


    await easeApp.workflows.Actions.EmployeeActions.addNewEmployee(
      easeApp.page!,
      companyNameToTest,
      newEmployee
    );

    console.log(`\n✅ Test completed successfully! Employee ${newEmployee.step1.firstName} ${newEmployee.step1.lastName} should be added.`);

  } catch (error) {
    console.error("\n❌ Test failed:", error);
  } finally {
    await easeApp.close();
  }
}

runAddEmployeeTest();