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
    return this.page.getByRole('link', { name: 'Home' });
  }

  get todosLink(): Locator {
    return this.page.getByRole('link', { name: 'To-Dos' });
  }

  get companiesLink(): Locator {
    return this.page.getByRole('link', { name: 'Companies' });
  }

  get reportsLink(): Locator {
    return this.page.getByRole('link', { name: 'Reports' });
  }
  
  // --- Locators for Global Search ---
  
  get globalSearchIcon(): Locator {
      // Using a CSS selector as a fallback if no better role/label is available
      return this.page.locator('.c-navbar__search-icon');
  }

  get globalSearchInput(): Locator {
      return this.page.getByRole('textbox', { name: 'search', exact: true });
  }

  // --- Actions ---

  /**
   * Navigates to a specific section using the main navigation bar.
   * @param tabName The name of the tab to click on.
   */
  async navigateTo(tabName: 'Home' | 'To-Dos' | 'Companies' | 'Reports'): Promise<void> {
    await this.page.getByRole('link', { name: tabName, exact: true }).click();
  }
}