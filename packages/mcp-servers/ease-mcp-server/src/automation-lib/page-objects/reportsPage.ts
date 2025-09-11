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

  // Available Tab locators and actions

  // --- Locators ---

  get availableTabLink(): Locator {
    return this.page.getByRole('link', { name: 'Available', exact: true });
  }

  get availableReportsCompanyDropdownTrigger(): Locator {
    // Using the broader, more stable locator you identified from the inspector
    return this.page.locator('#reportCompanyIdRow div').filter({ hasText: 'Company' }).nth(3);
  }

  // Locators for specific reports

  get enrollmentProgressReportLink(): Locator {
    return this.page.getByText('Enrollment Progress');
  }
// Wizard pop up page getters once report is clicked.
  get confirmationOkButton(): Locator {
    return this.page.getByRole('button', { name: 'OK' });
  }

  // --- Dropdown Locators from company search object on available reports tab ---

  get companySearchCombobox(): Locator {
    return this.page.getByRole('combobox', { name: 'Search' });
  }

  companyOption(companyName: string): Locator {
    // This now returns a generic locator for any company option.
    return this.page.getByRole('option', { name: companyName, exact: true });
  }

  // Generated Tab locators and actions

  // --- Locators ---
  get generatedTabLink(): Locator {
    return this.page.getByRole('link', { name: 'Generated', exact: true });
  }

  get searchBox(): Locator {
    return this.page.getByRole('textbox', { name: 'Search Generated Reports', exact: true });
  }

  // --- Helper Methods ---
  // -- Full Census Report Specific --
  // Finds the most recent "Full Census.csv" report row for the specified company that is marked "Completed"

  private getLatestFullCensusRow(companyName: string): Locator {
    return this.page
      .locator('div')
      .filter({ hasText: new RegExp(`${companyName}.*Full Census\\.csv`, 'i') }) // Case-insensitive match for company + filename
      .filter({ hasText: 'Completed' })
      .first();
  }

// Gets the "View" link within the latest Full Census row for the specified company

  private getReportViewLink(companyName: string): Locator {
    const row = this.getLatestFullCensusRow(companyName);
    return row.locator('.c-list-view__item > .e-container > .e-row > div > a').first();
  }

// -- Enrollment Status Report Specific --
// Finds the most recent "Enrollment Status.csv" report row for the specified company that is marked "Completed"
  private getLatestEnrollmentProgressRow(companyName: string): Locator {
    return this.page
      .locator('div')
      .filter({ hasText: new RegExp(`${companyName}.*Enrollment Status\\.csv`, 'i') }) // Case-insensitive match for company + filename
      .filter({ hasText: 'Completed' })
      .first();
  }

  // Gets the "View" link within the latest Enrollment Progress row for the specified company

  private getEnrollmentReportViewLink(companyName: string): Locator {
    const row = this.getLatestEnrollmentProgressRow(companyName);
    return row.locator('.c-list-view__item > .e-container > .e-row > div > a').first();
  }

  // --- High-Level Actions ---

  async downloadLatestEnrollmentProgressReport(companyName: string): Promise<string> {
    console.log(`ReportsPage: Downloading latest Enrollment Progress report for "${companyName}"...`);

    // This method assumes you are already on the "Generated" tab.
    await this.page.waitForSelector('div:has-text("Name Date Status")', { state: 'visible', timeout: 30000 });

    // --- THE FIX IS HERE ---
    // Search for ONLY the company name, exactly like the working downloadLatestFullCensus method.
    await this.searchBox.clear();
    await this.searchBox.fill(companyName);
    console.log(`Searching for: "${companyName}"`);
    await this.searchBox.press('Enter');
    await this.page.waitForTimeout(2000); // Wait for results to populate
    // --- END OF FIX ---

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

    // This now correctly calls the dedicated helper for the Enrollment Progress report.
    const viewLink = this.getEnrollmentReportViewLink(companyName);
    
    // Wait for the link to be visible and clickable
    try {
      await viewLink.waitFor({ state: 'visible', timeout: 120000 }); // 2 minutes for delays
    } catch (error: any) {
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