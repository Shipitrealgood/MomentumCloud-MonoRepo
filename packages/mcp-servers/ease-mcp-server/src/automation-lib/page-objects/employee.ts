import { Page, Locator } from 'playwright';

/**
 * Page Object for the main Employee Profile page.
 * It contains nested classes for the different tabs (Personal, Benefits, etc.)
 * to organize locators and actions logically.
 */
export class EmployeePage {
  private readonly page: Page;
  public readonly personalTab: PersonalTabPage;
  // public readonly benefitsTab: BenefitsTabPage; // A placeholder for future expansion

  constructor(page: Page) {
    this.page = page;
    this.personalTab = new PersonalTabPage(this.page);
    // this.benefitsTab = new BenefitsTabPage(this.page);
  }

  // --- Main Profile Navigation ---

  /**
   * Clicks on one of the main navigation tabs on the employee's profile.
   * @param tabName The name of the tab to navigate to.
   */
  async navigateToTab(tabName: 'Profile' | 'Benefits' | 'Time Off' | 'Documents' | 'Family'): Promise<void> {
    console.error(`Navigating to the "${tabName}" tab...`);
    await this.page.getByRole('link', { name: tabName, exact: true }).click();
  }
}

/**
 * Nested Page Object for the "Personal" sub-tab within the "Profile" section.
 * This class isolates all interactions related to the employee's personal details.
 */
class PersonalTabPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // --- Locators for the Personal Tab ---

  /** Locator for the 'Personal' sub-tab link itself. */
  get personalTabLink(): Locator {
    return this.page.getByRole('link', { name: 'Personal', exact: true });
  }

  // --- Name Fields ---
  get firstNameField(): Locator {
    return this.page.getByRole('textbox', { name: 'First Name' });
  }

  get lastNameField(): Locator {
    return this.page.getByRole('textbox', { name: 'Last Name' });
  }
  
  get middleNameField(): Locator {
    return this.page.getByRole('textbox', { name: 'Middle Name' });
  }

  // --- Dropdown/Selected Value Fields ---
  /** * A robust locator for the 'Sex' field. It finds the element that contains the label "Sex"
   * and then finds the sibling element that holds the selected value. This is the best
   * pattern for reading the current value of a dropdown menu.
   */
  get sexValue(): Locator {
    return this.page.locator('div:has-text("Sex") + div');
  }

  /** A robust locator for the 'Marital Status' field, using the same pattern as 'Sex'. */
  get maritalStatusValue(): Locator {
      return this.page.locator('div:has-text("Marital Status") + div');
  }

  // --- Date and SSN Fields ---
  /** Locator for the 'Birth Date' input field, identified by its placeholder. */
  get birthDateField(): Locator {
    // This targets the specific input field for birthdate.
    return this.page.getByRole('textbox', { name: 'mm/dd/yyyy' });
  }
  
  get showSsnButton(): Locator {
    return this.page.getByText('SSN Show');
  }

  get ssnValue(): Locator {
    return this.page.locator('#ssnRow div').nth(1);
  }

  // --- High-Level Actions/Getters for the Personal Tab ---

  /** Ensures the Personal sub-tab is active before any action. */
  private async ensureOnPersonalTab(): Promise<void> {
    // This is a helper to avoid repeating the click in every getter.
    await this.personalTabLink.click();
  }
  
  async getFirstName(): Promise<string> {
    await this.ensureOnPersonalTab();
    return this.firstNameField.inputValue();
  }

  async getLastName(): Promise<string> {
    await this.ensureOnPersonalTab();
    return this.lastNameField.inputValue();
  }

  async getMiddleName(): Promise<string> {
    await this.ensureOnPersonalTab();
    return this.middleNameField.inputValue();
  }

  async getGender(): Promise<string> {
    await this.ensureOnPersonalTab();
    return this.sexValue.innerText();
  }

  async getMaritalStatus(): Promise<string> {
    await this.ensureOnPersonalTab();
    return this.maritalStatusValue.innerText();
  }

  async getBirthDate(): Promise<string> {
    await this.ensureOnPersonalTab();
    return this.birthDateField.inputValue();
  }

  async getSsn(): Promise<string> {
    await this.ensureOnPersonalTab();
    await this.showSsnButton.click();
    return this.ssnValue.innerText();
  }
}