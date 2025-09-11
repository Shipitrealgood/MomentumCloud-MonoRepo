import { Page, Locator } from 'playwright';

/**
 * Page Object for the main "Companies" page in Ease.
 * Encapsulates all locators and actions related to finding and navigating to companies.
 */
export class CompaniesListPage {
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

    get addCompanyButton(): Locator {
    return this.page.getByRole('button', { name: 'Add Company' });
  }

  // --- Actions (What you can do on this page) ---

  /**
   * Searches for a company and extracts its full official name from the link text.
   * @param companyName The (potentially partial) name of the company to search for.
   * @returns The full official company name as displayed in Ease.
   */
  async searchAndExtractFullCompanyName(companyName: string): Promise<string> {
    await this.searchBox.fill(companyName);
    await this.searchBox.press('Enter');
    
    const link = this.companyLink(companyName);
    await link.waitFor();

    const fullCompanyName = await link.innerText();
    const trimmedName = fullCompanyName.trim();
    return trimmedName;
  }

  /**
   * Navigates from the dashboard to the companies list, searches for a specific
   * company, extracts the full official name from the link, and clicks on their link to go to their dashboard.
   * This method includes a robust wait to handle dynamic UI updates.
   * @param companyName The (potentially partial) name of the company to search for.
   * @returns The full official company name as displayed in Ease.
   */
  async searchAndNavigateToCompany(companyName: string): Promise<string> {
    console.log(`Navigating to company: ${companyName}...`);
    await this.companiesLink.click();
    await this.searchBox.fill(companyName);
    await this.searchBox.press('Enter');
    console.log(`Pressed Enter in company search box.`);

    const link = this.companyLink(companyName);
    await link.waitFor();

    // Extract the full name from the link text (this is the official name from Ease)
    const fullCompanyName = await link.innerText();
    console.log(`Extracted full company name: ${fullCompanyName.trim()}`);

    await link.click();
    
    console.log(`Successfully clicked on company link for ${fullCompanyName}.`);
    return fullCompanyName.trim();
  }

    /**
   * Clicks the "Add Company" button to navigate to the new company creation form.
   */
  async goToAddCompanyPage(): Promise<void> {
    console.log("CompaniesListPage: Navigating to the Add Company page...");
    await this.addCompanyButton.click();
  }
}