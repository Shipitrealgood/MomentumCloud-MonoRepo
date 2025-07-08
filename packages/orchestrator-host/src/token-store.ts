import fs from 'fs/promises';
import path from 'path';

// Define the shape of our token data
export interface TokenData {
    accessToken: string;
    refreshToken: string;
    instanceUrl: string;
}

const TOKEN_FILE_PATH = path.resolve(process.cwd(), 'token-storage.json');

/**
 * Saves the token data to a local JSON file.
 * @param tokens - The token data to save.
 */
export async function saveTokens(tokens: TokenData): Promise<void> {
    try {
        await fs.writeFile(TOKEN_FILE_PATH, JSON.stringify(tokens, null, 2));
        console.log('--> Tokens successfully saved to file.');
    } catch (error) {
        console.error('Error saving tokens:', error);
    }
}

/**
 * Reads the token data from the local JSON file.
 * @returns The token data, or null if the file doesn't exist or is empty.
 */
export async function readTokens(): Promise<TokenData | null> {
    try {
        const data = await fs.readFile(TOKEN_FILE_PATH, 'utf-8');
        return JSON.parse(data) as TokenData;
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            // File doesn't exist, which is fine on the first run.
            return null;
        }
        console.error('Error reading tokens:', error);
        return null;
    }
}