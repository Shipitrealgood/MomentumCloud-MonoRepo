import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { mcpTools } from './tools.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });
// Use console.error for logging
console.error(`.env path configured to: ${envPath}`);

const server = new McpServer({
  name: 'ease-mcp-server',
  version: '1.0.0',
});

for (const tool of mcpTools) {
  server.registerTool(
    tool.name,
    {
      title: tool.name.replace(/_/g, ' '),
      description: tool.description,
      inputSchema: tool.inputSchema,
    },
    async (args: any) => {
      try {
        return await tool.run(args);
      } catch (error: any) {
        // Use console.error for logging
        console.error(`Error executing tool '${tool.name}':`, error);
        return {
          content: [{
            type: 'text',
            text: `An error occurred: ${error.message}`
          }],
          isError: true,
        };
      }
    }
  );
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Use console.error for logging
  console.error('Ease MCP Server running on stdio, waiting for requests...');
}

main().catch((error) => {
  // Use console.error for logging
  console.error('Ease MCP Server failed to start:', error);
  process.exit(1);
});