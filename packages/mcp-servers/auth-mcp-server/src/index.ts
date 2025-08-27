import express from 'express';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { ProxyOAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/providers/proxyProvider.js';
import { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';
import { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import 'dotenv/config';

// --- (Keep all your existing variable declarations) ---
const {
    SALESFORCE_CLIENT_ID,
    SALESFORCE_CLIENT_SECRET,
    SALESFORCE_LOGIN_URL,
    SALESFORCE_CALLBACK_URL
} = process.env;

if (!SALESFORCE_CLIENT_ID || !SALESFORCE_CLIENT_SECRET || !SALESFORCE_CALLBACK_URL || !SALESFORCE_LOGIN_URL) {
    throw new Error("Salesforce OAuth credentials are not fully set in the .env file.");
}

const app = express();
const PORT = new URL(SALESFORCE_CALLBACK_URL).port;
const CALLBACK_PATH = new URL(SALESFORCE_CALLBACK_URL).pathname;

const thisMcpClient: OAuthClientInformationFull = {
    client_id: SALESFORCE_CLIENT_ID,
    client_secret: SALESFORCE_CLIENT_SECRET,
    redirect_uris: [SALESFORCE_CALLBACK_URL],
};

const salesforceAuthProvider = new ProxyOAuthServerProvider({
    endpoints: {
        authorizationUrl: `${SALESFORCE_LOGIN_URL}/services/oauth2/authorize`,
        tokenUrl: `${SALESFORCE_LOGIN_URL}/services/oauth2/token`,
        revocationUrl: `${SALESFORCE_LOGIN_URL}/services/oauth2/revoke`,
    },
    getClient: async (clientId: string): Promise<OAuthClientInformationFull | undefined> => {
        if (clientId === thisMcpClient.client_id) {
            return thisMcpClient;
        }
        return undefined;
    },
    verifyAccessToken: async (token: string): Promise<AuthInfo> => {
        console.log(`Verifying Salesforce token by calling UserInfo endpoint...`);
        const userInfoUrl = `${SALESFORCE_LOGIN_URL}/services/oauth2/userinfo`;

        try {
            const response = await fetch(userInfoUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`Salesforce token validation failed: ${response.status} ${errorBody}`);
                throw new Error('Invalid or expired Salesforce access token.');
            }

            // The token is valid if the request was successful.
            // You could optionally parse the response here to get user details if needed.
            // const userInfo = await response.json();

            return {
                token,
                clientId: thisMcpClient.client_id,
                scopes: ["api", "refresh_token"],
            };
        } catch (error: any) {
            console.error(`Error during Salesforce token verification: ${error.message}`);
            throw new Error('Failed to verify Salesforce access token.');
        }
    },
});

// The mcpAuthRouter sets up the necessary OAuth endpoints.
app.use(mcpAuthRouter({
    provider: salesforceAuthProvider,
    issuerUrl: new URL(`http://localhost:${PORT}`),
}));

// *** ADD THIS NEW ROUTE HANDLER ***
// This route handles the redirect back from Salesforce after the user logs in.
app.get(CALLBACK_PATH, (req, res) => {
    const code = req.query.code;
    if (code) {
        res.send("<h1>Authentication Successful!</h1><p>You can close this tab and return to your terminal. The authorization code has been captured in the URL.</p>");
    } else {
        res.status(400).send("<h1>Authentication Failed</h1><p>No authorization code was returned from Salesforce.</p>");
    }
});
// **********************************

app.listen(PORT, () => {
    console.log(`Auth MCP Server listening on http://localhost:${PORT}`);
});

// This is a simple heartbeat to keep the process alive and show that it's running.
setInterval(() => {
    console.log('Auth server is alive...');
}, 2000);