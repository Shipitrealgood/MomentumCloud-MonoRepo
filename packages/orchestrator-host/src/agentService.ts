// orchestrator-host/src/agentService.ts

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Resource } from "@modelcontextprotocol/sdk/types.js";
import OpenAI from 'openai';
import { ChatCompletionTool, ChatCompletionMessageToolCall } from "openai/resources/chat/completions.mjs";
import readline from "readline/promises";

interface TextContentBlock {
    type: 'text';
    text: string;
}

function isTextContentBlock(block: any): block is TextContentBlock {
    return block && block.type === 'text' && typeof block.text === 'string';
}


export class AgentService {
    private openai: OpenAI;
    private availableTools: ChatCompletionTool[] = [];
    private availableResources: Resource[] = [];
    // Define unique names for our virtual tools
    private readonly GET_CONTACT_DETAILS_TOOL_NAME = "get_contact_details";
    private readonly GET_ACCOUNT_DETAILS_TOOL_NAME = "get_account_details";

    constructor(private salesforceClient: Client) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY is not set in the environment.");
        }
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    public async initialize() {
        console.log("--> AgentService: Discovering server capabilities...");
        const toolResult = await this.salesforceClient.listTools();
        
        // Map the real tools from the server
        this.availableTools = toolResult.tools.map(t => ({
            type: 'function',
            function: {
                name: t.name,
                description: t.description,
                parameters: t.inputSchema,
            },
        }));

        // --- START OF THE DEFINITIVE FIX ---
        // Add two specific "virtual" tools for reading resources.
        // These tools don't exist on the server, but we will handle them in processAgentTurn.

        this.availableTools.push({
            type: 'function',
            function: {
                name: this.GET_CONTACT_DETAILS_TOOL_NAME,
                description: "Gets all details for a single contact using their unique Salesforce ID.",
                parameters: {
                    type: 'object',
                    properties: {
                        contactId: {
                            type: 'string',
                            description: 'The 15 or 18-character Salesforce ID of the contact.'
                        }
                    },
                    required: ['contactId']
                }
            }
        });

        this.availableTools.push({
            type: 'function',
            function: {
                name: this.GET_ACCOUNT_DETAILS_TOOL_NAME,
                description: "Gets all details for a single Salesforce Account using its name.",
                parameters: {
                    type: 'object',
                    properties: {
                        accountName: {
                            type: 'string',
                            description: 'The exact name of the Salesforce account.'
                        }
                    },
                    required: ['accountName']
                }
            }
        });
        // --- END OF THE DEFINITIVE FIX ---

        console.log("--> AgentService: Discovered Tools:", this.availableTools.map(t => t.function.name).join(", "));

        const resourceResult = await this.salesforceClient.listResources();
        this.availableResources = resourceResult.resources;
        console.log("--> AgentService: Discovered Resources:", this.availableResources.map(r => r.name).join(", "));
    }

    public async startChatLoop() {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        console.log("\n💬 C.A.L.I.A. (powered by OpenAI) is ready. Type 'quit' to exit.");
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
            model: 'gpt-4.1-mini',
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

                try {
                    // --- START OF THE FIX ---
                    // Helper function to safely extract text from a resource read result
                    const getResourceText = async (uri: string): Promise<string> => {
                        const readResult = await this.salesforceClient.readResource({ uri });
                        const firstContent = readResult?.contents?.[0];
                        if (isTextContentBlock(firstContent)) {
                            return firstContent.text;
                        }
                        return `Error: Could not find text content for resource ${uri}`;
                    };

                    if (functionName === this.GET_CONTACT_DETAILS_TOOL_NAME) {
                        const contactId = functionArgs?.contactId;
                        const uri = `salesforce://contacts/${contactId}`;
                        console.log(`  - Reading contact resource: ${uri}`);
                        functionResponse = await getResourceText(uri);

                    } else if (functionName === this.GET_ACCOUNT_DETAILS_TOOL_NAME) {
                        const accountName = functionArgs?.accountName;
                        const uri = `salesforce://accounts/${encodeURIComponent(accountName)}`;
                        console.log(`  - Reading account resource: ${uri}`);
                        functionResponse = await getResourceText(uri);

                    // --- END OF THE FIX ---
                    } else {
                        // Handle all other "real" tools from the server as before
                        console.log(`  - Calling remote tool: ${functionName} with args:`, functionArgs);
                        const toolResult = await this.salesforceClient.callTool({
                            name: functionName,
                            arguments: functionArgs,
                        });
                        if (toolResult && Array.isArray(toolResult.content)) {
                            const firstContent = toolResult.content[0];
                            if (isTextContentBlock(firstContent)) {
                                functionResponse = firstContent.text;
                            }
                        }
                    }
                } catch (error: any) {
                    console.error(`--> Error executing tool '${functionName}':`, error.message);
                    functionResponse = `Error: ${error.message}`;
                }

                return {
                    tool_call_id: toolCall.id,
                    role: 'tool' as const,
                    name: functionName,
                    content: functionResponse,
                };
            }));

            messages.push(...toolOutputs);
            
            const finalResponse = await this.openai.chat.completions.create({ model: 'gpt-4.1-mini', messages: messages });
            console.log(`\nC.A.L.I.A.: ${finalResponse.choices[0].message.content}`);
        } else {
            console.log(`\nC.A.L.I.A.: ${responseMessage.content}`);
        }
    }

    private constructSystemPrompt(): string {
        const toolNames = this.availableTools.map(t => t.function.name).join(", ");
        const resourceSummaries = this.availableResources.map(r => `A resource with name "${r.name}" and URI "${r.uri}"`).join("\n");
        return `You are a helpful and autonomous assistant named C.A.L.I.A. who is an expert on Salesforce.
You have access to the following tools to help users with their requests: [${toolNames}].
You also have knowledge of the following data resources:
${resourceSummaries}
Your primary goal is to understand the user's intent and use your tools and resources to help. Ask clarifying questions if needed.`;
    }
}