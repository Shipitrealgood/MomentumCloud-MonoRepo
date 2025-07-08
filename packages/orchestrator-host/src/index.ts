import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CallToolResultSchema, ContentBlock } from "@modelcontextprotocol/sdk/types.js";
import path from "path";

class Orchestrator {
  private salesforceClient: Client;

  constructor() {
    this.salesforceClient = new Client({
      name: "salesforce-client-in-orchestrator",
      version: "1.0.0",
    });
  }

  async start() {
    console.log("Orchestrator starting...");

    const salesforceServerPath = path.resolve(
      process.cwd(),
      "packages/salesforce-mcp-server/dist/index.js"
    );

    const salesforceTransport = new StdioClientTransport({
      command: "node",
      args: [salesforceServerPath],
    });

    await this.salesforceClient.connect(salesforceTransport);
    console.log("Successfully connected to Salesforce MCP Server.");

    await this.listSalesforceTools();
    await this.callSalesforceTool();
  }

  async listSalesforceTools() {
    const tools = await this.salesforceClient.listTools();
    console.log("Available Salesforce Tools:", tools.tools.map(t => t.name));
  }

  async callSalesforceTool() {
    console.log("\nCalling the 'query-contacts' tool...");
    const result = await this.salesforceClient.callTool(
      {
        name: "query-contacts",
        arguments: { accountName: "ACME Corp" },
      },
      CallToolResultSchema
    );

    // FIX: Check if content exists and is an array before finding the text content.
    if (result.content && Array.isArray(result.content)) {
        // FIX: Explicitly type the parameter 'c' in the find callback.
        const textContent = result.content.find((c: ContentBlock) => c.type === 'text');

        // FIX: Check if textContent was found and is of the correct type before accessing 'text'.
        if (textContent && 'text' in textContent) {
            console.log("Tool Result:", textContent.text);
        }
    }
  }
}

const orchestrator = new Orchestrator();
orchestrator.start().catch(console.error);