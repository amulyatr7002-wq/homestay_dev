import { GoogleGenAI, FunctionCallingConfigMode, Type, type Schema } from "@google/genai";
import { getActiveUser } from "@/lib/authorization";
import { clientAddress, rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

export const AI_FALLBACK = "Our AI guide is taking a short break. Please try again in a little while.";
export const AI_RATE_LIMIT_FALLBACK = "The AI guide is busy right now. Please try again in a minute.";
export const AI_MAX_TOKENS = 1200;

export type AiProvider = "gemini" | "groq" | "anthropic";
export type AiSchema = {
  type: "object" | "array" | "string" | "integer" | "number" | "boolean";
  description?: string;
  properties?: Record<string, AiSchema>;
  items?: AiSchema;
  required?: string[];
  enum?: string[];
  nullable?: boolean;
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
};
export type AiTool = { name: string; description: string; parameters: AiSchema };
export type AiToolCall = { name: string; args: Record<string, unknown> };
export type AiRequest = {
  feature: string;
  system: string;
  userText: string;
  maxTokens?: number;
  userId?: string | null;
  tools?: AiTool[];
  forceTool?: string;
};
export type AiResponse = {
  text: string;
  toolCalls: AiToolCall[];
  inputTokens: number;
  outputTokens: number;
  fallback: boolean;
  rateLimited: boolean;
};

let client: GoogleGenAI | null | undefined;
let clientProvider: string | undefined;
let clientApiKey: string | undefined;

export function aiProvider() {
  return (process.env.AI_PROVIDER || "gemini").toLowerCase();
}

export function getAiClient() {
  const provider = aiProvider();
  const apiKey = process.env.AI_API_KEY;
  if (clientProvider !== provider || clientApiKey !== apiKey) {
    client = undefined;
    clientProvider = provider;
    clientApiKey = apiKey;
  }
  if (client !== undefined) return client;
  client = provider === "gemini" && apiKey
    ? new GoogleGenAI({ apiKey, httpOptions: { timeout: 30_000 } })
    : null;
  return client;
}

export function cleanUserText(value: string, maxLength = 2000) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function delimitedUserText(value: string, maxLength = 2000) {
  const text = cleanUserText(value, maxLength).replace(/<<<(?:END_)?USER_INPUT>>>/gi, "");
  return `<<<USER_INPUT>>>\n${text}\n<<<END_USER_INPUT>>>`;
}

export async function withAiRetry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt + 1 < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (2 ** attempt) + Math.floor(Math.random() * 100)));
      }
    }
  }
  throw lastError;
}

export async function checkAiRateLimit(request: Request, feature: string, limit = 12) {
  const user = await getActiveUser();
  const identity = user ? `user:${user.id}` : `ip:${clientAddress(request.headers)}`;
  const rate = await rateLimit(`ai:${feature}:${identity}`, limit, 60 * 60 * 1000);
  return { user, rate };
}

export async function recordAiUsage(userId: string | null | undefined, feature: string, tokens: number) {
  try {
    await prisma.aiUsage.create({ data: { userId: userId ?? null, feature, tokens: Math.max(0, Math.round(tokens)) } });
  } catch (error) {
    console.error(`Could not record ${feature} AI usage:`, error);
  }
}

export function aiModel() {
  return process.env.AI_MODEL || "gemini-2.5-flash";
}

function responseFailure(error: unknown) {
  const details = error && typeof error === "object" ? error as { status?: number; code?: number; message?: string } : {};
  const rateLimited = details.status === 429 || details.code === 429 || details.message?.includes("429") === true;
  return { rateLimited, text: rateLimited ? AI_RATE_LIMIT_FALLBACK : AI_FALLBACK };
}

function usageCounts(usage: { promptTokenCount?: number; candidatesTokenCount?: number } | undefined) {
  return { inputTokens: usage?.promptTokenCount ?? 0, outputTokens: usage?.candidatesTokenCount ?? 0 };
}

function isProviderReady() {
  if (aiProvider() !== "gemini") return false;
  return Boolean(process.env.AI_API_KEY);
}

function providerFallbackText() {
  return aiProvider() === "gemini"
    ? AI_FALLBACK
    : `The ${aiProvider()} AI provider is not available yet. Select Gemini in AI_PROVIDER.`;
}

function genaiConfig(input: AiRequest) {
  return {
    systemInstruction: input.system,
    maxOutputTokens: Math.min(input.maxTokens ?? 700, AI_MAX_TOKENS),
    ...(input.tools?.length ? {
      tools: [{ functionDeclarations: input.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: toGeminiSchema(tool.parameters),
      })) }],
    } : {}),
    ...(input.forceTool ? {
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingConfigMode.ANY,
          allowedFunctionNames: [input.forceTool],
        },
      },
    } : {}),
  };
}

