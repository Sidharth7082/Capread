import { fetchTimeout } from '@utils/fetch/fetch';

export type AiChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type AiChatConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

const DEFAULT_TIMEOUT_MS = 120000;

const truncateForError = (text: string, max = 200) => {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
};

/**
 * Calls an OpenAI-compatible `/chat/completions` endpoint and returns the
 * first choice's message content.
 */
export const createChatCompletion = async (
  config: AiChatConfig,
  messages: AiChatMessage[],
  options?: { temperature?: number; timeoutMs?: number },
): Promise<string> => {
  const baseUrl = config.baseUrl.trim().replace(/\/+$/, '');
  const apiKey = config.apiKey.trim();
  const model = config.model.trim();

  if (!baseUrl) {
    throw new Error('AI base URL is not configured');
  }
  if (!model) {
    throw new Error('AI model is not configured');
  }

  let response: Response;
  try {
    response = await fetchTimeout(
      `${baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options?.temperature ?? 0.3,
        }),
      },
      options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );
  } catch (error) {
    throw new Error(
      `Could not reach the AI endpoint: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const raw = await response.text();

  if (!response.ok) {
    throw new Error(
      `AI request failed (${response.status}): ${truncateForError(raw)}`,
    );
  }

  let payload: {
    choices?: { message?: { content?: string | null } }[];
    error?: { message?: string };
  };
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error('AI endpoint returned a non-JSON response');
  }

  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error(
      payload.error?.message
        ? `AI request failed: ${payload.error.message}`
        : 'AI endpoint returned an empty recap',
    );
  }

  return content.trim();
};
