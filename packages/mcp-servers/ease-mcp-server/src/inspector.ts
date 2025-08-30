import { loginToEase } from './playwright-util.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from the .env file in the package root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

/**
 * This is a special script for debugging and using the Playwright Inspector.
 * It logs into Ease and then pauses indefinitely, allowing you to explore the
 * authenticated site with the Inspector open to find element locators.
 */
async function main() {
  const { EASE_EMAIL, EASE_PASSWORD, EASE_2FA_SECRET } = process.env;

  if (!EASE_EMAIL || !EASE_PASSWORD) {
    console.error("Ease credentials (EASE_EMAIL, EASE_PASSWORD) must be set in the .env file.");
    process.exit(1);
  }

  console.log("--- Starting Playwright Inspector Session ---");
  console.log("Logging into Ease...");

  // We are not capturing the browser/page instances here because
  // the 'pause' command will prevent the script from ever proceeding.
  const { page } = await loginToEase(EASE_EMAIL, EASE_PASSWORD, EASE_2FA_SECRET);

  console.log("\n✅ Login successful! Browser is now paused.");
  console.log("The Playwright Inspector window should be open.");
  console.log("Use the 'Pick Locator' button in the Inspector to find elements.");
  console.log("Press Ctrl+C in this terminal to end the session when you are finished.");

  // This is the key command. It pauses script execution indefinitely,
  // keeping the browser open for you to interact with.
  await page.pause();
}

main().catch((error) => {
  console.error('Failed to launch inspector session:', error);
  process.exit(1);
});