function toGeminiSchema(schema: AiSchema): Schema {
  const typeMap = {
    object: Type.OBJECT,
    array: Type.ARRAY,
    string: Type.STRING,
    integer: Type.INTEGER,
    number: Type.NUMBER,
    boolean: Type.BOOLEAN,
  } as const;
  return {
    type: typeMap[schema.type],
    ...(schema.description ? { description: schema.description } : {}),
    ...(schema.properties ? { properties: Object.fromEntries(Object.entries(schema.properties).map(([key, value]) => [key, toGeminiSchema(value)])) } : {}),
    ...(schema.items ? { items: toGeminiSchema(schema.items) } : {}),
    ...(schema.required ? { required: schema.required } : {}),
    ...(schema.enum ? { enum: schema.enum, format: "enum" } : {}),
    ...(schema.nullable ? { nullable: true } : {}),
    ...(schema.minItems !== undefined ? { minItems: String(schema.minItems) } : {}),
    ...(schema.maxItems !== undefined ? { maxItems: String(schema.maxItems) } : {}),
    ...(schema.minLength !== undefined ? { minLength: String(schema.minLength) } : {}),
    ...(schema.maxLength !== undefined ? { maxLength: String(schema.maxLength) } : {}),
    ...(schema.minimum !== undefined ? { minimum: schema.minimum } : {}),
    ...(schema.maximum !== undefined ? { maximum: schema.maximum } : {}),
  };
}

export async function generateAiResponse(input: AiRequest): Promise<AiResponse> {
  if (!isProviderReady()) {
    return { text: providerFallbackText(), toolCalls: [], inputTokens: 0, outputTokens: 0, fallback: true, rateLimited: false };
  }
  const ai = getAiClient();
  if (!ai) return { text: AI_FALLBACK, toolCalls: [], inputTokens: 0, outputTokens: 0, fallback: true, rateLimited: false };
  try {
    const response = await withAiRetry(() => ai.models.generateContent({
      model: aiModel(),
      contents: delimitedUserText(input.userText, 8000),
      config: genaiConfig(input),
    }));
    const counts = usageCounts(response.usageMetadata);
    await recordAiUsage(input.userId, input.feature, counts.inputTokens + counts.outputTokens);
    return {
      text: response.text ?? "",
      toolCalls: (response.functionCalls ?? []).flatMap((call) => call.name ? [{ name: call.name, args: call.args ?? {} }] : []),
      ...counts,
      fallback: false,
      rateLimited: false,
    };
  } catch (error) {
    console.error(`AI text generation failed for ${input.feature}:`, error);
    const failure = responseFailure(error);
    return { text: failure.text, toolCalls: [], inputTokens: 0, outputTokens: 0, fallback: true, rateLimited: failure.rateLimited };
  }
}

export async function generateAiText(input: {
  feature: string;
  system: string;
  userText: string;
  maxTokens?: number;
  userId?: string | null;
}): Promise<{ text: string; inputTokens: number; outputTokens: number; fallback: boolean; rateLimited: boolean }> {
  const response = await generateAiResponse(input);
  return {
    text: response.text,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    fallback: response.fallback,
    rateLimited: response.rateLimited,
  };
}

export async function streamAiResponse(input: AiRequest, onText: (delta: string) => void): Promise<AiResponse> {
  if (!isProviderReady()) {
    const text = providerFallbackText();
    onText(text);
    return { text, toolCalls: [], inputTokens: 0, outputTokens: 0, fallback: true, rateLimited: false };
  }
  const ai = getAiClient();
  if (!ai) {
    onText(AI_FALLBACK);
    return { text: AI_FALLBACK, toolCalls: [], inputTokens: 0, outputTokens: 0, fallback: true, rateLimited: false };
  }
  let emitted = false;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const stream = await ai.models.generateContentStream({
        model: aiModel(),
        contents: delimitedUserText(input.userText, 8000),
        config: genaiConfig(input),
      });
      let text = "";
      let calls: AiToolCall[] = [];
      let counts = { inputTokens: 0, outputTokens: 0 };
      for await (const chunk of stream) {
        const delta = chunk.text ?? "";
        if (delta) {
          emitted = true;
          text += delta;
          onText(delta);
        }
        calls = chunk.functionCalls?.flatMap((call) => call.name ? [{ name: call.name, args: call.args ?? {} }] : []) ?? calls;
        if (chunk.usageMetadata) counts = usageCounts(chunk.usageMetadata);
      }
      await recordAiUsage(input.userId, input.feature, counts.inputTokens + counts.outputTokens);
      return { text, toolCalls: calls, ...counts, fallback: false, rateLimited: false };
    } catch (error) {
      if (emitted || attempt === 2) {
        console.error(`AI streaming failed for ${input.feature}:`, error);
        const failure = responseFailure(error);
        onText(failure.text);
        return { text: failure.text, toolCalls: [], inputTokens: 0, outputTokens: 0, fallback: true, rateLimited: failure.rateLimited };
      }
      await new Promise((resolve) => setTimeout(resolve, 250 * (2 ** attempt) + Math.floor(Math.random() * 100)));
    }
  }
  onText(AI_FALLBACK);
  return { text: AI_FALLBACK, toolCalls: [], inputTokens: 0, outputTokens: 0, fallback: true, rateLimited: false };
}
