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
    await this.page.getByRole('option', { name: optionName, exact: true }).click();
  }

  /**
   * Fills out all the fields for the first step of the wizard.
   */
  async fillStep1(data: { firstName: string; lastName: string; birthDate: string; gender: 'Male' | 'Female'; address: string; city: string; state: string; zip: string; }): Promise<void> {
    await this.firstNameField.fill(data.firstName);
    await this.lastNameField.fill(data.lastName);
    await this.birthDateField.fill(data.birthDate);
    await this.selectDropdownOption(this.genderDropdown, data.gender);
    await this.streetAddressField.fill(data.address);
    await this.cityField.fill(data.city);
    await this.selectDropdownOption(this.stateDropdown, data.state);
    await this.zipField.fill(data.zip);
    await this.nextButton.click();
  }

  /**
   * Fills out all the fields for the second step of the wizard.
   */
  async fillStep2(data: { employeeType: string; status: string; hireDate: string; hours?: string; compensation: string; compType: 'Salary' | 'Hourly'; payCycle: string; }): Promise<void> {
    await this.selectDropdownOption(this.employeeTypeDropdown, data.employeeType);
    await this.selectDropdownOption(this.employeeStatusDropdown, data.status);
    await this.hireDateField.fill(data.hireDate);
    if (data.hours) {
        await this.scheduledHoursField.fill(data.hours);
    }
    await this.compensationField.fill(data.compensation);
    await this.selectDropdownOption(this.compensationTypeDropdown, data.compType);
    await this.selectDropdownOption(this.payCycleDropdown, data.payCycle);
    await this.addEmployeeButton.click();
  }
}