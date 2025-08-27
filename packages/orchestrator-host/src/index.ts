// packages/orchestrator-host/src/index.ts

import 'dotenv/config';
import { AgentService } from "./agentService.js";
import { SalesforceClientManager } from "./clients/salesforce-manager.js";
// We will add the Box manager here once it's built
// import { BoxClientManager } from "./clients/box-manager.js";

// packages/orchestrator-host/src/index.ts

async function main() {
    console.log("Orchestrator starting...");
    
    // 1. Declare 'agent' here so it's accessible throughout the function
    let agent: AgentService | undefined;

    // 2. Define the shutdown function that needs access to 'agent'
    const gracefulShutdown = async (signal: string) => {
        console.log(`\nReceived ${signal}. Shutting down gracefully...`);
        if (agent) {
            await agent.cleanup();
        }
        process.exit(0);
    };

    // 3. Listen for shutdown signals for the entire process lifetime
    process.on('SIGINT', () => gracefulShutdown('SIGINT')); // Handles Ctrl+C
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // Handles 'kill' commands

    try {
        // Initialize each client connection
        const salesforceClient = await SalesforceClientManager.create();
        // const boxClient = await BoxClientManager.create(); // <-- Future step

        // 4. Assign the created instance to the 'agent' variable
        agent = new AgentService(salesforceClient /*, boxClient */); // <-- Future step

        // Start the main application loop
        await agent.startChatLoop();

    } catch (error: any) {
        // 5. Check for the specific error from readline when interrupted
        if (error && error.message && error.message.includes('Aborted')) {
            // This is an expected result of Ctrl+C, so we trigger the graceful shutdown
            await gracefulShutdown('SIGINT');
        } else {
            // This handles unexpected application errors
            console.error("Orchestrator failed to start:", error.message);
            if (agent) {
                await agent.cleanup(); // Attempt to clean up even on error
            }
            process.exit(1);
        }
    }

    console.log("Chat session ended. Shutting down orchestrator.");
}

main();