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
 * A standalone test script to validate our Page Objects and Workflows
 * using the final EaseApp architecture.
 */
async function runTest() {
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
    // Step 2: Call the workflow THROUGH the easeApp instance.
    // This is the correct, encapsulated way to do it.
    await easeApp.workflows.Navigation.EmployeeNavigation.toProfile(easeApp.page!, companyNameToTest, employeeNameToTest);

    console.log("✅ Successfully navigated to employee profile. Now testing getters...");

    // Step 3: Use the employeePage object (provided by the app) to get data.
    const profileTab = easeApp.employeePage.profileTab;

    const firstName = await profileTab.getFirstName();
    console.log(`- First Name: ${firstName}`);

    const lastName = await profileTab.getLastName();
    console.log(`- Last Name: ${lastName}`);

    // ... all other calls will now use `profileTab.`
    const gender = await profileTab.getGender();
    console.log(`- Gender: ${gender}`);

    const maritalStatus = await profileTab.getMaritalStatus();
    console.log(`- Marital Status: ${maritalStatus}`);

    const birthDate = await profileTab.getBirthDate();
    console.log(`- Birth Date: ${birthDate}`);

    console.log("\n✅ Test completed successfully!");


  } catch (error) {
    console.error("\n❌ Test failed:", error);
  } finally {
    // Step 4: Gracefully close the browser session.
    await easeApp.close();
  }
}

runTest();