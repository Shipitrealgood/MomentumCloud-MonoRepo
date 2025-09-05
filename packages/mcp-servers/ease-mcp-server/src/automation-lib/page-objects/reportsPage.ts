import path from 'path';
import { fileURLToPath } from 'url';
import { Locator, Page } from 'playwright';
import fs from 'fs';

// Derive __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ReportsPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // --- Locators ---
  get generatedTabLink(): Locator {
    return this.page.getByRole('link', { name: 'Generated', exact: true });
  }

  get searchBox(): Locator {
    return this.page.getByRole('textbox', { name: 'Search Generated Reports', exact: true });
  }

  private getLatestFullCensusRow(companyName: string): Locator {
    return this.page
      .locator('div')
      .filter({ hasText: new RegExp(`${companyName}.*Full Census\\.csv`, 'i') }) // Case-insensitive match for company + filename
      .filter({ hasText: 'Completed' })
      .first();
  }

  private getReportViewLink(companyName: string): Locator {
    const row = this.getLatestFullCensusRow(companyName);
    return row.locator('.c-list-view__item > .e-container > .e-row > div > a').first();
  }

  // --- High-Level Actions ---
  async downloadLatestFullCensus(companyName: string): Promise<string> {
    console.log(`ReportsPage: Downloading latest Full Census for "${companyName}"...`);

    // Navigate to Generated tab
    await this.generatedTabLink.click();
    await this.page.waitForSelector('div:has-text("Name Date Status")', { state: 'visible', timeout: 30000 }); // Wait for table header

    // Clear and use only company name in search
    await this.searchBox.clear(); // Clear any existing text
    await this.searchBox.fill(companyName); // Only company name
    console.log(`Searching for: "${companyName}"`);
    await this.searchBox.press('Enter');
    await this.page.waitForTimeout(2000); // Wait for results to populate

    // Debug: Log all visible rows
    const allRows = await this.page.locator('div.c-list-view__item').allInnerTexts();
    console.log(`Visible rows after search: ${JSON.stringify(allRows, null, 2)}`);

    // Check if any rows are found
    const rowCount = await this.page.locator('div.c-list-view__item').count();
    if (rowCount === 0) {
      const tableContent = await this.page.locator('div:has-text("Name Date Status")').innerText();
      console.error(`No reports found for "${companyName}". Table contents: ${tableContent}`);
      throw new Error(`Unable to locate any reports containing "${companyName}".`);
    }

    const viewLink = this.getReportViewLink(companyName);
    
    // Wait for the link to be visible and clickable
    try {
      await viewLink.waitFor({ state: 'visible', timeout: 120000 }); // 2 minutes for delays
    } catch (error) {
      console.error(`Failed to find view link. Visible rows: ${JSON.stringify(allRows, null, 2)}`);
      throw error;
    }

    // Handle download
    const [download] = await Promise.all([
      this.page.waitForEvent('download', { timeout: 60000 }),
      viewLink.click(),
    ]);

    // Ensure downloads directory exists
    const downloadsDir = path.join(__dirname, '..', '..', '..', 'downloads');
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    // Save to downloads folder
    const downloadPath = path.join(downloadsDir, download.suggestedFilename());
    await download.saveAs(downloadPath);

    console.log(`   - Report successfully downloaded to: ${path.basename(downloadPath)}`);
    return downloadPath;
  }
}