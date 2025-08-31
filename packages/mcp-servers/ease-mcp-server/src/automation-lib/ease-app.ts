// packages/mcp-servers/ease-mcp-server/src/automation-lib/ease-app.ts

import { Browser, Page } from 'playwright';
import { loginToEase } from '../playwright-util.js';
import { CompaniesListPage } from './page-objects/companies.js';
import { CompanyDashboardPage } from './page-objects/company.js';
import { EmployeePage } from './page-objects/employee.js';
import { EmployeesPage } from './page-objects/employees.js';
import { HomePage } from './page-objects/homepage.js';
import { Workflows } from './workflows/index.js';

/**
 * The main application class for interacting with the Ease platform.
 * It encapsulates the Playwright browser and page instances, handles the
 * session lifecycle (login/logout), and provides access to all Page Objects
 * and Workflows.
 */
export class EaseApp {
  private browser!: Browser;
  public page!: Page;

  // Page Objects
  public homePage!: HomePage;
  public companiesListPage!: CompaniesListPage;
  public companyDashboardPage!: CompanyDashboardPage;
  public employeesPage!: EmployeesPage;
  public employeePage!: EmployeePage;
  
  // Workflows
  public workflows = Workflows;

  /**
   * Logs into the Ease platform, initializes the browser and page,
   * and instantiates all necessary Page Objects.
   */
  public async login(): Promise<void> {
    const { EASE_EMAIL, EASE_PASSWORD, EASE_2FA_SECRET } = process.env;

    if (!EASE_EMAIL || !EASE_PASSWORD) {
      throw new Error("Ease credentials must be set in the .env file.");
    }
    
    console.log("EaseApp: Logging in...");
    const { page, browser } = await loginToEase(EASE_EMAIL, EASE_PASSWORD, EASE_2FA_SECRET);
    
    this.browser = browser;
    this.page = page;

    // Instantiate all the helper classes with the live page context
    this.homePage = new HomePage(this.page);
    this.companiesListPage = new CompaniesListPage(this.page);
    this.companyDashboardPage = new CompanyDashboardPage(this.page);
    this.employeesPage = new EmployeesPage(this.page);
    this.employeePage = new EmployeePage(this.page);
    
    console.log("EaseApp: Login successful. Ready for operations.");
  }

  /**
   * Closes the Playwright browser and ends the session.
   */
  public async close(): Promise<void> {
    if (this.browser) {
      console.log("EaseApp: Closing browser session.");
      await this.browser.close();
    }
  }
}