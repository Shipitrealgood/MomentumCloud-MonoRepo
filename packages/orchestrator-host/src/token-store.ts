// packages/orchestrator-host/src/token-store.ts

import keytar from 'keytar';

// Define the shape of our token data
export interface TokenData {
    accessToken: string;
    refreshToken: string;
    instanceUrl: string;
}

// Use a unique service name for each application to avoid collisions in the keychain
const getServiceName = (service: 'salesforce' | 'box'): string => `mcp-orchestrator:${service}`;

/**
 * Securely saves the token data to the OS keychain.
 * @param service - The service the tokens are for (e.g., 'salesforce').
 * @param tokens - The token data to save.
 */
export async function saveTokens(service: 'salesforce' | 'box', tokens: TokenData): Promise<void> {
    const serviceName = getServiceName(service);
    try {
        // keytar stores passwords as strings. We will stringify our token object.
        await keytar.setPassword(serviceName, 'tokens', JSON.stringify(tokens));
        console.log(`--> Securely saved ${service} tokens to system keychain.`);
    } catch (error) {
        console.error(`Error saving ${service} tokens to keychain:`, error);
        // In a commercial app, you might want more robust error handling here.
    }
}

/**
 * Securely reads the token data from the OS keychain.
 * @param service - The service the tokens are for (e.g., 'salesforce').
 * @returns The token data, or null if not found.
 */
export async function readTokens(service: 'salesforce' | 'box'): Promise<TokenData | null> {
    const serviceName = getServiceName(service);
    try {
        const tokenString = await keytar.getPassword(serviceName, 'tokens');
        if (tokenString) {
            console.log(`--> Successfully retrieved ${service} tokens from system keychain.`);
            return JSON.parse(tokenString) as TokenData;
        }
        console.log(`--> No ${service} tokens found in system keychain.`);
        return null;
    } catch (error) {
        // This can happen if no OS credential store is available. We treat it as "no tokens found".
        console.error(`Could not read ${service} tokens from keychain:`, error);
        return null;
    }
}