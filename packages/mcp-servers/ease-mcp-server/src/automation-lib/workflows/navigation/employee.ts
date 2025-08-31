import { Page } from 'playwright';
import { HomePage } from '../../page-objects/homepage.js';
import { CompaniesListPage } from '../../page-objects/companies.js';
import { CompanyDashboardPage } from '../../page-objects/company.js';
import { EmployeesPage } from '../../page-objects/employees.js';
import { EmployeePage } from '../../page-objects/employee.js';

/**
 * A consolidated collection of all navigation workflows related to an employee.
 */
export class EmployeeNavigationWorkflows {

  /**
   * The foundational workflow to navigate to an employee's main profile page.
   */
  public static async navigateEmployeeToProfile(page: Page, companyName: string, employeeName: string): Promise<void> {
    console.log(`WORKFLOW: Navigating to profile for ${employeeName} at ${companyName}...`);

    const homePage = new HomePage(page);
    const companiesListPage = new CompaniesListPage(page);
    const companyDashboardPage = new CompanyDashboardPage(page);
    const employeesPage = new EmployeesPage(page);

    await homePage.goToCompanies();
    await companiesListPage.searchAndNavigateToCompany(companyName);
    await companyDashboardPage.goToEmployeesTab();
    await employeesPage.searchAndNavigateToEmployee(employeeName);

    console.log(`WORKFLOW: Successfully arrived at the profile for ${employeeName}.`);
  }

  /**
   * A "stacked" workflow that navigates directly to an employee's Benefits tab.
   */
  public static async navigateToBenefitsTab(page: Page, companyName: string, employeeName: string): Promise<void> {
    console.log(`WORKFLOW: Starting navigation to the Benefits tab for ${employeeName}...`);

    // Step 1: Reuse the foundational workflow from THIS SAME CLASS.
    await this.navigateEmployeeToProfile(page, companyName, employeeName);

    // Step 2: Perform the final, unique action.
    const employeePage = new EmployeePage(page);
    await employeePage.goToBenefitsTab();

    console.log(`WORKFLOW: Successfully arrived at the Benefits tab for ${employeeName}.`);
  }
}