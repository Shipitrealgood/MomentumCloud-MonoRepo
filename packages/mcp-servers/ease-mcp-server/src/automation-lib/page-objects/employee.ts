import { Page, Locator } from 'playwright';

/**
 * Page Object for the main Employee Profile page.
 * It contains nested classes for the different tabs (Profile, Employment, etc.)
 * to organize locators and actions logically.
 */
export class EmployeePage {
  private readonly page: Page;
  
  // Public accessors for each nested tab object
  public readonly profileTab: ProfileTabPage;
  public readonly employmentTab: EmploymentTabPage;
  public readonly benefitsTab: BenefitsTabPage;
  public readonly documentsTab: DocumentsTabPage;

  constructor(page: Page) {
    this.page = page;
    // Instantiate all nested tab objects
    this.profileTab = new ProfileTabPage(this.page);
    this.employmentTab = new EmploymentTabPage(this.page);
    this.benefitsTab = new BenefitsTabPage(this.page);
    this.documentsTab = new DocumentsTabPage(this.page);
  }

  // --- Locators for Main Profile Navigation ---

  get profileLink(): Locator {
    return this.page.getByRole('link', { name: 'Profile', exact: true });
  }

  get employmentLink(): Locator {
    return this.page.getByRole('link', { name: 'Employment', exact: true });
  }
  
  get benefitsLink(): Locator {
    return this.page.getByRole('link', { name: 'Benefits', exact: true });
  }

  get documentsLink(): Locator {
    return this.page.getByRole('link', { name: 'Documents', exact: true });
  }
  
  get historyLink(): Locator {
    return this.page.getByRole('link', { name: 'History', exact: true });
  }

  // --- High-Level Actions for Main Profile Navigation ---

  async goToProfileTab(): Promise<void> {
    await this.profileLink.click();
  }
  
  async goToEmploymentTab(): Promise<void> {
    await this.employmentLink.click();
  }

  async goToBenefitsTab(): Promise<void> {
    await this.benefitsLink.click();
  }

  async goToDocumentsTab(): Promise<void> {
    await this.documentsLink.click();
  }

  async goToHistoryTab(): Promise<void> {
    await this.historyLink.click();
  }
}

/**
 * Nested Page Object for the "Profile" sub-tab.
 */
class ProfileTabPage {
  private readonly page: Page;

  constructor(page: Page) { this.page = page; }

  // --- Locators for Sub-Tabs ---
  get personalLink(): Locator { return this.page.getByRole('link', { name: 'Personal', exact: true }); }
  get dependentsLink(): Locator { return this.page.getByRole('link', { name: 'Dependents', exact: true }); }
  get loginLink(): Locator { return this.page.getByRole('link', { name: 'Login', exact: true }); }

  // --- Locators for Personal Details (THE FIX IS HERE) ---
  get firstNameField(): Locator { return this.page.getByRole('textbox', { name: 'First Name' }); }
  get lastNameField(): Locator { return this.page.getByRole('textbox', { name: 'Last Name' }); }
  get middleNameField(): Locator { return this.page.getByRole('textbox', { name: 'Middle Name' }); }
  get sexValue(): Locator { return this.page.locator('#sexRow .c-input__value'); }
  get maritalStatusValue(): Locator { return this.page.locator('#maritalRow .c-input__value'); }
  get birthDateField(): Locator { return this.page.getByRole('textbox', { name: 'mm/dd/yyyy' }); }
  get showSsnButton(): Locator { return this.page.getByText('SSN Show'); }
  get ssnValue(): Locator { return this.page.locator('#ssnRow div').nth(1); }

  // --- Actions for Sub-Tabs ---
  async goToPersonalSubTab(): Promise<void> { await this.personalLink.click(); }
  async goToDependentsSubTab(): Promise<void> { await this.dependentsLink.click(); }
  async goToLoginSubTab(): Promise<void> { await this.loginLink.click(); }
  
  // --- Getters for Personal Details (THE FIX IS HERE) ---
  private async ensureOnPersonalSubTab(): Promise<void> {
    await this.personalLink.click();
  }

  async getFirstName(): Promise<string> {
    await this.ensureOnPersonalSubTab();
    return this.firstNameField.inputValue();
  }
  
  async getLastName(): Promise<string> {
    await this.ensureOnPersonalSubTab();
    return this.lastNameField.inputValue();
  }

  async getMiddleName(): Promise<string> {
    await this.ensureOnPersonalSubTab();
    return this.middleNameField.inputValue();
  }

  async getGender(): Promise<string> {
    await this.ensureOnPersonalSubTab();
    return this.sexValue.innerText();
  }

  async getMaritalStatus(): Promise<string> {
    await this.ensureOnPersonalSubTab();
    return this.maritalStatusValue.innerText();
  }

  async getBirthDate(): Promise<string> {
    await this.ensureOnPersonalSubTab();
    return this.birthDateField.inputValue();
  }

  async getSsn(): Promise<string> {
    await this.ensureOnPersonalSubTab();
    await this.showSsnButton.click();
    return this.ssnValue.innerText();
  }
}

/**
 * Nested Page Object for the "Employment" sub-tab.
 */
class EmploymentTabPage {
  private readonly page: Page;
  
  constructor(page: Page) { this.page = page; }

  get detailsLink(): Locator { return this.page.getByRole('link', { name: 'Details', exact: true }); }
  get compensationLink(): Locator { return this.page.getByRole('link', { name: 'Compensation', exact: true }); }
  get payrollLink(): Locator { return this.page.getByRole('link', { name: 'Payroll', exact: true }); }

  async goToDetailsSubTab(): Promise<void> { await this.detailsLink.click(); }
  async goToCompensationSubTab(): Promise<void> { await this.compensationLink.click(); }
  async goToPayrollSubTab(): Promise<void> { await this.payrollLink.click(); }
}

/**
 * Nested Page Object for the "Benefits" sub-tab.
 */
class BenefitsTabPage {
    private readonly page: Page;

    constructor(page: Page) { this.page = page; }

    get enrollmentsLink(): Locator { return this.page.getByRole('link', { name: 'Enrollments', exact: true }); }
    get summaryLink(): Locator { return this.page.getByRole('link', { name: 'Summary', exact: true }); }
    get beneficiariesLink(): Locator { return this.page.getByRole('link', { name: 'Beneficiaries', exact: true }); }
    get otherCoverageLink(): Locator { return this.page.getByRole('link', { name: 'Other Coverage', exact: true }); }
    get settingsLink(): Locator { return this.page.getByRole('link', { name: 'Settings', exact: true }); }

    async goToEnrollmentsSubTab(): Promise<void> { await this.enrollmentsLink.click(); }
    async goToSummarySubTab(): Promise<void> { await this.summaryLink.click(); }
    async goToBeneficiariesSubTab(): Promise<void> { await this.beneficiariesLink.click(); }
    async goToOtherCoverageSubTab(): Promise<void> { await this.otherCoverageLink.click(); }
    async goToSettingsSubTab(): Promise<void> { await this.settingsLink.click(); }
}

/**
 * Nested Page Object for the "Documents" sub-tab.
 */
class DocumentsTabPage {
    private readonly page: Page;
    
    constructor(page: Page) { this.page = page; }

    get formsLink(): Locator { return this.page.getByRole('link', { name: 'Forms', exact: true }); }

    async goToFormsSubTab(): Promise<void> { await this.formsLink.click(); }
}