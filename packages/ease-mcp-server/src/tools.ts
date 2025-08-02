import { z } from 'zod';
import { loginToEase } from './playwright-util.js';
import { Page, Browser } from 'playwright';

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

export const mcpTools = [
  {
    name: 'generate_enrollment_status_report',
    description: 'Logs into the Ease platform (ihhis.ease.com) and generates an Enrollment Status report.',
    inputSchema: {
      companyName: z.string().describe('The exact name of the company in Ease to generate the report for.'),
    },
    run: async ({ companyName }: { companyName: string }) => {
      const resultText = await generateEnrollmentStatusReport(companyName);
      return { content: [{ type: "text" as const, text: resultText }] };
    },
  },
];