import { Page, Locator } from 'playwright';

/**
 * Page Object for the main "Companies" page in Ease.
 * Encapsulates all locators and actions related to finding and navigating to companies.
 */
export class CompaniesPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // --- Locators (The "Manifest" for this page) ---

  get companiesLink(): Locator {
    return this.page.getByRole('link', { name: 'Companies', exact: true });
  }

  get searchBox(): Locator {
    // Uses a regular expression to dynamically match the company count
    return this.page.getByRole('textbox', { name: /Search \d+ Companies/i });
  }

  companyLink(companyName: string): Locator {
    // --- THE FIX ---
    // Removed 'exact: true' to allow for partial matches, just like the original code.
    // This is more robust against slight differences in the link text.
    return this.page.getByRole('link', { name: companyName });
    // ---------------
  }

  // --- Actions (What you can do on this page) ---

  /**
   * Navigates from the dashboard to the companies list, searches for a specific
   * company, and clicks on their link to go to their dashboard.
   * This method includes a robust wait to handle dynamic UI updates.
   * @param companyName The name of the company to search for.
   */
  async searchAndNavigateToCompany(companyName: string): Promise<void> {
    console.log(`Navigating to company: ${companyName}...`);
    await this.companiesLink.click();
    await this.searchBox.fill(companyName);
    await this.searchBox.press('Enter');
    console.log(`Pressed Enter in company search box.`);

    const link = this.companyLink(companyName);
    await link.waitFor();
    await link.click();
    
    console.log(`Successfully clicked on company link for ${companyName}.`);
  }
}