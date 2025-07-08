import express from 'express';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { ProxyOAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/providers/proxyProvider.js';
import { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';
import { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';

const app = express();
const PORT = process.env.PORT || 3001;

// This is where you would securely store and retrieve your client credentials.
// For this example, we are using a simple in-memory object.
const salesforceClientStore: Record<string, OAuthClientInformationFull> = {};

const salesforceAuthProvider = new ProxyOAuthServerProvider({
    // These are Salesforce's standard OAuth endpoints.
    endpoints: {
        authorizationUrl: "https://login.salesforce.com/services/oauth2/authorize",
        tokenUrl: "https://login.salesforce.com/services/oauth2/token",
        revocationUrl: "https://login.salesforce.com/services/oauth2/revoke",
    },
    // This function will be called to verify the access token from Salesforce.
    // You would typically use Salesforce's user info endpoint here.
    verifyAccessToken: async (token: string): Promise<AuthInfo> => {
        console.log(`Verifying token: ${token.substring(0, 10)}...`);
        // Placeholder: In a real app, you would call Salesforce's user info endpoint.
        // For now, we'll return a mock AuthInfo object.
        return {
            token,
            clientId: "MOCKED_CLIENT_ID",
            scopes: ["api", "refresh_token"],
        };
    },
    // This function retrieves the registered client information.
    getClient: async (clientId: string): Promise<OAuthClientInformationFull | undefined> => {
        return salesforceClientStore[clientId];
    },
});


// The mcpAuthRouter sets up all the necessary OAuth endpoints for you.
app.use(mcpAuthRouter({
    provider: salesforceAuthProvider,
    issuerUrl: new URL(`http://localhost:${PORT}`), // This server's URL
}));

app.listen(PORT, () => {
    console.log(`Auth MCP Server listening on http://localhost:${PORT}`);
});