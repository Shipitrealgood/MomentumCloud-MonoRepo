// packages/mcp-servers/ease-mcp-server/src/automation-lib/page-objects/generateCensusWizardPage.ts

import { Page, Locator } from 'playwright';

/**
 * Page Object for the "Generate Census" pop-up wizard.
 */
export class GenerateCensusWizardPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // --- Locators ---

  get includeDependentsDropdown(): Locator {
    return this.page.getByText('Include Dependents *');
  }

  get includeDependentsYesOption(): Locator {
    return this.page.getByRole('option', { name: 'Yes' });
  }

  get generateButton(): Locator {
    return this.page.getByRole('button', { name: 'Generate' });
  }

  get confirmationOkButton(): Locator {
    return this.page.getByRole('button', { name: 'OK' });
  }

  // --- High-Level Actions ---

  /**
   * Completes the wizard to generate the census report.
   * Defaults to including dependents.
   */
  async generateCensusWithDependents(): Promise<void> {
    console.log("GenerateCensusWizardPage: Generating census with dependents...");
    
    await this.includeDependentsDropdown.click();
    await this.includeDependentsYesOption.click();
    await this.generateButton.click();

    // Wait for the confirmation dialog and click OK
    await this.confirmationOkButton.waitFor();
    await this.confirmationOkButton.click();
    console.log("   - Census generation started.");
  }
}