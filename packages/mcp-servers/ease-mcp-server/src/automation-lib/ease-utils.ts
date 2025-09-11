import { Page } from 'playwright';
import { CompaniesListPage } from './page-objects/companies.js';
import { HomePage } from './page-objects/homepage.js';

/**
 * A collection of reusable, high-level utility functions for automating common tasks in Ease.
 */
export class EaseAppUtils {

  /**
   * Navigates to the Companies page, searches for a company by a partial name,
   * and returns the full, official company name as it appears in Ease.
   * This is crucial for ensuring accuracy in subsequent steps.
   * @param page The active Playwright Page object.
   * @param companyName The partial or full name to search for.
   * @returns The official, full company name.
   */
  public static async getOfficialCompanyName(page: Page, companyName: string): Promise<string> {
    const homePage = new HomePage(page);
    const companiesListPage = new CompaniesListPage(page);

    console.log(`EaseAppUtils: Normalizing company name for "${companyName}"...`);
    
    // 1. Ensure we are on the companies list page
    await homePage.goToCompanies();

    // 2. Perform the search and extract the full name
    const fullCompanyName = await companiesListPage.searchAndExtractFullCompanyName(companyName);
    
    // 3. Navigate back to the home page to leave the browser in a neutral state
    await homePage.goToHome();
    
    console.log(`   - Successfully normalized name to: "${fullCompanyName}"`);
    return fullCompanyName;
  }
}