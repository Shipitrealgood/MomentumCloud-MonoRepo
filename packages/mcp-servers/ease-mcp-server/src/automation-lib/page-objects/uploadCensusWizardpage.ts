// packages/mcp-servers/ease-mcp-server/src/automation-lib/page-objects/uploadCensusWizardPage.ts

import { Page, Locator } from 'playwright';
import path from 'path';

/**
 * Page Object for the multi-step "Import Employees" (Census Upload) wizard.
 */
export class UploadCensusWizardPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // --- Locators ---

  get chooseFileButton(): Locator {
    // This is the visible button the user clicks. Playwright will handle the file chooser.
    return this.page.getByRole('button', { name: 'Choose File' });
  }
  
  get fileInputElement(): Locator {
    // This is the actual <input type="file"> element, often hidden. We target it directly for uploading.
    // NOTE: The selector 'input[type="file"]' is a common pattern. We may need to refine this with the inspector if it's not unique enough.
    return this.page.locator('input[type="file"]');
  }

  get startImportButton(): Locator {
    return this.page.getByRole('button', { name: 'Start Import' });
  }

  get processAndFinishImportButton(): Locator {
    return this.page.getByRole('button', { name: 'Process & Finish Import' });
  }
  
  get cancelButton(): Locator {
    return this.page.getByRole('button', { name: 'Cancel' });
  }
  
  get successToast(): Locator {
      return this.page.locator('.c-toast--success:has-text("Employees have been imported.")');
  }

  // --- High-Level Actions ---

  /**
   * Orchestrates the entire census file upload process.
   * @param filePath The absolute path to the census file to be uploaded.
   * @returns The path to a screenshot taken at the confirmation step.
   */
  async uploadAndProcessCensus(filePath: string): Promise<string> {
    console.log(`UploadCensusWizardPage: Starting census upload for file: ${path.basename(filePath)}`);

    // Step 1: Set the file on the input element.
    // Playwright handles the OS file chooser dialog automatically.
    await this.fileInputElement.setInputFiles(filePath);
    console.log(`   - File selected.`);
    
    // Step 2: Start the import process.
    await this.startImportButton.click();
    console.log(`   - "Start Import" button clicked.`);

    // Step 3: Wait for the confirmation/mapping page to load and take a screenshot.
    // We need a reliable locator for an element that only appears on this confirmation page.
    // For now, we'll wait for the "Process & Finish Import" button to be ready.
    await this.processAndFinishImportButton.waitFor({ state: 'visible', timeout: 30000 }); // Wait up to 30s
    
    const screenshotPath = `census-confirmation-screenshot-${Date.now()}.png`;
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`   - Confirmation page reached. Screenshot saved to: ${screenshotPath}`);

    // In a real agentic workflow, we would return here and wait for user confirmation.
    // For this test, we proceed automatically.
    
    // Step 4: Finalize the import.
    await this.processAndFinishImportButton.click();
    console.log(`   - "Process & Finish Import" button clicked.`);
    
    // Step 5: Wait for the success confirmation toast to appear.
    await this.successToast.waitFor({ timeout: 60000 }); // Allow up to 60s for processing.
    console.log(`   - Success toast detected. Import complete.`);

    return screenshotPath;
  }
}