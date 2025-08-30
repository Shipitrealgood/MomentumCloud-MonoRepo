import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { loginToEase } from './playwright-util.js';
import { EmployeePage } from './automation-lib/page-objects/employee.js';
import { CompaniesPage } from './automation-lib/page-objects/company.js';

// Load environment variables from the .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

/**
 * A standalone test script to validate our Page Objects.
 */
async function runTest() {
  const { EASE_EMAIL, EASE_PASSWORD, EASE_2FA_SECRET } = process.env;

  // --- CONFIGURATION ---
  // TODO: Fill these in with a real company and employee from your Ease account for testing.
  const companyNameToTest = "input company name"; 
  const employeeNameToTest = "input ee name";
  // -------------------

  if (!EASE_EMAIL || !EASE_PASSWORD) {
    throw new Error("Ease credentials must be set in the .env file.");
  }
  if (!companyNameToTest || !employeeNameToTest) {
    throw new Error("Please fill in the companyNameToTest and employeeNameToTest variables in the test script.");
  }

  let browser;
  try {
    console.log(`Starting test for ${employeeNameToTest} at ${companyNameToTest}...`);
    // Step 1: Login to Ease
    const { page, browser: browserInstance } = await loginToEase(EASE_EMAIL, EASE_PASSWORD, EASE_2FA_SECRET);
    browser = browserInstance;

    // --- REFACTORED COMPANY NAVIGATION ---
    // Step 2a: Instantiate the CompaniesPage object with the live page.
    const companiesPage = new CompaniesPage(page);
    // Step 2b: Use the page object's method to navigate. This is now much cleaner
    // and uses the robust logic (including the .waitFor()) from the page object.
    await companiesPage.searchAndNavigateToCompany(companyNameToTest);
    // -----------------------------------

    // This part is still manual for now, as we haven't built the EmployeesPage object yet.
    console.log("Navigating to employee...");
    await page.getByRole('link', { name: 'Employees', exact: true }).click();
    await page.getByRole('textbox', { name: /Searching \d+ employees/i }).fill(employeeNameToTest);
    const employeeLink = page.getByRole('link').filter({ hasText: employeeNameToTest });
    await employeeLink.waitFor();
    await employeeLink.click();
    
    console.log("✅ Successfully navigated to employee profile. Now testing getters...");

    // Step 3: Instantiate the EmployeePage Object and run tests
    const employeePage = new EmployeePage(page);

    // Call each getter and log the result
    const firstName = await employeePage.personalTab.getFirstName();
    console.log(`- First Name: ${firstName}`);

    const lastName = await employeePage.personalTab.getLastName();
    console.log(`- Last Name: ${lastName}`);

    const middleName = await employeePage.personalTab.getMiddleName();
    console.log(`- Middle Name: ${middleName}`);
    
    const gender = await employeePage.personalTab.getGender();
    console.log(`- Gender: ${gender}`);

    const maritalStatus = await employeePage.personalTab.getMaritalStatus();
    console.log(`- Marital Status: ${maritalStatus}`);
    
    const birthDate = await employeePage.personalTab.getBirthDate();
    console.log(`- Birth Date: ${birthDate}`);

    console.log("\n✅ Test completed successfully!");

  } catch (error) {
    console.error("\n❌ Test failed:", error);
  } finally {
    if (browser) {
      await browser.close();
      console.log("\nBrowser closed.");
    }
  }
}

runTest();