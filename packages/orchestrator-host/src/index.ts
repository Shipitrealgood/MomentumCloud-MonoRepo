import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CallToolResultSchema, ContentBlock } from "@modelcontextprotocol/sdk/types.js";
import path from "path";
import readline from "readline/promises";
import 'dotenv/config';
import crypto from 'crypto'; // Using Node.js's built-in crypto library

const {
    SALESFORCE_CLIENT_ID,
    SALESFORCE_CLIENT_SECRET,
    SALESFORCE_LOGIN_URL,
    SALESFORCE_CALLBACK_URL
} = process.env;

// --- PKCE Generation Functions ---
function base64URLEncode(str: Buffer) {
    return str.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}
function sha256(buffer: string) {
    return crypto.createHash('sha256').update(buffer).digest();
}

// --- Main Application Logic ---
class Orchestrator {
  private salesforceClient: Client | undefined;
  private sfAccessToken: string | undefined;
  private sfInstanceUrl: string | undefined;

  async start() {
    console.log("Orchestrator starting...");
    if (!SALESFORCE_CLIENT_ID || !SALESFORCE_CALLBACK_URL) {
      throw new Error("Salesforce environment variables are not fully set in your .env file.");
    }

    await this.authenticateWithSalesforce();

    if (!this.sfAccessToken || !this.sfInstanceUrl) {
      console.error("Authentication failed. Exiting.");
      return;
    }

    await this.startSalesforceServer();
    await this.listSalesforceTools();
    await this.callSalesforceTool();
  }

  async authenticateWithSalesforce() {
    console.log("\n--- Starting Salesforce Authentication ---");
    
    // Generate PKCE codes manually
    const code_verifier = base64URLEncode(crypto.randomBytes(32));
    const code_challenge = base64URLEncode(sha256(code_verifier));

    const authUrl = new URL(`${SALESFORCE_LOGIN_URL!}/services/oauth2/authorize`);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", SALESFORCE_CLIENT_ID!);
    authUrl.searchParams.set("redirect_uri", SALESFORCE_CALLBACK_URL!);
    authUrl.searchParams.set("code_challenge", code_challenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    console.log("\n--- ACTION REQUIRED ---");
    console.log("1. IMPORTANT: Please log out of Salesforce in your browser first, or use an Incognito/Private window.");
    console.log("2. Manually copy the full URL below and paste it into your browser's address bar:\n");
    console.log(authUrl.href);

    console.log("\n3. Log in to Salesforce. You will be redirected to a page that may show an error (this is okay).");
    console.log("4. Copy the entire URL from your browser's address bar after the redirect.");

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const redirectUrlString = await rl.question("\n5. Paste the entire redirected URL here: ");
    rl.close();
    
    let code: string | null;
    try {
        const redirectUrl = new URL(redirectUrlString);
        code = redirectUrl.searchParams.get("code");
    } catch(e) {
        throw new Error("Invalid URL pasted. Please try the process again.");
    }
    
    if (!code) {
      throw new Error("Could not find 'code' in the pasted URL. Please try the process again.");
    }

    console.log("\n--> Successfully extracted authorization code.");
    console.log("\nExchanging code for access token...");
    
    const tokenUrl = `${SALESFORCE_LOGIN_URL!}/services/oauth2/token`;
    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("client_id", SALESFORCE_CLIENT_ID!);
    params.append("client_secret", SALESFORCE_CLIENT_SECRET!);
    params.append("redirect_uri", SALESFORCE_CALLBACK_URL!);
    params.append("code_verifier", code_verifier);

    const response = await fetch(tokenUrl, { method: 'POST', body: params });
    const data = await response.json();

    if (!response.ok) {
        console.error("--- TOKEN EXCHANGE FAILED ---");
        console.error("Response Status:", response.status);
        console.error("Response Body:", data);
        throw new Error(`Failed to get access token: ${data.error_description}`);
    }

    this.sfAccessToken = data.access_token;
    this.sfInstanceUrl = data.instance_url;

    console.log("--- AUTHENTICATION SUCCESSFUL! ---");
  }

  async startSalesforceServer() {
    const salesforceServerPath = path.resolve(process.cwd(), "packages/salesforce-mcp-server/dist/index.js");
    const transport = new StdioClientTransport({
      command: "node",
      args: [salesforceServerPath, this.sfAccessToken!, this.sfInstanceUrl!],
    });
    this.salesforceClient = new Client({ name: "salesforce-client-in-orchestrator", version: "1.0.0" });
    await this.salesforceClient.connect(transport);
    console.log("\n--> Successfully connected to Salesforce MCP Server.");
  }

  async listSalesforceTools() {
    const tools = await this.salesforceClient!.listTools();
    console.log("Available Salesforce Tools:", tools.tools.map(t => t.name));
  }

  async callSalesforceTool() {
    console.log("\nCalling the 'query-contacts' tool...");
    const result = await this.salesforceClient!.callTool(
      { name: "query-contacts", arguments: { accountName: "Genesys Health Alliance" } },
      CallToolResultSchema
    );
    if (result.content && Array.isArray(result.content)) {
        const textContent = result.content.find((c: ContentBlock) => c.type === 'text');
        if (textContent && 'text' in textContent) {
            console.log("\nTool Result:", textContent.text);
        }
    }
  }
}

const orchestrator = new Orchestrator();
orchestrator.start().catch(error => {
    console.error("Orchestrator failed:", error.message);
});