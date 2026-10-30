import { defineAgent } from 'eve';
import { openai } from 'eve/models/openai';
// Eve's direct OpenAI model reads OPENAI_API_KEY itself and maps OpenAI-specific request options correctly.
const contextWindow = process.env.OPENAI_CONTEXT_WINDOW_TOKENS?.trim();
const modelContextWindowTokens = contextWindow ? Number(contextWindow) : undefined;
if (modelContextWindowTokens !== undefined && (!Number.isSafeInteger(modelContextWindowTokens) || modelContextWindowTokens <= 0)) {
 throw new Error('OPENAI_CONTEXT_WINDOW_TOKENS must be a positive integer');
}
export default defineAgent({model:openai(process.env.OPENAI_MODEL!),modelContextWindowTokens,defaultTools:false});
