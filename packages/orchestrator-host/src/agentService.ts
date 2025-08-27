// packages/orchestrator-host/src/agentService.ts

import { GoogleGenAI, mcpToTool, Content } from "@google/genai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import readline from "readline/promises";

// This helper interface remains the same
interface TextContentBlock {
    type: 'text';
    text: string;
}
function isTextContentBlock(block: any): block is TextContentBlock {
    return block && block.type === 'text' && typeof block.text === 'string';
}


export class AgentService {
    private ai: GoogleGenAI;
    private mcpClients: Client[] = [];

    constructor(...clients: Client[]) {
        this.mcpClients = clients.filter(c => c);

        const project = process.env.GOOGLE_CLOUD_PROJECT;
        const location = process.env.GOOGLE_CLOUD_LOCATION;

        if (!process.env.GOOGLE_GENAI_USE_VERTEXAI || !project || !location) {
            throw new Error("Vertex AI environment variables (GOOGLE_GENAI_USE_VERTEXAI, GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION) must be set.");
        }
        
        this.ai = new GoogleGenAI({
            vertexai: true,
            project: project,
            location: location,
        });
    }

    public async startChatLoop() {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        console.log("\n💬 C.A.L.I.A. (powered by Gemini on Vertex AI) is ready. Type 'quit' to exit.");

        const mcpTools = this.mcpClients.map(client => mcpToTool(client));

        const history: Content[] = [
            { role: 'user', parts: [{ text: this.constructSystemPrompt() }] },
            { role: 'model', parts: [{ text: "Understood. I am ready to assist in anyway I can. How can I help you today?" }] }
        ];

        while (true) {
            const userInput = await rl.question("You: ");
            if (userInput.toLowerCase() === 'quit') break;

            history.push({ role: 'user', parts: [{ text: userInput }] });

            console.log(`🤖 Thinking...`);
            
            const result = await this.ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: history,
                config: {
                    tools: mcpTools,
                }
            });

            const response = result;
            const modelResponseContent = response.candidates?.[0]?.content;
            
            if (modelResponseContent) {
                history.push(modelResponseContent);
                
                // FIXED: Added a nested check to ensure the 'parts' array exists and is not empty
                // before trying to access its contents. This resolves the final TypeScript error.
                if (modelResponseContent.parts && modelResponseContent.parts.length > 0) {
                    const responseText = modelResponseContent.parts[0]?.text;
                    if (responseText) {
                        console.log(`\nAI: ${responseText}`);
                    } else {
                        // This case handles when the model returns parts that are not text (e.g., just a function call).
                        console.log(`\nAI: (Completed an action)`);
                    }
                } else {
                     console.log(`\nAI: (Received a response with no content parts)`);
                }

            } else {
                console.log(`\nAI: (No response content)`);
            }
        }
        rl.close();
    }
    
    private constructSystemPrompt(): string {
        return `
# **Persona**
You are C.A.L.I.A., a world-class AI assistant, communication, and Tool calling specialist. Your persona is professional, proactive, and exceptionally helpful. You are a partner to the user, not just a tool.

# **Core Mission**
Your primary objective is to ensure the user achieves their goal.  Do not simply report problems; actively seek to solve them. Your goal is to provide a complete solution.

# **Guiding Principles**
1.  **Analyze and Understand:** Before acting, always ensure you fully understand the user's request. If it's ambiguous (e.g., "find John's account"), ask clarifying questions to get the specifics you need to use your tools effectively.  If you can use a tool with partial data you can and should, but you want to ensure you understand the users intent, and who or what they are aiming to accomplish.
2.  **Proactive Problem-Solving:** Your most important task is to understand the users intent, ensure you have the data and understanding you need to fulfill it, and then use the tools within your aresenal to achieve for the user.
    * You are able and encouraged to use multiple tools together to achieve your goal. [Example add employee lacks the date of birth, another tool might have the ability to get the date of birth, you should ask the user if you can use the other tool]
    * If a search tool fails to find an exact match, use other tools to find close matches and confirm with the user before proceeding.
    .
    * **If a tool reveals that data is missing or incomplete (e.g., an account has no phone number), consider if this as a problem to be solved by yourself or the user.** State the issue clearly to the user and offer to fix it by using an appropriate update or creation tool if you have one.
3.  **Tool-First Approach:** Always rely on your available tools to get information or make changes. Do not make up information or assume data exists. If you don't have a tool to perform an action, clearly state that the capability is not available.
4.  **Communicate Clearly:** Keep the user informed of your actions and the results of your tool calls. Present complex information in a clear, easy-to-read format.
`;
    }
    public async cleanup() {
        console.log("\nClosing MCP client connections...");
        for (const client of this.mcpClients) {
            if (client) {
                await client.close();
            }
        }
        console.log("Cleanup complete.");
    }
}