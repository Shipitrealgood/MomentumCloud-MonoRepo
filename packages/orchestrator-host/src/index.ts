// packages/orchestrator-host/src/index.ts

import 'dotenv/config';
import { AgentService } from "./agentService.js";
import { SalesforceClientManager } from "./clients/salesforce-manager.js";
// We will add the Box manager here once it's built
// import { BoxClientManager } from "./clients/box-manager.js";

async function main() {
    console.log("Orchestrator starting...");
    
    try {
        // Initialize each client connection
        const salesforceClient = await SalesforceClientManager.create();
        // const boxClient = await BoxClientManager.create(); // <-- Future step

        // Create the agent service with the connected clients
        const agent = new AgentService(salesforceClient /*, boxClient */); // <-- Future step
        
        // Initialize the agent (discover tools, etc.)
        await agent.initialize();

        // Start the main application loop
        await agent.startChatLoop();

    } catch (error: any) {
        console.error("Orchestrator failed to start:", error.message);
        process.exit(1);
    }

    console.log("Chat session ended. Shutting down orchestrator.");
}

main();