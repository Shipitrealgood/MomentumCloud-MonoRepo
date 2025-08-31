import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
// The ONLY import we need from our library is the main app controller.
import { EaseApp } from './automation-lib/index.js'; 

// Load environment variables from the .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

/**
 * A standalone test script to validate the BenefitsNavigation workflow.
 */
async function runBenefitNavigationTest() {
  // --- CONFIGURATION ---
  const companyNameToTest = "insert company"; 
  const employeeNameToTest = "insert ee";
  // -------------------

  if (!process.env.EASE_EMAIL || !process.env.EASE_PASSWORD) {
    throw new Error("Ease credentials must be set in the .env file.");
  }
  if (!companyNameToTest || !employeeNameToTest) {
    throw new Error("Please fill in the companyNameToTest and employeeNameToTest variables in the test script.");
  }

  // Instantiate our main application controller
  const easeApp = new EaseApp();

  try {
    // Step 1: Login. This handles all browser setup.
    await easeApp.login();

    // --- THE FIX IS HERE ---
    // Step 2: Call the correct workflow using the final, consolidated path.
    await easeApp.workflows.Navigation.EmployeeNavigation.navigateToBenefitsTab(easeApp.page!, companyNameToTest, employeeNameToTest);

    console.log("\n✅ Test completed successfully! Arrived at the Benefits tab.");

  } catch (error) {
    console.error("\n❌ Test failed:", error);
  } finally {
    // Step 3: Gracefully close the browser session.
    await easeApp.close();
  }
}

runBenefitNavigationTest();