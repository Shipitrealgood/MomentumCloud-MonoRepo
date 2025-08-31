import { Page } from 'playwright';
import { HomePage } from '../../page-objects/homepage.js';
import { CompaniesListPage } from '../../page-objects/companies.js';
import { CompanyDashboardPage } from '../../page-objects/company.js';
import { EmployeesPage } from '../../page-objects/employees.js';

export class EmployeeNavigation {
  public static async toProfile(page: Page, companyName: string, employeeName: string): Promise<void> {
    console.log(`WORKFLOW: Starting navigation to profile for ${employeeName} at ${companyName}...`);

    const homePage = new HomePage(page);
    const companiesListPage = new CompaniesListPage(page);
    const companyDashboardPage = new CompanyDashboardPage(page);
    const employeesPage = new EmployeesPage(page);

    // A clear, logical sequence using the correct specialist for each step:
    await homePage.goToCompanies();
    await companiesListPage.searchAndNavigateToCompany(companyName);
    await companyDashboardPage.goToEmployeesTab();
    await employeesPage.searchAndNavigateToEmployee(employeeName);

    console.log(`WORKFLOW: Successfully arrived at the profile for ${employeeName}.`);
  }
}