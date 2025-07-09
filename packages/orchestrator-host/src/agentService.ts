// orchestrator-host/src/agentService.ts

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Resource, ContentBlock } from "@modelcontextprotocol/sdk/types.js";
import OpenAI from 'openai';
import { ChatCompletionTool, ChatCompletionMessageToolCall } from "openai/resources/chat/completions.mjs";
import readline from "readline/promises";

// --- START OF THE DEFINITIVE FIX ---

// 1. Define a simple, clear interface for the exact shape of a text block.
interface TextContentBlock {
    type: 'text';
    text: string;
}

// 2. Create a "type guard" function. This is the key to the solution.
// Its special return type `block is TextContentBlock` PROVES the type to TypeScript.
function isTextContentBlock(block: any): block is TextContentBlock {
    return block && block.type === 'text' && typeof block.text === 'string';
}

// --- END OF THE DEFINITIVE FIX ---


export class AgentService {
    private openai: OpenAI;
    private availableTools: ChatCompletionTool[] = [];
    private availableResources: Resource[] = [];
    private readonly READ_RESOURCE_TOOL_NAME = "read_resource_details";

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

        this.availableTools.push({
            type: 'function',
            function: {
                name: this.READ_RESOURCE_TOOL_NAME,
                description: "Reads the full details of a specific resource using its URI. Use this to get information like phone numbers, emails, or other details for a resource you have identified.",
                parameters: {
                    type: 'object',
                    properties: {
                        uri: {
                            type: 'string',
                            description: 'The full URI of the resource to read (e.g., "salesforce://accounts/SomeAccountName").'
                        }
                    },
                    required: ['uri']
                }
            }
        });

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

            const toolOutputs = await Promise.all(toolCalls.map(async (toolCall: ChatCompletionMessageToolCall) => {
                const functionName = toolCall.function.name;
                const functionArgs = JSON.parse(toolCall.function.arguments);
                
                let functionResponse: string = '{}';

                if (functionName === this.READ_RESOURCE_TOOL_NAME) {
                    const uri = functionArgs?.uri;
                    if (typeof uri === 'string') {
                        console.log(`  - Reading resource: ${uri}`);
                        const readResult = await this.salesforceClient.readResource({ uri });
                        
                        if (readResult && Array.isArray(readResult.contents)) {
                            const firstContent = readResult.contents[0];
                            // Now, using our type guard, TypeScript knows this is safe.
                            if (isTextContentBlock(firstContent)) {
                                functionResponse = firstContent.text;
                            }
                        }
                    } else {
                        functionResponse = 'Error: URI was not provided for read_resource_details.';
                        console.error(functionResponse);
                    }
                } else {
                    console.log(`  - Calling remote tool: ${functionName} with args:`, functionArgs);
                    const toolResult = await this.salesforceClient.callTool({
                        name: functionName,
                        arguments: functionArgs,
                    });

                    if (toolResult && Array.isArray(toolResult.content)) {
                        const firstContent = toolResult.content[0];
                         // Using our type guard again for consistency and safety.
                        if (isTextContentBlock(firstContent)) {
                            functionResponse = firstContent.text;
                        }
                    }
                }

                return {
                    tool_call_id: toolCall.id,
                    role: 'tool' as const,
                    name: functionName,
                    content: functionResponse,
                };
            }));

            messages.push(...toolOutputs);
            
            const finalResponse = await this.openai.chat.completions.create({ model: 'gpt-4o', messages: messages });
            console.log(`\nAI: ${finalResponse.choices[0].message.content}`);
        } else {
            console.log(`\nAI: ${responseMessage.content}`);
        }
    }

    private constructSystemPrompt(): string {
        const toolNames = this.availableTools.map(t => t.function.name).join(", ");
        const resourceSummaries = this.availableResources.map(r => `A resource with name "${r.name}" and URI "${r.uri}"`).join("\n");
        
        return `You are a helpful and autonomous assistant named C.A.L.I.A. who is an expert on Salesforce.
You have access to the following tools to help users with their requests: [${toolNames}].
You also have knowledge of the following data resources. To get the full details of any resource, use the '${this.READ_RESOURCE_TOOL_NAME}' tool with the resource's URI.
Available resource examples:
${resourceSummaries}
Your primary goal is to understand the user's intent and use your tools and resources to help. Ask clarifying questions if needed.`;
    }
}