// Artifact of totally working basic setup lives on previous commit.  These are active tool changes that we are making
// Added resource for contacts and have had some changes with query-contacts
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import jsforce from "jsforce";
import { ElicitResultSchema } from "@modelcontextprotocol/sdk/types.js";

// The server now expects the access token and instance URL to be passed in as arguments.
const { SALESFORCE_ACCESS_TOKEN: accessToken, SALESFORCE_INSTANCE_URL: instanceUrl } = process.env;

if (!accessToken || !instanceUrl) {
    console.error("SALESFORCE_ACCESS_TOKEN and SALESFORCE_INSTANCE_URL environment variables must be set.");
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

// *** NEW RESOURCE ***
// This new resource defines a "Contact" as a noun. Its only job is to read
// the details of a SINGLE contact when given a specific ID.
server.registerResource(
  "salesforce-contact",
  new ResourceTemplate("salesforce://contacts/{contactId}", {
    list: undefined
  }),
  {
    title: "Salesforce Contact",
    description: "Represents a single Salesforce Contact, allowing you to read its details."
  },
  async (uri, { contactId }) => {
    try {
      const singleContactId = Array.isArray(contactId) ? contactId[0] : contactId;
      if (!singleContactId) {
          throw new Error("Contact ID was not provided.");
      }
      const conn = getSalesforceConnection();
      console.error(`--> Reading Contact ID: '${singleContactId}'`);
      
      // --- START OF THE FIX ---

      // 1. Explicitly list all the fields you want to retrieve.
      const fieldsToRetrieve = ['Id', 'Name', 'Title', 'Email', 'Phone', 'Birthdate'];
      const contact = await conn.sobject('Contact').retrieve(singleContactId, { fields: fieldsToRetrieve }) as any;

      // 2. Add the Birthdate and Email to the returned details string.
      const contactDetails = `# Contact: ${contact.Name}\n\n**ID:** ${contact.Id}\n**Title:** ${contact.Title || 'N/A'}\n**Email:** ${contact.Email || 'N/A'}\n**Phone:** ${contact.Phone || 'N/A'}\n**Birthdate:** ${contact.Birthdate || 'N/A'}`;
      
      // --- END OF THE FIX ---

      return {
        contents: [{
          uri: uri.href,
          text: contactDetails,
          mimeType: 'text/markdown'
        }],
      };
    } catch (error: any) {
      console.error("--> Salesforce API Error:", error.message);
      throw new Error(`Error fetching Salesforce Contact: ${error.message}`);
    }
  }
);

server.registerTool(
  "find-contact-by-name",
  {
    title: "Find Contact by Name",
    description: "Searches for a specific contact by their full name to retrieve their unique Salesforce ID.",
    inputSchema: {
      fullName: z.string().describe("The full name of the contact to find (e.g., 'Tommy Tippee')."),
    },
    outputSchema: {
      contacts: z.array(z.object({
          id: z.string(),
          name: z.string(),
      }))
    }
  },
  async ({ fullName }) => {
    try {
      const conn = getSalesforceConnection();
      console.error(`--> TOOL: Searching for contact with name: '${fullName}'`);

      // --- START OF THE DEFINITIVE FIX ---

      // 1. Manually escape the input to prevent SOQL Injection.
      const sanitizedFullName = fullName.replace(/'/g, "\\'");

      // 2. Construct the query string with the sanitized input.
      const soqlQuery = `SELECT Id, Name FROM Contact WHERE Name LIKE '%${sanitizedFullName}%' LIMIT 5`;
      
      // 3. Execute the query.
      const result = await conn.query<{ Id: string; Name: string }>(soqlQuery);

      // --- END OF THE DEFINITIVE FIX ---

      if (result.totalSize === 0) {
        return { content: [{ type: "text", text: `No contact found matching the name: ${fullName}` }] };
      }

      const foundContacts = result.records.map(r => ({ id: r.Id, name: r.Name }));

      return {
        content: [
          {
            type: "text",
            text: `Found ${result.totalSize} contact(s) matching '${fullName}':\n${JSON.stringify(foundContacts, null, 2)}`,
          },
        ],
        structuredContent: {
            contacts: foundContacts
        }
      };
    } catch (error: any) {
      console.error("--> Salesforce API Error:", error.message);
      return {
        content: [{ type: 'text', text: `Error finding Salesforce contact: ${error.message}` }],
        isError: true
      }
    }
  }
);

server.registerTool(
  "add_employee",
  {
    title: "Add New Employee",
    description: "Creates a new employee record in Salesforce with the 'Employee' record type. Requires all key details to create the contact.",
    // Define the expected inputs with clear descriptions for the AI.
    inputSchema: {
      firstName: z.string().describe("The employee's first name."),
      lastName: z.string().describe("The employee's last name."),
      accountName: z.string().describe("The name of the company (Account) the employee belongs to. This must be an existing account in Salesforce."),
      hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format.").describe("The employee's hire date in YYYY-MM-DD format."),
      employmentType: z.enum(["Full-Time", "Part-Time", "Contractor"]).describe("The employee's type of employment."),
      employmentStatus: z.enum(["Active", "Onboarding", "Terminated"]).describe("The employee's current employment status."),
      email: z.string().email("Please provide a valid business email address.").describe("The employee's primary business email address."),
      relationship: z.enum(["Employee"]).describe("The relationship of the contact to the company. Must be 'Employee'."), //Dangerous to hard code this if we expand the tool to add dependents as well, but that should likely be it's own tool
      personalEmail: z.string().email("Please provide a valid personal email address.").optional().describe("The employee's personal email address."),
      phone: z.string().describe("The employee's primary phone number."),
      birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format.").describe("The employee's birthdate in YYYY-MM-DD format."),
      eid: z.string().describe("The unique Employee ID (EID) for the new employee."),
    },
  },
  async (args) => {
    try {
      const conn = getSalesforceConnection();
      console.error(`--> TOOL: Attempting to add new employee: ${args.firstName} ${args.lastName}`);

      // 1. Find the Account ID from the provided account name.
      const accountQuery = await conn.query<{ Id: string }>(`SELECT Id FROM Account WHERE Name = '${args.accountName}' LIMIT 1`);
      if (accountQuery.totalSize === 0) {
        return { content: [{ type: "text", text: `Error: Could not find an account named '${args.accountName}'.` }], isError: true };
      }
      const accountId = accountQuery.records[0].Id;

      // 2. Find the Record Type ID for your "Employee" contact type.
      //    This is cached in a real app, but for simplicity, we query it here.
      const recordTypeQuery = await conn.query<{ Id: string }>(`SELECT Id FROM RecordType WHERE SobjectType = 'Contact' AND Name = 'Employee' LIMIT 1`);
      if (recordTypeQuery.totalSize === 0) {
        return { content: [{ type: "text", text: `Error: Could not find the 'Employee' Contact Record Type in Salesforce.` }], isError: true };
      }
      const employeeRecordTypeId = recordTypeQuery.records[0].Id;
      
      // 3. Map the arguments to the Salesforce Contact object.
      //    IMPORTANT: Adjust the custom field API names (like 'Hire_Date__c') to match your Salesforce org.
      const newEmployeeData = {
        FirstName: args.firstName,
        LastName: args.lastName,
        AccountId: accountId,
        RecordTypeId: employeeRecordTypeId,
        Hire_Date__c: args.hireDate,
        Employment_Type__c: args.employmentType,
        Employment_Status__c: args.employmentStatus,
        Relationship__c: args.relationship,
        Email: args.email,
        Personal_Email__c: args.personalEmail,
        Phone: args.phone,
        Birthdate: args.birthdate,
        EID__c: args.eid,
      };

      // 4. Create the new contact record.
      const result = await conn.sobject('Contact').create(newEmployeeData);

      if (result.success) {
        return { content: [{ type: "text", text: `Successfully created new employee ${args.firstName} ${args.lastName} with ID: ${result.id}.` }] };
      } else {
        // Provide a detailed error if Salesforce rejects the creation.
        const errorMessage = `Failed to create employee. Salesforce error: ${result.errors.join(', ')}`;
        console.error("--> Salesforce API Error:", errorMessage);
        return { content: [{ type: 'text', text: errorMessage }], isError: true };
      }

    } catch (error: any) {
      console.error("--> Salesforce API Error:", error.message);
      return {
        content: [{ type: 'text', text: `An unexpected error occurred: ${error.message}` }],
        isError: true
      };
    }
  }
);

server.registerTool(
  "search_accounts",
  {
    title: "Search Salesforce Accounts",
    description: "Searches for Salesforce Accounts by name. Use this to find the exact name of an account when the user provides a partial or potentially misspelled name.",
    inputSchema: {
      accountName: z.string().describe("The full or partial name of the account to search for."),
    },
    outputSchema: {
      accounts: z.array(z.object({
          name: z.string(),
      }))
    }
  },
  async ({ accountName }) => {
    try {
      const conn = getSalesforceConnection();
      console.error(`--> TOOL: Searching for accounts with name like: '${accountName}'`);
      
      const sanitizedAccountName = accountName.replace(/'/g, "\\'");
      const soqlQuery = `SELECT Name FROM Account WHERE Name LIKE '%${sanitizedAccountName}%' LIMIT 5`;
      
      const result = await conn.query<{ Name: string }>(soqlQuery);

      if (result.totalSize === 0) {
        return { 
            content: [{ type: "text", text: `No accounts found matching '${accountName}'.` }],
            structuredContent: {
                accounts: []
            }
        };
      }

      const foundAccounts = result.records.map(r => ({ name: r.Name }));

      return {
        content: [
          {
            type: "text",
            text: `Found ${result.totalSize} account(s) matching '${accountName}':\n${JSON.stringify(foundAccounts, null, 2)}`,
          },
        ],
        structuredContent: {
            accounts: foundAccounts
        }
      };
    } catch (error: any) {
      console.error("--> Salesforce API Error:", error.message);
      return {
        content: [{ type: 'text', text: `Error searching Salesforce accounts: ${error.message}` }],
        isError: true
      };
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
    description: "Edits only the email or phone number of the contact.",
    inputSchema: {
      // **THE FIX**: A much clearer description for the parameter.
      contactId: z.string().describe("The unique 15 or 18-character Salesforce ID of the contact to edit. IMPORTANT: Do NOT use the contact's name; use the ID obtained from the 'query-contacts' tool."),
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
    "change_contact_employment_status",
    {
        title: "Change Contact Employment Status",
        description: "WARNING: High-impact action. Changes a contact's core employment status to 'Active' or 'Terminated'.",
        inputSchema: {
            contactId: z.string().describe("The unique 15 or 18-character Salesforce ID of the contact."),
            employmentStatus: z.enum(['Active', 'Terminated']).describe("The new employment status for the contact."),
            terminationType: z.enum(['Voluntary', 'Involuntary']).optional().describe("MUST be provided if employmentStatus is 'Terminated'."),
            employmentTermDate: z.string().optional().describe("The termination date in YYYY-MM-DD format. MUST be provided if employmentStatus is 'Terminated'."),
            reason: z.string().describe("A clear, required reason for the status change."),
        },
        annotations: {
            destructiveHint: true
        }
    },
    // The 'extra' parameter gives us access to sendRequest
    async ({ contactId, employmentStatus, terminationType, employmentTermDate, reason }, extra) => {
        try {
            // --- START OF THE CORRECTED CODE ---

            // 1. Manually construct and send the elicitation request using extra.sendRequest
            const confirmation = await extra.sendRequest({
                method: 'elicitation/create',
                params: {
                    message: `You are about to change the employment status for contact ID ${contactId} to "${employmentStatus}". This is a significant change. Are you sure you want to proceed?`,
                    requestedSchema: {
                        type: 'object',
                        properties: {
                            confirm: {
                                type: 'boolean',
                                title: 'Confirm Action'
                            }
                        },
                        required: ['confirm']
                    }
                }
            }, ElicitResultSchema);

            // 2. Check the user's response.
            if (confirmation.action !== 'accept' || !confirmation.content?.confirm) {
                return {
                    content: [{ type: "text", text: "Operation cancelled by the user." }],
                    isError: true
                };
            }

            // --- END OF THE CORRECTED CODE ---

            if (employmentStatus === 'Terminated' && (!employmentTermDate || !terminationType)) {
                return { content: [{ type: "text", text: "Termination failed. You must provide both an employmentTermDate and a terminationType when setting the status to 'Terminated'." }], isError: true };
            }

            const conn = getSalesforceConnection();
            const fieldsToUpdate: {
                Id: string;
                Employment_Status__c: string;
                Termination_Type__c?: string;
                Employment_Term_Date__c?: string;
                Description: string;
            } = {
                Id: contactId,
                Employment_Status__c: employmentStatus,
                Description: `Status changed on ${new Date().toISOString()}. Reason: ${reason}`
            };

            if (terminationType) fieldsToUpdate.Termination_Type__c = terminationType;
            if (employmentTermDate) fieldsToUpdate.Employment_Term_Date__c = employmentTermDate;

            console.error(`--> Updating employment status for Contact ID '${contactId}' to '${employmentStatus}'`);
            const result: any = await conn.sobject("Contact").update(fieldsToUpdate);

            if (result.success) {
                return { content: [{ type: "text", text: `Successfully updated employment status for Contact ID: ${contactId}.` }] };
            } else {
                return { content: [{ type: 'text', text: `Error updating status: ${JSON.stringify(result.errors)}` }], isError: true };
            }
        } catch (error: any) {
            console.error("--> Salesforce API Error:", error.message);
            return { content: [{ type: 'text', text: `Error changing contact status: ${error.message}` }], isError: true };
        }
    }
);

// Query restored to former glory.  Scary break earlier
server.registerTool(
  "query-contacts",
  {
    title: "Query Salesforce Contacts",
    description: "Retrieves a list of contacts, including their names, emails, and critically, their unique Salesforce IDs from a specific Salesforce Account.",
    inputSchema: {
      accountName: z.string().describe("The name of the account to query contacts for."),
    },
  },
  async ({ accountName }) => {
    try {
      const conn = getSalesforceConnection();
      console.error(`--> Querying for contacts where Account.Name = '${accountName}'`);

      // **THE FIX**: Add 'Id' to the query
      const result = await conn.query<{ Id: string; Name: string; Email: string | null; }>(
        `SELECT Id, Name, Email FROM Contact WHERE Account.Name = '${accountName}' LIMIT 5`
      );

      if (result.totalSize === 0) {
        return { content: [{ type: "text", text: `No contacts found for account: ${accountName}` }] };
      }

      // **THE FIX**: Add the 'id' to the returned data
      const contacts = result.records.map(r => ({ id: r.Id, name: r.Name, email: r.Email }));

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