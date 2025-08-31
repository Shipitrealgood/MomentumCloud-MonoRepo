import { Page } from 'playwright';
import { EmployeePage } from '../../page-objects/employee.js';
import { EmployeeNavigation } from './employee.js';

/**
 * A collection of navigation workflows related to the Benefits section of an employee's profile.
 */
export class BenefitsNavigation {

  /**
   * A complete, end-to-end workflow to navigate to an employee's main Benefits tab.
   */
  public static async toBenefitsTab(page: Page, companyName: string, employeeName: string): Promise<void> {
    console.log(`WORKFLOW: Starting navigation to the Benefits tab for ${employeeName}...`);

    // Step 1: Reuse our existing workflow to get to the employee's main profile page.
    await EmployeeNavigation.toProfile(page, companyName, employeeName);

    // Step 2: Now that we've arrived, use the EmployeePage object to perform the final navigation step.
    const employeePage = new EmployeePage(page);
    await employeePage.goToBenefitsTab();

    console.log(`WORKFLOW: Successfully arrived at the Benefits tab for ${employeeName}.`);
  }
}