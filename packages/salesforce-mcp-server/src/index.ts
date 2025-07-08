import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import jsforce from "jsforce";

// The server now expects the access token and instance URL to be passed in as arguments.
const [accessToken, instanceUrl] = process.argv.slice(2);

if (!accessToken || !instanceUrl) {
    console.error("Access token and instance URL must be provided as command-line arguments.");
    process.exit(1);
}

const server = new McpServer({
  name: "salesforce-server",
  version: "1.0.0",
});

// Helper to create a connection from a pre-authorized token
function getSalesforceConnection() {
  console.error("--> Creating Salesforce connection with provided access token.");
  return new jsforce.Connection({
    instanceUrl: instanceUrl,
    accessToken: accessToken,
  });
}

server.registerTool(
  "query-contacts",
  {
    title: "Query Salesforce Contacts",
    description: "Retrieves a list of contacts from a specific Salesforce Account.",
    inputSchema: {
      accountName: z.string().describe("The name of the account to query contacts for."),
    },
  },
  async ({ accountName }) => {
    try {
      const conn = getSalesforceConnection();
      console.error(`--> Querying for contacts where Account.Name = '${accountName}'`);

      const result = await conn.query<{ Name: string; Email: string | null; }>(
        `SELECT Name, Email FROM Contact WHERE Account.Name = '${accountName}' LIMIT 5`
      );

      if (result.totalSize === 0) {
        return { content: [{ type: "text", text: `No contacts found for account: ${accountName}` }] };
      }

      const contacts = result.records.map(r => ({ name: r.Name, email: r.Email }));

      return {
        content: [
          {
            type: "text",
            text: `Found ${result.totalSize} contact(s) for ${accountName}:\n${JSON.stringify(contacts, null, 2)}`,
          },
        ],
      };
    } catch (error: any) {
        console.error("--> Salesforce API Error:", error.message);
        return {
            content: [{ type: 'text', text: `Error querying Salesforce: ${error.message}` }],
            isError: true
        }
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Salesforce MCP Server running on stdio, waiting for requests...");
}

main().catch((error) => {
  console.error("Salesforce Server failed to start:", error);
  process.exit(1);
});