import { Page, Locator } from 'playwright';

/**
 * A dedicated Page Object for the multi-step "Terminate Employee" wizard.
 * This class encapsulates all locators and actions for the entire termination flow.
 */
export class TerminateEmployeeWizardPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // --- Locators for Step 1: Termination Type ---
  get terminationTypeDropdown(): Locator { return this.page.getByText('Termination Type *'); }
  get nextButtonStep1(): Locator { return this.page.getByRole('button', { name: 'Next' }); }
  
  // --- Locators for Step 2: Date and Reason ---
  get dateOfChangeField(): Locator { return this.page.getByLabel('Date of Change *'); }
  get reasonField(): Locator { return this.page.getByLabel('Reason *'); }
  get nextButtonStep2(): Locator { return this.page.getByRole('button', { name: 'Next' }); }
  
  // --- Locators for Step 3: Affected Benefits & Save ---
  get saveButton(): Locator { return this.page.getByRole('button', { name: 'Save' }); }

  /**
   * Orchestrates the entire multi-step termination process from start to finish.
   * @param data The necessary information to complete the termination.
   */
  async completeTerminationWizard(data: {
    terminationType: 'Involuntary' | 'Voluntary' | 'Gross Misconduct';
    terminationDate: string; // Expected format: "mm/dd/yyyy"
    reason: string;
  }): Promise<void> {
    
    // --- Step 1: Termination Type ---
    await this.terminationTypeDropdown.waitFor({ state: 'visible' });
    await this.terminationTypeDropdown.click();
    await this.page.getByRole('option', { name: data.terminationType, exact: true }).click();
    await this.nextButtonStep1.click();

    // --- Step 2: Date and Reason ---
    await this.dateOfChangeField.waitFor({ state: 'visible' });
    await this.dateOfChangeField.fill(data.terminationDate);
    await this.reasonField.fill(data.reason);
    await this.nextButtonStep2.click();

    // --- Step 3: Affected Benefits & Save ---
    await this.saveButton.waitFor({ state: 'visible' });
    const screenshotPath = `termination-benefits-${Date.now()}.png`;
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    await this.saveButton.click();
  }
}