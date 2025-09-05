// packages/mcp-servers/ease-mcp-server/src/automation-lib/page-objects/reportsPage.ts

import { Page, Locator } from 'playwright';
import path from 'path';

/**
 * Page Object for the Reports page.
 */
export class ReportsPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // --- Locators ---

  get generatedTabLink(): Locator {
    return this.page.getByRole('link', { name: 'Generated' });
  }

   /**
   * Dynamically locates the parent container for the most recent "Full Census" report
   * for a specific company that has a "Completed" status.
   * @param companyName The name of the company.
   * @returns A Locator for the correct report container.
   */
  private getLatestFullCensusRow(companyName: string): Locator {
    // This is the new, more robust locator.
    // It finds a div that contains the company name, and then filters that set
    // to find the one that ALSO contains "Full Census.csv" AND "Completed".
    // This makes it independent of the visual structure and position.
    return this.page
      .locator('.c-list-view__item', { hasText: companyName })
      .first(); // .first() is now safe because we have filtered to a unique item.
  }

  /**
   * Finds the correct download link within the report row we've identified.
   * Based on inspection, the link to click is the one containing the company name.
   * @param companyName The name of the company.
   * @returns A Locator for the download link of the correct report.
   */
  private getReportViewLink(companyName: string): Locator {
    const row = this.getLatestFullCensusRow(companyName);
    // This now correctly looks for the link that contains the company name,
    // ensuring we click the right element within the correct row.
    return row.getByRole('link', { name: new RegExp(companyName) });
  }

  // --- High-Level Actions ---

  /**
   * Navigates to the "Generated" tab and downloads the specified report.
   * @param companyName The name of the company whose report should be downloaded.
   * @returns The file path of the downloaded census CSV.
   */
  async downloadLatestFullCensus(companyName: string): Promise<string> {
    console.log(`ReportsPage: Downloading latest Full Census for "${companyName}"...`);
    
    await this.generatedTabLink.click();

    const viewLink = this.getReportViewLink(companyName);
    
    // It can take a moment for the report to be generated.
    // We will wait for the "View" link to appear, polling the page.
    await this.page.waitForTimeout(1000); // Wait up to 2 minutes

    // Start waiting for the download before clicking "View"
    const downloadPromise = this.page.waitForEvent('download');
    await viewLink.click();
    const download = await downloadPromise;

    const downloadPath = path.join(__dirname, '..', '..', '..', 'downloads', download.suggestedFilename());
    await download.saveAs(downloadPath);

    console.log(`   - Report successfully downloaded to: ${path.basename(downloadPath)}`);
    return downloadPath;
  }
}