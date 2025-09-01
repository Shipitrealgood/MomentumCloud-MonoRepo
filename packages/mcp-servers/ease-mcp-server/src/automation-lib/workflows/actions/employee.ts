import { Page } from 'playwright';
import { AddEmployeeWizardPage } from '../../page-objects/addEmployeeWizardPage.js';
import { EmployeeNavigationWorkflows } from '../navigation/employee.js';
import { EmployeePage } from '../../page-objects/employee.js';
import { TerminateEmployeeWizardPage } from '../../page-objects/terminateEmployeeWizardPage.js';
import { CompanyNavigationWorkflows } from '../navigation/company.js';
import { CompanyDashboardPage } from '../../page-objects/company.js';

export class EmployeeActions {
  public static async addNewEmployee(
    page: Page,
    companyName: string,
    employeeData: {
      step1: {
        firstName: string;
        lastName: string;
        birthDate?: string;
        gender?: 'Male' | 'Female';
        address?: string;
        city?: string;
        state?: string;
        zip?: string;
      };
      step2: {
        employeeType: string;
        status: string;
        hireDate: string;
        hours: string;
        compensation?: string;
        compType?: 'Salary' | 'Hourly';
        payCycle: string;
      };
    }
  ): Promise<void> {
    console.log(`WORKFLOW: Adding new employee "${employeeData.step1.firstName} ${employeeData.step1.lastName}" to ${companyName}...`);

    await CompanyNavigationWorkflows.navigateToCompanyDashboard(page, companyName);

    const companyDashboardPage = new CompanyDashboardPage(page);
    const addEmployeeWizardPage = new AddEmployeeWizardPage(page);
    
    await companyDashboardPage.goToEmployeesTab();
    await companyDashboardPage.employeesTab.clickAddEmployee();

    await addEmployeeWizardPage.fillStep1(employeeData.step1);
    await addEmployeeWizardPage.fillStep2(employeeData.step2);

    console.log(`WORKFLOW: Successfully submitted new employee.`);
  }

  public static async terminateEmployee(
    page: Page,
    companyName: string,
    employeeName: string,
    terminationData: {
      terminationType: 'Involuntary' | 'Voluntary' | 'Gross Misconduct';
      terminationDate: string;
      reason: string;
    }
  ): Promise<void> {
    console.log(`WORKFLOW: Terminating employee "${employeeName}" at ${companyName}...`);

    // Step 1: Navigate to the employee's profile using existing navigation workflows.
    await EmployeeNavigationWorkflows.navigateEmployeeToProfile(page, companyName, employeeName);

    // Step 2: Instantiate the necessary Page Objects "just-in-time".
    const employeePage = new EmployeePage(page);
    const terminateWizard = new TerminateEmployeeWizardPage(page);

    // Step 3: Navigate to the correct tab on the employee's profile.
    await employeePage.goToEmploymentTab();
    
    // Step 4: Use the employee page object to start the wizard.
    await employeePage.employmentTab.goToterminateEmployee();

    // Step 5: Use the dedicated wizard page object to complete the multi-step process.
    await terminateWizard.completeTerminationWizard(terminationData);

    // Step 6: Wait for the success confirmation toast to appear.
    await page.locator('.c-toast--success').waitFor();

    console.log(`WORKFLOW: Successfully terminated ${employeeName}.`);
  }
}