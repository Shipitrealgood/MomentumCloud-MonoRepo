import { chromium, Page, Browser } from 'playwright';
import { authenticator } from 'otplib';  // Stick with authenticator for simplicity
import { HashAlgorithms } from '@otplib/core';  // Import HashAlgorithms from core package

export async function loginToEase(
  email: string,
  password: string,
  twoFactorSecret?: string
): Promise<{ page: Page; browser: Browser }> {
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto('https://ihhis.ease.com');

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
    throw error;
  }
}

async function handle2FA(page: Page, secret: string) {
  console.error('On 2FA page, attempting to enter code...');
  const tokenInputSelector = '#mfaCode';
  const submitButtonSelector = 'button:has-text("Verify & Log In")';
  
  await page.waitForSelector(tokenInputSelector, { timeout: 15000 });
  
  // Clean the secret (remove spaces, ensure uppercase - base32 is case-insensitive but consistent)
  const cleanedSecret = secret.replace(/\s/g, '').toUpperCase();
  
  // Set TOTP options explicitly (start with defaults, but we can tweak)
  authenticator.options = {
    digits: 6,          // Standard, but confirm if site uses 8 or other
    step: 30,           // Time window in seconds
    algorithm: HashAlgorithms.SHA1,  // Try this first; swap to HashAlgorithms.SHA512 if tokens still don't match after verification
    // window: 1,       // Optional: tolerance for clock skew (1 means ±30s); uncomment if needed
  };

  const generationTime = new Date().toISOString();  // Log exact time for comparison
  const token = authenticator.generate(cleanedSecret);
  console.error("Generated OTP for login (redacted).");

  await page.fill(tokenInputSelector, token);
  // Optional small delay if token is on the edge of expiration
  // await page.waitForTimeout(1000);
  await page.click('button:has-text("Verify & Log In")');

  console.error('Login submitted successfully.');
}