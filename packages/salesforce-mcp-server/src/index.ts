import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create the MCP Server instance
const server = new McpServer({
  name: "salesforce-server",
  version: "1.0.0",
});

// Define a placeholder tool for querying Salesforce contacts
server.registerTool(
  "query-contacts",
  {
    title: "Query Salesforce Contacts",
    description: "Retrieves a list of contacts from Salesforce",
    inputSchema: {
      accountName: z.string().describe("The name of the account to query contacts for."),
    },
  },
  async ({ accountName }) => {
    // In the future, this is where you would add your logic
    // to connect to Salesforce and query for contacts.
    console.log(`Querying Salesforce for contacts in account: ${accountName}`);

    // For now, return a dummy response
    const dummyContacts = [
      { name: "John Doe", email: "john.doe@example.com" },
      { name: "Jane Smith", email: "jane.smith@example.com" },
    ];

    return {
      content: [
        {
          type: "text",
          text: `Found contacts for ${accountName}: \n${JSON.stringify(dummyContacts, null, 2)}`,
        },
      ],
    };
  }
);

/**
 * Main function to connect the server to a transport.
 */
async function main() {
  // We will use Stdio transport for local communication between
  // the orchestrator and this server.
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Salesforce MCP Server running on stdio.");
}

main().catch((error) => {
  console.error("Salesforce Server failed to start:", error);
  process.exit(1);
});