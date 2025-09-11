import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { EaseApp } from './automation-lib/index.js';
import { HomePage } from './automation-lib/page-objects/homepage.js';
import { ReportsPage } from './automation-lib/page-objects/reportsPage.js';
import { EaseAppUtils } from './automation-lib/ease-utils.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

/**
 * A temporary, step-by-step test script to debug the report dropdown interaction.
 */
async function runDropdownDebugTest() {
  const companyNameToTest = "in his hands"; 

  if (!process.env.EASE_EMAIL || !process.env.EASE_PASSWORD) {
    throw new Error("Ease credentials must be set in the .env file.");
  }

  const easeApp = new EaseApp();

  try {
    // 1. Login and initialize page objects
    await easeApp.login();
    const homePage = new HomePage(easeApp.page!);
    const reportsPage = new ReportsPage(easeApp.page!);

    // 2. Normalize the company name using the utility
    console.log('Step 1: Normalizing the company name...');
    const fullCompanyName = await EaseAppUtils.getOfficialCompanyName(easeApp.page!, companyNameToTest);
    console.log(`   - Success! Full company name is: "${fullCompanyName}"`);

    // 3. Navigate to the Reports page and click the "Available" tab
    console.log('Step 2: Navigating to Reports -> Available...');
    await homePage.goToReports();
    await reportsPage.availableTabLink.click();
    console.log('   - Success! Arrived at Available reports tab.');
    
    // 4. Click the company dropdown trigger
    console.log('Step 3: Clicking the company dropdown trigger...');
    await reportsPage.availableReportsCompanyDropdownTrigger.waitFor({ state: 'visible' });
    await reportsPage.availableReportsCompanyDropdownTrigger.click();
    console.log('   - Success! Clicked dropdown trigger.');

    // --- NEW STEP TO TEST ---
    // 5. Find and fill the search combobox that appeared in the dropdown
    console.log('Step 4: Finding and filling the search combobox...');
    await reportsPage.companySearchCombobox.waitFor({ state: 'visible' });
    await reportsPage.companySearchCombobox.fill(fullCompanyName);
    console.log('   - Success! Combobox filled.');
    
    // ADDED: A small pause to allow search results to render.
    await easeApp.page.waitForTimeout(1000); // 1-second pause

    // --- NEW STEP TO TEST ---
    // 6. Find and select the correct company option, handling duplicates
    console.log('Step 5: Selecting the company from the dropdown...');
    const companyOptions = reportsPage.companyOption(fullCompanyName);
    await companyOptions.first().waitFor({state: 'visible'}); // Wait for results to load
    
    const count = await companyOptions.count();
    let targetOptionContainer;

    if (count > 1) {
      console.log(`   - Found ${count} matches. Targeting the last one (client instance).`);
      targetOptionContainer = companyOptions.last();
    } else {
      console.log(`   - Found 1 match. Targeting it.`);
      targetOptionContainer = companyOptions.first();
    }
    
    // Click the specific text element inside the container
    await targetOptionContainer.getByText(fullCompanyName, { exact: true }).click();
    console.log('   - Success! Company selected.');
    // --- END OF NEW STEP ---

    // --- NEW STEP TO TEST ---
    // 6. Click the "Enrollment Progress" report link
    console.log('Step 6: Clicking the "Enrollment Progress" report link...');
    await reportsPage.enrollmentProgressReportLink.waitFor();
    await reportsPage.enrollmentProgressReportLink.click();
    console.log('   - Success! Clicked report link.');

    // 7. Click the confirmation "OK" button
    console.log('Step 7: Clicking the confirmation "OK" button...');
    await reportsPage.confirmationOkButton.waitFor({ state: 'visible' });
    await reportsPage.confirmationOkButton.click();
    console.log('   - Success! Clicked "OK" button.');
    // --- END OF NEW STEP ---

    // --- FINAL STEP TO TEST ---
    // 8. Navigate to the "Generated" tab and download the new report
    console.log('Step 8: Navigating to "Generated" tab to download report...');
    await reportsPage.generatedTabLink.click();
    const downloadedFilePath = await reportsPage.downloadLatestEnrollmentProgressReport(fullCompanyName);
    console.log(`   - Success! Report downloaded to: ${downloadedFilePath}`);
    // --- END OF FINAL STEP ---

    // 6. Pause for inspection
    console.log('\n--- PAUSING FOR INSPECTION ---');
    console.log('Check the browser. Is the dropdown still open with the company name typed in?');
    console.log('Do you see the company option(s) in the list?');
    await easeApp.page.pause();

  } catch (error: any) {
    console.error("\n❌ Test failed:", error);
    if (easeApp.page) {
        const errorShot = `debug_dropdown_error_${Date.now()}.png`;
        await easeApp.page.screenshot({ path: errorShot });
        console.error(`Error screenshot saved to ${errorShot}`);
    }
  } finally {
    await easeApp.close();
  }
}

runDropdownDebugTest();