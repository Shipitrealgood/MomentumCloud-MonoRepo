import { Page, Locator } from 'playwright';

/**
 * Page Object for the main dashboard of a single company.
 * Encapsulates navigation to all primary sections like Profile, Employees, Benefits, etc.
 */
export class CompanyDashboardPage {
  private readonly page: Page;

  // Public accessors for each nested tab object
  public readonly profileTab: ProfileTabPage;
  public readonly employeesTab: EmployeesTabPage;
  public readonly benefitsTab: BenefitsTabPage;
  public readonly loginsTab: LoginsTabPage;
  public readonly settingsTab: SettingsTabPage;

  constructor(page: Page) {
    this.page = page;
    // Instantiate all nested tab objects
    this.profileTab = new ProfileTabPage(this.page);
    this.employeesTab = new EmployeesTabPage(this.page);
    this.benefitsTab = new BenefitsTabPage(this.page);
    this.loginsTab = new LoginsTabPage(this.page);
    this.settingsTab = new SettingsTabPage(this.page);
  }

  // --- Locators for Top-Level Navigation Tabs ---

  get profileLink(): Locator {
    return this.page.getByRole('link', { name: 'Profile', exact: true });
  }

  get employeesLink(): Locator {
    return this.page.getByRole('link', { name: 'Employees', exact: true });
  }

  get benefitsLink(): Locator {
    return this.page.getByRole('link', { name: 'Benefits', exact: true });
  }

  get loginsLink(): Locator {
    return this.page.getByRole('link', { name: 'Logins', exact: true });
  }

  get marketplaceLink(): Locator {
    return this.page.getByRole('link', { name: 'Marketplace', exact: true });
  }

  get settingsLink(): Locator {
    return this.page.getByRole('link', { name: 'Settings', exact: true });
  }

  // --- High-Level Actions for Main Navigation ---

  async goToProfileTab(): Promise<void> {
    await this.profileLink.click();
  }
  
  async goToEmployeesTab(): Promise<void> {
    await this.employeesLink.click();
    // THE FIX: Wait for a key element on the next page (the Actions button)
    // to be visible before considering the navigation complete. This prevents
    // race conditions where the script tries to act before the page is ready.
    await this.employeesTab.actionsButton.waitFor({ state: 'visible' });
  }

  async goToBenefitsTab(): Promise<void> {
    await this.benefitsLink.click();
  }

  async goToLoginsTab(): Promise<void> {
    await this.loginsLink.click();
  }

  async goToMarketplaceTab(): Promise<void> {
    await this.marketplaceLink.click();
  }

  async goToSettingsTab(): Promise<void> {
    await this.settingsLink.click();
  }
}

/**
 * Nested Page Object for the "Profile" sub-tab.
 */
class ProfileTabPage {
  private readonly page: Page;
  constructor(page: Page) { this.page = page; }

  get overviewLink(): Locator { return this.page.getByRole('link', { name: 'Overview', exact: true }); }
  get detailsLink(): Locator { return this.page.getByRole('link', { name: 'Details', exact: true }); }
  get accessLink(): Locator { return this.page.getByRole('link', { name: 'Access', exact: true }); }
  get organizationLink(): Locator { return this.page.getByRole('link', { name: 'Organization', exact: true }); }

  async goToOverviewSubTab(): Promise<void> { await this.overviewLink.click(); }
  async goToDetailsSubTab(): Promise<void> { await this.detailsLink.click(); }
  async goToAccessSubTab(): Promise<void> { await this.accessLink.click(); }
  async goToOrganizationSubTab(): Promise<void> { await this.organizationLink.click(); }
}

/**
 * Nested Page Object for the "Employees" sub-tab.
 */
class EmployeesTabPage {
  private readonly page: Page;
  constructor(page: Page) { this.page = page; }

  get searchBox(): Locator { return this.page.getByRole('textbox', { name: /Searching \d+ employees/i }); }
  
  // THE DEFINITIVE FIX:
  // Using a specific CSS selector to uniquely identify the "Actions" button
  // and ignore other elements like chat bots that might have the same name.
  // This looks for a <button> element that also has the class "c-button".
  get actionsButton(): Locator { return this.page.locator('button.c-button:has-text("Actions")'); }

