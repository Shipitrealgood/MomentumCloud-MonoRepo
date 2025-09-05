// packages/mcp-servers/ease-mcp-server/src/syncDataTest.ts

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { EaseApp } from './automation-lib/index.js';
import { CensusActions } from './automation-lib/workflows/actions/census.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

async function runSyncDataTest() {
  const companyNameToTest = "in his hands insurance services";

  if (!process.env.EASE_EMAIL || !process.env.EASE_PASSWORD) {
    throw new Error("Ease credentials must be set in the .env file.");
  }

  const easeApp = new EaseApp();

  try {
    await easeApp.login();

    // Call the new high-level workflow
    const results = await CensusActions.synchronizeCompanyData(easeApp.page!, companyNameToTest);
    
    console.log("\n✅ Test completed successfully!");
    console.log("--- Reconciliation Summary ---");
    console.log(JSON.stringify(results, null, 2));
    console.log("----------------------------");
    console.log("Check your database using 'npm run db:studio' to see the synchronized employees.");

  } catch (error) {
    console.error("\n❌ Test failed:", error);
    if (easeApp.page) {
        const errorShot = `sync_data_error_${Date.now()}.png`;
        await easeApp.page.screenshot({ path: errorShot });
        console.error(`Error screenshot saved to ${errorShot}`);
    }
  } finally {
    await easeApp.close();
  }
}

runSyncDataTest();