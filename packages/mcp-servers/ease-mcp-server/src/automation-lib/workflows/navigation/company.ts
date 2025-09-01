import { Page } from 'playwright';
import { CompaniesListPage } from '../../page-objects/companies.js';
import { HomePage } from '../../page-objects/homepage.js';

/**
 * A collection of workflows for navigating to and around a specific company.
 */
export class CompanyNavigationWorkflows {
  /**
   * The foundational workflow to navigate from the home dashboard to a specific
   * company's main dashboard page.
   * @param page The Playwright Page object.
   * @param companyName The name of the company to navigate to.
   */
  public static async navigateToCompanyDashboard(page: Page, companyName: string): Promise<void> {
    console.log(`WORKFLOW: Navigating to company dashboard for "${companyName}"...`);

    const homePage = new HomePage(page);
    const companiesListPage = new CompaniesListPage(page);

    await homePage.goToCompanies();
    await companiesListPage.searchAndNavigateToCompany(companyName);

    console.log(`WORKFLOW: Successfully arrived at dashboard for "${companyName}".`);
  }
}