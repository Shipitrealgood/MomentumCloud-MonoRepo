// packages/orchestrator-host/src/clients/salesforce-manager.ts

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";
import { fileURLToPath } from 'url';
import readline from "readline/promises";
import crypto from 'crypto';
import { readTokens, saveTokens, TokenData } from "../token-store.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const {
    SALESFORCE_CLIENT_ID,
    SALESFORCE_CLIENT_SECRET,
    SALESFORCE_LOGIN_URL,
    SALESFORCE_CALLBACK_URL
} = process.env;

// PKCE Helper Functions
function base64URLEncode(str: Buffer) { return str.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''); }
function sha256(buffer: string) { return crypto.createHash('sha256').update(buffer).digest(); }

export class SalesforceClientManager {
    private client!: Client;
    private accessToken!: string;
    private instanceUrl!: string;

    private constructor() {}

    public static async create(): Promise<Client> {
        const manager = new SalesforceClientManager();
        await manager.initialize();
        return manager.client;
    }

    private async initialize() {
        if (!SALESFORCE_CLIENT_ID || !SALESFORCE_CLIENT_SECRET || !SALESFORCE_LOGIN_URL || !SALESFORCE_CALLBACK_URL) {
            throw new Error("Salesforce environment variables are not set.");
        }
        
        await this.initializeTokens();
        
        if (!this.accessToken || !this.instanceUrl) {
            throw new Error("Salesforce authentication failed.");
        }
        
        await this.startServer();
    }

    private async initializeTokens() {
        let tokens = await readTokens('salesforce');
        if (tokens) {
            console.log("Found stored Salesforce tokens. Attempting to refresh...");
            tokens = await this.refreshAccessToken(tokens.refreshToken);
        }
        if (!tokens) {
            console.log("No valid Salesforce tokens found. Starting manual login process.");
            tokens = await this.performManualLogin();
        }
        if (tokens) {
            this.accessToken = tokens.accessToken;
            this.instanceUrl = tokens.instanceUrl;
            console.log("\n--- Salesforce Authentication successful! ---");
        }
    }
    
    private async startServer() {
    const serverPath = path.resolve(__dirname, "../../../salesforce-mcp-server/dist/index.js");

    const transport = new StdioClientTransport({
        command: "node",
        args: [serverPath],
        env: {
            ...process.env,
            SALESFORCE_ACCESS_TOKEN: this.accessToken,
            SALESFORCE_INSTANCE_URL: this.instanceUrl,
        }
    });

    this.client = new Client({ name: "salesforce-client-in-orchestrator", version: "1.0.0" });
    await this.client.connect(transport);
    console.log("--> Successfully connected to Salesforce MCP Server.");
}
    
    private async refreshAccessToken(refreshToken: string): Promise<TokenData | null> {
        console.log("--> Requesting new access token using refresh token...");
        const tokenUrl = `${SALESFORCE_LOGIN_URL!}/services/oauth2/token`;
        const params = new URLSearchParams();
        params.append("grant_type", "refresh_token");
        params.append("refresh_token", refreshToken);
        params.append("client_id", SALESFORCE_CLIENT_ID!);
        params.append("client_secret", SALESFORCE_CLIENT_SECRET!);
        
        try {
            const response = await fetch(tokenUrl, { method: 'POST', body: params });
            const data = await response.json();

            if (!response.ok) {
                console.error("Could not refresh token:", data.error_description);
                return null;
            }

            const newTokens: TokenData = {
                accessToken: data.access_token,
                refreshToken: data.refresh_token || refreshToken,
                instanceUrl: data.instance_url,
            };
            await saveTokens('salesforce', newTokens);
            return newTokens;
        } catch (error) {
            console.error("Error during token refresh:", error);
            return null;
        }
    }

    private async performManualLogin(): Promise<TokenData | null> {
        console.log("\n--- Starting Salesforce Manual Authentication ---");
        
        const code_verifier = base64URLEncode(crypto.randomBytes(32));
        const code_challenge = base64URLEncode(sha256(code_verifier));

        const authUrl = new URL(`${SALESFORCE_LOGIN_URL!}/services/oauth2/authorize`);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("client_id", SALESFORCE_CLIENT_ID!);
        authUrl.searchParams.set("redirect_uri", SALESFORCE_CALLBACK_URL!);
        authUrl.searchParams.set("code_challenge", code_challenge);
        authUrl.searchParams.set("code_challenge_method", "S256");
        
        console.log("\nACTION REQUIRED:");
        console.log("1. Manually copy and paste the following URL into your browser:\n");
        console.log(authUrl.href);
        
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const redirectUrlString = await rl.question("\n2. Paste the entire redirected URL here: ");
        rl.close();

        let code: string | null;
        try {
            code = new URL(redirectUrlString).searchParams.get("code");
        } catch (e) {
            console.error("Invalid URL pasted.");
            return null;
        }

        if (!code) {
            console.error("Could not find 'code' in the pasted URL.");
            return null;
        }

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
            console.error("Failed to get access token:", data.error_description);
            return null;
        }

        const tokens: TokenData = {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            instanceUrl: data.instance_url,
        };
        await saveTokens('salesforce', tokens);
        return tokens;
    }
}