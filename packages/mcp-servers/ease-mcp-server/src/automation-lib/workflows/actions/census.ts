// packages/mcp-servers/ease-mcp-server/src/automation-lib/workflows/actions/census.ts

import { Page } from 'playwright';
import { CompanyDashboardPage } from '../../page-objects/company.js';
import { HomePage } from '../../page-objects/homepage.js';
import { GenerateCensusWizardPage } from '../../page-objects/generateCensusWizardPage.js';
import { ReportsPage } from '../../page-objects/reportsPage.js';
import { CompanyNavigationWorkflows } from '../navigation/company.js';
import { CensusService, ReconciliationResult } from '../../../services/censusService.js';

export class CensusActions {
  public static async synchronizeCompanyData(page: Page, companyName: string): Promise<ReconciliationResult> {
    console.log(`WORKFLOW: Starting data synchronization for "${companyName}"...`);

    try {
      // 1. Navigate to the company's employee page and extract the full official name.
      const fullCompanyName = await CompanyNavigationWorkflows.navigateToCompanyDashboard(page, companyName);
      console.log(`Extracted full company name from Ease: "${fullCompanyName}"`);
      
      const companyDashboard = new CompanyDashboardPage(page);
      await companyDashboard.goToEmployeesTab();

      // 2. Click the actions button to generate the report with retries.
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await companyDashboard.employeesTab.startFullCensusGeneration();
          break;
        } catch (e: any) {
          if (attempt === 3) throw new Error(`Failed to start census generation after 3 attempts: ${e.message}`);
          console.log(`Retry ${attempt}/3: Waiting to start census generation...`);
          await page.waitForTimeout(2000);
        }
      }

      // 3. Use the wizard to generate the report.
      const censusWizard = new GenerateCensusWizardPage(page);
      await censusWizard.generateCensusWithDependents();

      // 4. Navigate to the main reports page.
      const homePage = new HomePage(page);
      await homePage.goToReports();

      // 5. Download the report with retries.
      const reportsPage = new ReportsPage(page);
      let downloadPath: string;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          // Pass the fullCompanyName to the download method (update ReportsPage if needed to use it for precise matching)
          downloadPath = await reportsPage.downloadLatestFullCensus(fullCompanyName);
          console.log(`Downloaded census file: ${downloadPath}`);
          break;
        } catch (e: any) {
          if (attempt === 3) throw new Error(`Failed to download census after 3 attempts: ${e.message}`);
          console.log(`Retry ${attempt}/3: Waiting to download census...`);
          await page.waitForTimeout(2000);
        }
      }

      // 6. Reconcile with database using the full official name.
      const results = await CensusService.reconcileCensusData(downloadPath!, fullCompanyName);
      console.log(`   - Reconciliation with database is complete.`, results);

      console.log(`WORKFLOW: Synchronization for "${fullCompanyName}" finished.`);
      return results;
    } catch (error: any) {
      console.error(`Synchronization failed for "${companyName}": ${error.message}`);
      throw error; // Rethrow for syncDataTest.ts to handle
    }
  }
}