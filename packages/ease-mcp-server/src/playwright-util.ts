import { chromium, Page, Browser } from 'playwright';
import { authenticator } from 'otplib';

export async function loginToEase(
  email: string,
  password: string,
  twoFactorSecret?: string
): Promise<{ page: Page; browser: Browser }> {
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto('https://ihhis.ease.com');

    // Use console.error for logging
    console.error('Filling in login details...');
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('button:has-text("Login")');

    if (twoFactorSecret) {
      await handle2FA(page, twoFactorSecret);
    } else {
      await page.waitForLoadState('networkidle');
    }
    
    console.error('Login and 2FA process submitted successfully.');
    return { page, browser };

  } catch (error) {
    console.error("A critical error occurred during the login process:", error);
    if (page) {
        const screenshotPath = `critical_login_error_${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.error(`Screenshot of the error saved to: ${screenshotPath}`);
    }
    // Do not close the browser in case of an error during debug
    throw error;
  }
}

async function handle2FA(page: Page, secret: string) {
  // Use console.error for logging
  console.error('On 2FA page, attempting to enter code...');
  
  const tokenInputSelector = '#mfaCode';
  const submitButtonSelector = 'button:has-text("Verify & Log In")';
  
  await page.waitForSelector(tokenInputSelector, { timeout: 15000 });
  const token = authenticator.generate(secret);
  
  console.error(`Generated 2FA Code: ${token}`);
  await page.fill(tokenInputSelector, token);
  await page.click(submitButtonSelector);

  console.error('Login submitted. Pausing to inspect the dashboard...');
  await page.pause();
}