import { chromium } from 'playwright';

async function main() {
  console.log('Attempting to launch a browser...');
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log('Navigating to google.com...');
  await page.goto('https://google.com');

  console.log('Browser is open. Pausing script. Press Ctrl+C in the terminal to exit.');
  // This will keep the browser open until you manually close it or stop the script.
  await page.pause(); 
}

main();