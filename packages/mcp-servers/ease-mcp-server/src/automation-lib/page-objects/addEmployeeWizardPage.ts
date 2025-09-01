import { Page, Locator } from 'playwright';

/**
 * Page Object for the multi-step "Add Employee" wizard.
 * Encapsulates all locators and actions for each step of the wizard.
 */
export class AddEmployeeWizardPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // --- Locators for Step 1: Personal Information ---

  get firstNameField(): Locator {
    return this.page.getByRole('textbox', { name: 'First Name' });
  }

  get lastNameField(): Locator {
    return this.page.getByRole('textbox', { name: 'Last Name' });
  }

  get birthDateField(): Locator {
    return this.page.getByRole('textbox', { name: 'mm/dd/yyyy' }).first();
  }

  get genderDropdown(): Locator {
    return this.page.locator('#sexRow .c-input__value');
  }

  get streetAddressField(): Locator {
    return this.page.getByRole('textbox', { name: 'Street Address' });
  }

  get cityField(): Locator {
    return this.page.getByRole('textbox', { name: 'City' });
  }

  get stateDropdown(): Locator {
    return this.page.locator('#stateRow .c-input__value');
  }

  get zipField(): Locator {
    return this.page.getByRole('textbox', { name: 'Zip' });
  }

  get nextButton(): Locator {
    return this.page.getByRole('button', { name: 'Next' });
  }

  // --- Locators for Step 2: Employment Details ---

  get employeeTypeDropdown(): Locator {
    return this.page.locator('#employeeTypeRow .c-input__value');
  }

  get employeeStatusDropdown(): Locator {
    return this.page.locator('#employeeStatusRow .c-input__value');
  }

  get hireDateField(): Locator {
    return this.page.getByRole('textbox', { name: 'mm/dd/yyyy' });
  }

  get scheduledHoursField(): Locator {
    return this.page.getByRole('textbox', { name: '0', exact: true });
  }

  get compensationField(): Locator {
    return this.page.getByRole('textbox', { name: '$' });
  }

  get compensationTypeDropdown(): Locator {
    return this.page.locator('#compensationtypeRow .c-input__value');
  }

  get payCycleDropdown(): Locator {
    return this.page.locator('#paycycleRow .c-input__value');
  }

  get addEmployeeButton(): Locator {
    return this.page.getByRole('button', { name: 'Add Employee' });
  }

  // --- High-Level Actions ---

  /**
   * A helper method to handle selecting an option from a dropdown.
   */
  private async selectDropdownOption(dropdownLocator: Locator, optionName: string): Promise<void> {
    await dropdownLocator.click();
    // Use .last() to handle cases where multiple options might match (e.g., 'Active' status)
    await this.page.getByRole('option', { name: optionName, exact: true }).last().click();
  }

  /**
   * Fills out all the fields for the first step of the wizard.
   */
  async fillStep1(data: { firstName: string; lastName: string; birthDate?: string; gender?: 'Male' | 'Female'; address?: string; city?: string; state?: string; zip?: string; }): Promise<void> {
    await this.firstNameField.fill(data.firstName);
    await this.lastNameField.fill(data.lastName);
    if (data.birthDate) await this.birthDateField.fill(data.birthDate);
    if (data.gender) await this.selectDropdownOption(this.genderDropdown, data.gender);
    if (data.address) await this.streetAddressField.fill(data.address);
    if (data.city) await this.cityField.fill(data.city);
    if (data.state) await this.selectDropdownOption(this.stateDropdown, data.state);
    if (data.zip) await this.zipField.fill(data.zip);
    await this.nextButton.click();
    // Robust Wait: After clicking 'Next', wait for an element unique to Step 2 to appear.
    await this.employeeTypeDropdown.waitFor();
  }

  /**
   * Fills out all the fields for the second step of the wizard.
   */
  async fillStep2(data: { employeeType: string; status: string; hireDate: string; hours: string; compensation?: string; compType?: 'Salary' | 'Hourly'; payCycle: string; }): Promise<void> {
    // Check the current value before clicking the dropdown.
    const currentEmployeeType = await this.employeeTypeDropdown.innerText();
    if (currentEmployeeType.trim() !== data.employeeType) {
      await this.selectDropdownOption(this.employeeTypeDropdown, data.employeeType);
    }

    const currentStatus = await this.employeeStatusDropdown.innerText();
    if (currentStatus.trim() !== data.status) {
      await this.selectDropdownOption(this.employeeStatusDropdown, data.status);
    }

    await this.hireDateField.fill(data.hireDate);
    await this.scheduledHoursField.fill(data.hours);
    if (data.compensation) await this.compensationField.fill(data.compensation);
    if (data.compType) await this.selectDropdownOption(this.compensationTypeDropdown, data.compType);
    await this.selectDropdownOption(this.payCycleDropdown, data.payCycle);
    await this.addEmployeeButton.click();

    // Robust Wait: Wait for a confirmation element that appears AFTER submission.
    await this.page.locator('.c-toast--success').waitFor();
  }
}