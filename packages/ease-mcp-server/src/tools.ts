import { z, ZodRawShape } from 'zod';
import { loginToEase } from './playwright-util.js';
import { Page, Browser, Locator } from 'playwright';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import * as finders from './playwright-finders.js';

export interface McpTool {
  name: string;
  description: string;
  inputSchema: ZodRawShape;
  run: (args: any) => Promise<CallToolResult>;
}

// Helper function to select the correct finder based on a string input.
// This acts as a router to our finder library.
async function getFinder(page: Page, fieldName: string): Promise<Locator | null> {
    switch (fieldName.toLowerCase()) {
        case 'birth date':
            return await finders.findBirthDateField(page);
        case 'ssn':
            return await finders.findSSNField(page);
        // Add more cases to map field names to finder functions
        default:
            return null;
    }
}

async function getEmployeeField(employeeName: string, companyName: string, fieldToGet: string): Promise<string> {
    const { EASE_EMAIL, EASE_PASSWORD, EASE_2FA_SECRET } = process.env;
    if (!EASE_EMAIL || !EASE_PASSWORD) throw new Error("Ease credentials not set.");

    let browser: Browser | undefined, page: Page | undefined;
    try {
        ({ page, browser } = await loginToEase(EASE_EMAIL, EASE_PASSWORD, EASE_2FA_SECRET));
        console.error("Login successful. Starting navigation...");

        // --- Main Navigation Logic with Logging ---
        await page.getByRole('link', { name: 'Companies', exact: true }).click();
        console.error("Clicked on 'Companies' link.");

        const companyLink = page.getByRole('link', { name: companyName });
        await companyLink.waitFor();
        console.error(`Found company link for "${companyName}".`);

        await companyLink.click();
        console.error(`Clicked on company link for "${companyName}".`);

        await page.getByRole('link', { name: 'Employees', exact: true }).click();
        console.error("Clicked on 'Employees' link.");

        const searchBox = page.getByRole('textbox', { name: /Searching \d+ employees/i });
        await searchBox.fill(employeeName);
        console.error(`Filled search box with "${employeeName}".`);

        await searchBox.press('Enter');
        console.error("Pressed Enter in search box.");

        let employeeLink = page.getByRole('link');
        employeeName.split(' ').forEach(part => employeeLink = employeeLink.filter({ hasText: part }));
        await employeeLink.waitFor();
        console.error(`Found employee link for "${employeeName}".`);

        await employeeLink.click();
        console.error(`Clicked on employee link for "${employeeName}". Now on profile page.`);
        
        // --- Tab Navigation Logic with Logging ---
        await page.getByRole('link', { name: 'Profile' }).click();
        console.error("Clicked on 'Profile' tab.");

        await page.getByRole('link', { name: 'Personal' }).click();
        console.error("Clicked on 'Personal' tab. Now attempting to find the field.");

        // Step 1: Find the field locator using our simpler library
        const fieldLocator = await getFinder(page, fieldToGet);
        if (!fieldLocator) {
            console.error(`Error: Finder function not found for "${fieldToGet}".`);
            return `Error: The tool is not configured to find the field "${fieldToGet}".`;
        }
        console.error(`Finder returned a locator for "${fieldToGet}".`);

        // Step 2: Act on the locator to get the data
        const extractedData = await fieldLocator.inputValue();
        console.error(`Successfully extracted data: "${extractedData}".`);

        if (extractedData === null || extractedData.trim() === '') {
            return `Could not find data for the field "${fieldToGet}". The field might be empty.`;
        }
        
        return `For ${employeeName}, the value of "${fieldToGet}" is: ${extractedData}`;
    } catch (error: any) {
        // This will now catch the specific failing step
        console.error(`CRITICAL ERROR in getEmployeeField for "${fieldToGet}":`, error);
        if (page) {
            const screenshotPath = `error_screenshot_getField_${Date.now()}.png`;
            await page.screenshot({ path: screenshotPath, fullPage: true });
            console.error(`Screenshot saved to ${screenshotPath}`);
        }
        return `Tool failed: An error occurred while trying to get the field "${fieldToGet}". Reason: ${error.message}`;
    } finally {
        if (browser) {
            console.error("Closing browser session.");
            await browser.close();
        }
    }
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

async function getEmployeeInformation(employeeName: string, companyName: string, fieldToFind: string): Promise<string> {
    const { EASE_EMAIL, EASE_PASSWORD, EASE_2FA_SECRET } = process.env;
    if (!EASE_EMAIL || !EASE_PASSWORD) {
        throw new Error("Ease credentials could not be loaded from .env file.");
    }

    let browser: Browser | undefined;
    let page: Page | undefined;
    try {
        // Step 1: This tool will handle its own login and navigation.
        console.error(`Starting to get info for ${employeeName} at ${companyName}.`);
        ({ page, browser } = await loginToEase(EASE_EMAIL, EASE_PASSWORD, EASE_2FA_SECRET));

        // Step 2: Navigate to the employee's profile page using our existing, working logic.
        await page.getByRole('link', { name: 'Companies', exact: true }).click();
        const companyLinkLocator = page.getByRole('link', { name: companyName });
        await companyLinkLocator.waitFor();
        await companyLinkLocator.click();
        await page.getByRole('link', { name: 'Employees', exact: true }).click();
        
        const searchBoxLocator = page.getByRole('textbox', { name: /Searching \d+ employees/i });
        await searchBoxLocator.fill(employeeName);
        await searchBoxLocator.press('Enter');

        let employeeLinkLocator = page.getByRole('link');
        for (const part of employeeName.split(' ')) {
            employeeLinkLocator = employeeLinkLocator.filter({ hasText: part });
        }
        await employeeLinkLocator.waitFor();
        await employeeLinkLocator.click();
        console.error(`Successfully navigated to profile for ${employeeName}.`);

        // Step 3: Now on the profile, dynamically find the requested information.
        console.error(`Dynamically searching for field: "${fieldToFind}"`);
        const pageContent = await page.accessibility.snapshot();

        // NOTE: This is a placeholder for a real LLM call (e.g., to OpenAI or Anthropic).
        const extractedData = await fakeLlmCall(pageContent, fieldToFind);

        if (!extractedData) {
            return `Could not dynamically find the field "${fieldToFind}" on the page for ${employeeName}.`;
        }
        
        return `For ${employeeName}, found "${fieldToFind}": ${extractedData}`;

    } catch (error: any) {
        throw new Error(`An error occurred while getting employee information: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close(); // This tool should clean up after itself.
        }
    }
}

// You can add this placeholder function as well for now.
async function fakeLlmCall(pageContent: any, fieldToFind: string): Promise<string | null> {
    console.error(`--- Internal LLM Call Simulation ---`);
    console.error(`Searching for "${fieldToFind}" in page content...`);
    const findInTree = (node: any): string | null => {
        if (node.name && node.name.toLowerCase().includes(fieldToFind.toLowerCase()) && node.children) {
            const nextNode = node.children.find((child: any) => child.role === 'text' || child.value);
            return nextNode ? (nextNode.value || nextNode.name) : 'Found label but could not find value.';
        }
        if (node.children) {
            for (const child of node.children) {
                const result = findInTree(child);
                if (result) return result;
            }
        }
        return null;
    };
    return findInTree(pageContent);
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

        // *** REGISTER THE NEW, GRANULAR TOOLS ***
    {
        name: 'get_employee_field',
        description: 'Gets a specific field of information (e.g., "Birth Date") from an employee\'s profile.',
        inputSchema: {
            employeeName: z.string().describe('The full name of the employee.'),
            companyName: z.string().describe('The company where the employee works.'),
            fieldToGet: z.string().describe('The name of the field to retrieve (e.g., "Birth Date", "SSN").'),
        },
        run: async (args) => {
            const resultText = await getEmployeeField(args.employeeName, args.companyName, args.fieldToGet);
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

        {
        name: 'get_employee_information',
        description: 'Dynamically finds and returns specific information (like "Birth Date") from an employee\'s profile page.',
        inputSchema: {
            employeeName: z.string().describe('The name of the employee to find.'),
            companyName: z.string().describe('The company where the employee works.'),
            fieldToFind: z.string().describe('The label of the information to find on the page (e.g., "Birth Date").'),
        },
        run: async ({ employeeName, companyName, fieldToFind }: { employeeName: string, companyName: string, fieldToFind: string }) => {
            const resultText = await getEmployeeInformation(employeeName, companyName, fieldToFind);
            return { content: [{ type: "text", text: resultText }] };
        },
    },
];