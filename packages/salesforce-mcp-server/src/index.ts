import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
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

server.registerResource(
  "salesforce-account",
  new ResourceTemplate("salesforce://accounts/{accountName}", {
    list: async () => {
      const conn = getSalesforceConnection();
      const result = await conn.query<{ Name: string }>("SELECT Name FROM Account LIMIT 10");
      return {
        resources: result.records.map(r => ({
          name: r.Name,
          uri: `salesforce://accounts/${encodeURIComponent(r.Name)}`,
          description: `Salesforce Account: ${r.Name}`
        }))
      };
    },
    complete: {
      accountName: async (value: string) => {
        if (!value) return [];
        const conn = getSalesforceConnection();
        const result = await conn.query<{ Name: string }>(`SELECT Name FROM Account WHERE Name LIKE '${value}%' LIMIT 10`);
        return result.records.map(r => r.Name);
      }
    }
  }),
  {
    title: "Salesforce Account",
    description: "Represents a single Salesforce Account, allowing you to read its details."
  },
  async (uri, { accountName }) => {
    try {
      // --- START OF THE FIX ---
      
      // 1. Check if accountName is an array. If so, take the first item. If not, use it as is.
      const singleAccountName = Array.isArray(accountName) ? accountName[0] : accountName;

      // 2. We must handle the case where the name might be missing after our check.
      if (!singleAccountName) {
        throw new Error("Account name provided was empty or invalid.");
      }
      
      // 3. Now we can safely decode the single name.
      const decodedAccountName = decodeURIComponent(singleAccountName);

      // --- END OF THE FIX ---

      const conn = getSalesforceConnection();
      console.error(`--> Querying for Account: '${decodedAccountName}'`);

      const result = await conn.query<{ Id: string; Name: string; Industry: string | null; Phone: string | null; Website: string | null; }>(
        `SELECT Id, Name, Industry, Phone, Website FROM Account WHERE Name = '${decodedAccountName}' LIMIT 1`
      );

      if (result.totalSize === 0) {
        throw new Error(`Account not found: ${decodedAccountName}`);
      }

      const account = result.records[0];
      const accountDetails = `# Account: ${account.Name}\n\n**ID:** ${account.Id}\n**Industry:** ${account.Industry || 'N/A'}\n**Phone:** ${account.Phone || 'N/A'}\n**Website:** ${account.Website || 'N/A'}`;

      return {
        contents: [{
            uri: uri.href,
            text: accountDetails,
            mimeType: 'text/markdown'
        }],
      };
    } catch (error: any) {
      console.error("--> Salesforce API Error:", error.message);
      throw new Error(`Error fetching Salesforce Account: ${error.message}`);
    }
  }
);

server.registerTool(
    "get_account_info",
    {
        title: "Get Salesforce Account Info",
        description: "Retrieves specific information (like phone number or industry) for a Salesforce Account.",
        inputSchema: {
            accountName: z.string().describe("The name of the account to query."),
            fields: z.array(z.string()).describe("The specific fields to retrieve (e.g., ['Phone', 'Industry'])."),
        },
    },
    async ({ accountName, fields }) => {
        try {
            const conn = getSalesforceConnection();
            console.error(`--> TOOL: Getting fields '${fields.join(', ')}' for Account: '${accountName}'`);

            const soql = `SELECT ${fields.join(', ')} FROM Account WHERE Name = '${accountName}' LIMIT 1`;
            const result = await conn.query(soql);

            if (result.totalSize === 0) {
                return { content: [{ type: "text", text: `Account not found: ${accountName}` }], isError: true };
            }

            const account = result.records[0];
            const response = fields.map(field => `${field}: ${account[field] || 'N/A'}`).join('\n');
            
            return {
                content: [{
                    type: "text",
                    text: response,
                }],
            };
        } catch (error: any) {
            console.error("--> Salesforce API Error:", error.message);
            return {
                content: [{ type: 'text', text: `Error fetching Salesforce Account: ${error.message}` }],
                isError: true
            };
        }
    }
);

server.registerTool(
  "edit-contact",
  {
    title: "Edit Salesforce Contact",
    description: "Edits the details of an existing contact in Salesforce.  Use contactId for ID",
    inputSchema: {
      contactId: z.string().describe("The ID of the contact to edit."),
      email: z.string().optional().describe("The new email address for the contact."),
      phone: z.string().optional().describe("The new phone number for the contact."),
    },
  },
  async ({ contactId, email, phone }) => {
    try {
        const conn = getSalesforceConnection();
        const fieldsToUpdate: { Id: string; Email?: string; Phone?: string } = { Id: contactId };
        if (email) fieldsToUpdate.Email = email;
        if (phone) fieldsToUpdate.Phone = phone;

        if (Object.keys(fieldsToUpdate).length === 1) {
            return { content: [{ type: "text", text: "No new information provided to update." }], isError: true };
        }

        console.error(`--> Editing Contact ID '${contactId}' with new data.`);
        const result: any = await conn.sobject("Contact").update(fieldsToUpdate);

        if (result.success) {
            return { content: [{ type: "text", text: `Successfully updated Contact ID: ${contactId}` }] };
        } else {
            return { content: [{ type: 'text', text: `Error updating Contact: ${JSON.stringify(result.errors)}` }], isError: true };
        }
    } catch (error: any) {
        console.error("--> Salesforce API Error:", error.message);
        return { content: [{ type: 'text', text: `Error updating Salesforce Contact: ${error.message}` }], isError: true };
    }
  }
);

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