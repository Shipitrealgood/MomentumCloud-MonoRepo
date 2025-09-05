// packages/mcp-servers/ease-mcp-server/src/automation-lib/workflows/actions/census.ts

import { Page } from 'playwright';
import { CompanyDashboardPage } from '../../page-objects/company.js';
import { HomePage } from '../../page-objects/homepage.js';
import { GenerateCensusWizardPage } from '../../page-objects/generateCensusWizardPage.js';
import { ReportsPage } from '../../page-objects/reportsPage.js';
import { CompanyNavigationWorkflows } from '../navigation/company.js';
import { CensusService, ReconciliationResult } from '../../../services/censusService.js';
import path from 'path';

export class CensusActions {

  public static async synchronizeCompanyData(page: Page, companyName: string): Promise<ReconciliationResult> {
    console.log(`WORKFLOW: Starting data synchronization for "${companyName}"...`);

    // 1. Navigate to the company's employee page.
    await CompanyNavigationWorkflows.navigateToCompanyDashboard(page, companyName);
    const companyDashboard = new CompanyDashboardPage(page);
    await companyDashboard.goToEmployeesTab();

    // 2. Click the actions button to generate the report.
    await companyDashboard.employeesTab.startFullCensusGeneration();

    // 3. Use the new wizard to generate the report.
    const censusWizard = new GenerateCensusWizardPage(page);
    await censusWizard.generateCensusWithDependents();

    // 4. Navigate to the main reports page.
    const homePage = new HomePage(page); // We can reuse this for the top-level nav
    await homePage.goToReports();

    // 5. Use the new ReportsPage object to find and download the correct report.
    const reportsPage = new ReportsPage(page);
    const downloadPath = await reportsPage.downloadLatestFullCensus(companyName);

    // 6. Call the CensusService to process the file and reconcile the data.
    const results = await CensusService.reconcileCensusData(downloadPath, companyName);
    console.log(`   - Reconciliation with database is complete.`);

    console.log(`WORKFLOW: Synchronization for "${companyName}" finished.`);
    return results;
  }
}