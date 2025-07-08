// orchestrator-host/src/agentService.ts

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Resource } from "@modelcontextprotocol/sdk/types.js";
import OpenAI from 'openai';
// **FIX**: Import the specific types we need directly.
import { ChatCompletionTool, ChatCompletionMessageToolCall } from "openai/resources/index.mjs";
import readline from "readline/promises";

export class AgentService {
    private openai: OpenAI;
    private availableTools: ChatCompletionTool[] = [];
    private availableResources: Resource[] = [];

    constructor(private salesforceClient: Client) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY is not set in the environment.");
        }
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    public async initialize() {
        console.log("--> AgentService: Discovering server capabilities...");
        const toolResult = await this.salesforceClient.listTools();
        
        this.availableTools = toolResult.tools.map(t => ({
            type: 'function',
            function: {
                name: t.name,
                description: t.description,
                parameters: t.inputSchema,
            },
        }));
        console.log("--> AgentService: Discovered Tools:", this.availableTools.map(t => t.function.name).join(", "));

        const resourceResult = await this.salesforceClient.listResources();
        this.availableResources = resourceResult.resources;
        console.log("--> AgentService: Discovered Resources:", this.availableResources.map(r => r.name).join(", "));
    }

    public async startChatLoop() {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        console.log("\n💬 Salesforce Agent (powered by OpenAI) is ready. Type 'quit' to exit.");

        const history: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [{
            role: 'system',
            content: this.constructSystemPrompt()
        }];

        while (true) {
            const userInput = await rl.question("You: ");
            if (userInput.toLowerCase() === 'quit') break;

            history.push({ role: 'user', content: userInput });
            
            await this.processAgentTurn(history);
        }
        rl.close();
    }

    private async processAgentTurn(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]) {
        const response = await this.openai.chat.completions.create({
            model: 'gpt-4o',
            messages: messages,
            tools: this.availableTools,
            tool_choice: 'auto',
        });

        const responseMessage = response.choices[0].message;
        messages.push(responseMessage);

        const toolCalls = responseMessage.tool_calls;

        if (toolCalls) {
            console.log(`🤖 LLM wants to use ${toolCalls.length} tool(s)...`);

            // **FIX**: The correct type is ChatCompletionMessageToolCall.
            const toolOutputs = await Promise.all(toolCalls.map(async (toolCall: ChatCompletionMessageToolCall) => {
                const functionName = toolCall.function.name;
                const functionArgs = JSON.parse(toolCall.function.arguments);
                console.log(`  - Calling: ${functionName} with args:`, functionArgs);

                const toolResult = await this.salesforceClient.callTool({
                    name: functionName,
                    arguments: functionArgs,
                });
                
                const functionResponse = Array.isArray(toolResult.content) && toolResult.content[0] && 'text' in toolResult.content[0]
                    ? toolResult.content[0].text
                    : '{}';

                return {
                    tool_call_id: toolCall.id,
                    role: 'tool' as const,
                    name: functionName,
                    content: functionResponse,
                };
            }));

            messages.push(...toolOutputs);
            
            const finalResponse = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: messages,
            });

            console.log(`\nAI: ${finalResponse.choices[0].message.content}`);
        } else {
            console.log(`\nAI: ${responseMessage.content}`);
        }
    }

    private constructSystemPrompt(): string {
        const toolNames = this.availableTools.map(t => t.function.name).join(', ');
        const resourceSummaries = this.availableResources.map(r => `- ${r.name}: ${r.description || 'No description'}`).join('\n');
        
        return `You are a helpful and autonomous assistant named C.A.L.I.A. who is an expert on Salesforce.
You have access to the following tools to help users with their requests: [${toolNames}].
You also have knowledge of the following data resources:
${resourceSummaries}
Your primary goal is to understand the user's intent, reason about the best plan to accomplish it, and then use your available tools to execute that plan.
If a user's request is ambiguous or you lack the information needed to use a tool, you must ask clarifying questions before proceeding.
Do not make assumptions about tool inputs. When you need an ID for a contact or account, use a tool to find it first if available.`;
    }
}