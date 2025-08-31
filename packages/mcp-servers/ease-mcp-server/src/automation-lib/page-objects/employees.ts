import { Page, Locator } from 'playwright';

/**
 * Page Object for the "Employees List" page within a specific company.
 * Encapsulates all actions related to finding and selecting employees.
 */
export class EmployeesPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // --- Locators ---

  get searchBox(): Locator {
    return this.page.getByRole('textbox', { name: /Searching \d+ employees/i });
  }

  employeeLink(employeeName: string): Locator {
    let link = this.page.getByRole('link');
    employeeName.split(' ').forEach(part => link = link.filter({ hasText: part }));
    return link;
  }

  // --- Actions ---

  /**
   * Searches for a specific employee and clicks on their profile link.
   * This method now includes a specific wait for the result to appear.
   * @param employeeName The name of the employee to find.
   */
  async searchAndNavigateToEmployee(employeeName: string): Promise<void> {
    console.log(`EmployeesPage: Searching for and navigating to ${employeeName}...`);
    await this.searchBox.fill(employeeName);
    await this.searchBox.press('Enter');
    
    // --- THE ROBUST FIX IS HERE ---
    const link = this.employeeLink(employeeName);
    await link.waitFor(); // Wait for the specific link to appear
    await link.click();   // Then click it
  }
}