import { Page, Locator } from 'playwright';

/**
 * Page Object for the main Ease homepage/dashboard after login.
 * This class handles the primary navigation bar and global search functions.
 */
export class HomePage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // --- Locators for the Main Navigation Bar ---

  get homeLink(): Locator {
    return this.page.getByRole('link', { name: 'Home', exact: true });
  }

  get todosLink(): Locator {
    return this.page.getByRole('link', { name: 'To-Dos', exact: true });
  }

  get companiesLink(): Locator {
    return this.page.getByRole('link', { name: 'Companies', exact: true });
  }

  get reportsLink(): Locator {
    return this.page.getByRole('link', { name: 'Reports', exact: true });
  }
  
  // --- Locators for Global Search ---
  
  get globalSearchIcon(): Locator {
      // Using a CSS selector as a fallback if no better role/label is available
      return this.page.locator('.c-navbar__search-icon');
  }

  get globalSearchInput(): Locator {
      return this.page.getByRole('textbox', { name: 'search', exact: true });
  }

  // --- High-Level Navigation Actions ---

  /**
   * Navigates to the Home dashboard.
   */
  async goToHome(): Promise<void> {
    console.log("HomePage: Navigating to Home...");
    await this.homeLink.click();
  }

  /**
   * Navigates to the To-Dos page.
   */
  async goToTodos(): Promise<void> {
    console.log("HomePage: Navigating to To-Dos...");
    await this.todosLink.click();
  }

  /**
   * Navigates to the Companies list page.
   */
  async goToCompanies(): Promise<void> {
    console.log("HomePage: Navigating to Companies...");
    await this.companiesLink.click();
  }
  
  /**
   * Navigates to the Reports page.
   */
  async goToReports(): Promise<void> {
    console.log("HomePage: Navigating to Reports...");
    await this.reportsLink.click();
  }
}