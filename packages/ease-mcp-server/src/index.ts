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

const server = new McpServer({
  name: 'ease-mcp-server',
  version: '1.0.0',
});

// This clean loop now correctly registers all tools from tools.ts
for (const tool of mcpTools) {
  server.registerTool(
    tool.name,
    {
      title: tool.name.replace(/_/g, ' '),
      description: tool.description,
      inputSchema: tool.inputSchema,
    },
    // The change is here: We pass the pre-typed run function directly.
    tool.run
  );
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Ease MCP Server running on stdio, waiting for requests...');
}

main().catch((error) => {
  console.error('Ease MCP Server failed to start:', error);
  process.exit(1);
});