  // Locators for options within the 'Actions' dropdown
  get addEmployeeAction(): Locator { return this.page.locator('a').filter({ hasText: 'Add Employee' }); }
  get basicCensusAction(): Locator { return this.page.getByText('Basic Census'); }
  get demographicCensusAction(): Locator { return this.page.getByText('Demographic Census'); }
  get fullCensusAction(): Locator { return this.page.getByText('Full Census'); }
  get importEmployeesAction(): Locator { return this.page.getByText('Import Employees'); }

  async search(employeeName: string): Promise<void> {
    await this.searchBox.fill(employeeName);
    await this.searchBox.press('Enter');
  }

  async clickAddEmployee(): Promise<void> {
    // Using the sequence discovered during debugging.
    // First, a hardcoded pause to ensure the page is settled.
    await this.page.waitForTimeout(1000); // 1000ms = 1 second
    // Then, click the main actions button.
    await this.actionsButton.click();
    // Finally, click the option within the now-open dropdown.
    await this.addEmployeeAction.click();
  }
}

/**
 * Nested Page Object for the "Benefits" sub-tab.
 */
class BenefitsTabPage {
  private readonly page: Page;
  constructor(page: Page) { this.page = page; }

  get plansLink(): Locator { return this.page.getByRole('link', { name: 'Plans', exact: true }); }
  get progressLink(): Locator { return this.page.getByRole('link', { name: 'Progress', exact: true }); }
  get openEnrollmentLink(): Locator { return this.page.getByRole('link', { name: 'Open Enrollment', exact: true }); }
  get lockEnrollmentLink(): Locator { return this.page.getByRole('link', { name: 'Lock Enrollment', exact: true }); }
  get instructionsLink(): Locator { return this.page.getByRole('link', { name: 'Instructions', exact: true }); }
  get rateQuotingLink(): Locator { return this.page.getByRole('link', { name: 'Rate Quoting', exact: true }); }

  async goToPlansSubTab(): Promise<void> { await this.plansLink.click(); }
  async goToProgressSubTab(): Promise<void> { await this.progressLink.click(); }
  async goToOpenEnrollmentSubTab(): Promise<void> { await this.openEnrollmentLink.click(); }
  async goToLockEnrollmentSubTab(): Promise<void> { await this.lockEnrollmentLink.click(); }
  async goToInstructionsSubTab(): Promise<void> { await this.instructionsLink.click(); }
  async goToRateQuotingSubTab(): Promise<void> { await this.rateQuotingLink.click(); }
}

/**
 * Nested Page Object for the "Logins" sub-tab.
 */
class LoginsTabPage {
  private readonly page: Page;
  constructor(page: Page) { this.page = page; }

  get loginsLink(): Locator { return this.page.getByRole('link', { name: 'Logins', exact: true }).nth(1); }
  get emailActivityLink(): Locator { return this.page.getByRole('link', { name: 'Email Activity', exact: true }); }
  get securityLink(): Locator { return this.page.getByRole('link', { name: 'Security', exact: true }); }

  async goToLoginsSubTab(): Promise<void> { await this.loginsLink.click(); }
  async goToEmailActivitySubTab(): Promise<void> { await this.emailActivityLink.click(); }
  async goToSecuritySubTab(): Promise<void> { await this.securityLink.click(); }
}

/**
 * Nested Page Object for the "Settings" sub-tab.
 */
class SettingsTabPage {
  private readonly page: Page;
  constructor(page: Page) { this.page = page; }

  get brandingLink(): Locator { return this.page.getByRole('link', { name: 'Branding', exact: true }); }
  get optionalFieldsLink(): Locator { return this.page.getByRole('link', { name: 'Optional Fields', exact: true }); }
  get customFieldsLink(): Locator { return this.page.getByRole('link', { name: 'Custom Fields', exact: true }); }
  get emailTemplatesLink(): Locator { return this.page.getByRole('link', { name: 'Email Templates', exact: true }); }
  get notificationsLink(): Locator { return this.page.getByRole('link', { name: 'Notifications', exact: true }); }

  async goToBrandingSubTab(): Promise<void> { await this.brandingLink.click(); }
  async goToOptionalFieldsSubTab(): Promise<void> { await this.optionalFieldsLink.click(); }
  async goToCustomFieldsSubTab(): Promise<void> { await this.customFieldsLink.click(); }
  async goToEmailTemplatesSubTab(): Promise<void> { await this.emailTemplatesLink.click(); }
  async goToNotificationsSubTab(): Promise<void> { await this.notificationsLink.click(); }
}