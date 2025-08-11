import { z, ZodRawShape } from 'zod';
import { loginToEase } from './playwright-util.js';
import { Page, Browser } from 'playwright';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export interface McpTool {
  name: string;
  description: string;
  inputSchema: ZodRawShape;
  run: (args: any) => Promise<CallToolResult>;
}

async function generateEnrollmentStatusReport(companyName: string): Promise<string> {
  const { EASE_EMAIL, EASE_PASSWORD, EASE_2FA_SECRET } = process.env;
  
  if (!EASE_EMAIL || !EASE_PASSWORD) {
      throw new Error("Ease credentials could not be loaded from .env file.");
  }

  let browser: Browser | undefined;
  let page: Page | undefined;
  try {
    console.error(`Starting tool for: ${companyName}`);
    // This will now succeed and return a logged-in page on the dashboard.
    ({ page, browser } = await loginToEase(EASE_EMAIL, EASE_PASSWORD, EASE_2FA_SECRET));

    console.error('Login successful. Now attempting a command that will fail...');
    
    // This next line WILL FAIL, but because of our changes, the browser will stay open on the dashboard.
    await page.click('a[data-testid="this-selector-is-wrong-on-purpose"]');

    return `This message should not be reached during debug.`;

  } catch (error: any) {
    const specificError = error.message || 'An unknown error occurred.';
    console.error(`An error occurred in the tool function for ${companyName}:`, specificError);
    
    if (page) {
        const screenshotPath = `error_screenshot_${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.error(`Screenshot of the error saved to: ${screenshotPath}`);
    }
    
    throw new Error(`Failed to generate report for ${companyName}. Reason: ${specificError}`);

  } finally {
    // --- DEBUGGING CHANGE ---
    // This is commented out to ensure the browser stays open when the script fails.
    // if (browser) {
    //   await browser.close();
    // }
    // ----------------------
  }
}

async function findCompany(companyName: string): Promise<string> {
  const { EASE_EMAIL, EASE_PASSWORD, EASE_2FA_SECRET } = process.env;
  if (!EASE_EMAIL || !EASE_PASSWORD) {
    throw new Error("Ease credentials could not be loaded from .env file.");
  }

  let browser: Browser | undefined;
  let page: Page | undefined;
  try {
    // Step 1: Get an authenticated session
    console.error(`Logging in to find company: ${companyName}`);
    ({ page, browser } = await loginToEase(EASE_EMAIL, EASE_PASSWORD, EASE_2FA_SECRET));
    console.error("Login successful. Now navigating and searching for the company.");

    // Step 2: Click on the 'Companies' link on the homepage.
    await page.getByRole('link', { name: 'Companies', exact: true }).click();

    // Step 3: Fill the search box.
    await page.getByRole('textbox', { name: /Search \d+ Companies/ }).fill(companyName);

    // --- THE FIX IS HERE ---
    // Step 4: Wait for the search result link to appear on the page.
    // This tells Playwright to pause until the network request is complete and the UI has updated.
    const searchResultLocator = page.getByRole('link', { name: companyName });
    await searchResultLocator.waitFor(); // This is the new, crucial line

    // Step 5: Now that we know the link is visible, click it.
    await searchResultLocator.click();
    // ----------------------
    
    console.error(`Successfully found and navigated to the page for ${companyName}.`);
    return `Successfully found and navigated to the page for ${companyName}.`;

  } catch (error: any) {
    console.error(`Failed to find company ${companyName}. Reason: ${error.message}`);
    if (page) {
        const screenshotPath = `error_screenshot_${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.error(`Screenshot of the failure saved to: ${screenshotPath}`);
    }
    throw new Error(`Failed to find company ${companyName}. Reason: ${error.message}`);
  } finally {
    // Keep this commented out for debugging.
    // if (browser) {
    //   await browser.close();
    // }
  }
}

async function findEmployee(employeeName: string, companyName: string): Promise<string> {
  const { EASE_EMAIL, EASE_PASSWORD, EASE_2FA_SECRET } = process.env;
  if (!EASE_EMAIL || !EASE_PASSWORD) {
    throw new Error("Ease credentials could not be loaded from .env file.");
  }

  let browser: Browser | undefined;
  let page: Page | undefined;
  try {
    // This part of the logic is working perfectly.
    ({ page, browser } = await loginToEase(EASE_EMAIL, EASE_PASSWORD, EASE_2FA_SECRET));
    const companyLinkLocator = page.getByRole('link', { name: companyName });
    await companyLinkLocator.waitFor();
    await companyLinkLocator.click();
    await page.getByRole('link', { name: 'Employees', exact: true }).click();
    
    const searchBoxLocator = page.getByRole('textbox', { name: /Searching \d+ employees/i });
    await searchBoxLocator.fill(employeeName);
    await searchBoxLocator.press('Enter');
    console.error(`Filled search and pressed Enter for: ${employeeName}`);

    // --- THE FINAL, MOST ROBUST FIX ---

    // 1. Split the input name into parts.
    const nameParts = employeeName.split(' ');
    
    // 2. Create a locator for the link that contains ALL parts of the name.
    // This is the most flexible way to find the employee, regardless of "First, Last" or "Last, First" formatting.
    let employeeLinkLocator = page.getByRole('link');
    for (const part of nameParts) {
      employeeLinkLocator = employeeLinkLocator.filter({ hasText: part });
    }

    // 3. Wait for the link to be visible, then click it.
    await employeeLinkLocator.waitFor();
    console.error(`Found robust link for employee: ${employeeName}. Now clicking.`);
    await employeeLinkLocator.click();
    
    // ------------------------------------

    console.error(`Successfully navigated to the profile for employee: ${employeeName}.`);
    return `Successfully found and navigated to the profile for employee: ${employeeName} at ${companyName}.`;

  } catch (error: any) {
    console.error(`Failed to find employee ${employeeName}. Reason: ${error.message}`);
    if (page) {
        const screenshotPath = `error_screenshot_employee_${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.error(`Screenshot of the failure saved to: ${screenshotPath}`);
    }
    throw new Error(`Failed to find employee ${employeeName}. Reason: ${error.message}`);
  } finally {
    // Once this is working, you can uncomment this line.
    // if (browser) {
    //   await browser.close();
    // }
  }
}

export const mcpTools: McpTool[] = [
    {
        name: 'generate_enrollment_status_report',
        description: 'Logs into the Ease platform and generates an Enrollment Status report.',
        inputSchema: {
            companyName: z.string().describe('The name of the company to generate the report for.'),
            employeeName: z.string().optional(),
        },
        run: async ({ companyName }: { companyName: string }) => {
            const resultText = await generateEnrollmentStatusReport(companyName);
            return { content: [{ type: "text", text: resultText }] };
        },
    },
    {
        name: 'find_company',
        description: 'Searches for a company in Ease and navigates to their dashboard.',
        inputSchema: {
            companyName: z.string().describe('The name of the company to find.'),
            employeeName: z.string().optional(),
        },
        run: async ({ companyName }: { companyName: string }) => {
            const resultText = await findCompany(companyName);
            return { content: [{ type: "text", text: resultText }] };
        },
    },
    {
        name: 'find_employee',
        description: 'Finds an employee within a specific company, and navigates to their page.',
        inputSchema: {
            employeeName: z.string().describe('The name of the employee to find.'),
            companyName: z.string().describe('The company where the employee works.'),
        },
        run: async ({ employeeName, companyName }: { employeeName: string, companyName: string }) => {
            const resultText = await findEmployee(employeeName, companyName);
            return { content: [{ type: "text", text: resultText }] };
        },
    },
];