// LLM Provider Service - Unified adapter for OpenAI, Anthropic, OpenRouter
import { config } from '../utils/config';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolName?: string;
}

export interface StreamParams {
  messages: LLMMessage[];
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  tools?: string[];
}

export type StreamEvent =
  | { type: 'token'; delta: string }
  | { type: 'tool_call'; name: string; input: string; output: string }
  | { type: 'error'; message: string }
  | { type: 'done'; usage: { prompt: number; completion: number; total: number } };

export interface LLMProvider {
  stream(params: StreamParams): AsyncGenerator<StreamEvent>;
  estimateCost(usage: { prompt: number; completion: number }): number;
}

// OpenAI Provider
export class OpenAIProvider implements LLMProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = config.openaiApiKey;
  }

  async *stream(params: StreamParams): AsyncGenerator<StreamEvent> {
    if (!this.apiKey) {
      yield { type: 'error', message: 'OpenAI API key not configured' };
      return;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: params.model,
          messages: [
            { role: 'system', content: params.systemPrompt },
            ...params.messages.filter(m => m.role !== 'system'),
          ],
          temperature: params.temperature,
          max_tokens: params.maxTokens,
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        yield { type: 'error', message: `OpenAI error: ${error}` };
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        yield { type: 'error', message: 'No response body' };
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.substring(6));
              const delta = data.choices?.[0]?.delta?.content;
              if (delta) {
                yield { type: 'token', delta };
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }

      yield { type: 'done', usage: { prompt: 0, completion: 0, total: 0 } };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      yield { type: 'error', message };
    }
  }

  estimateCost(usage: { prompt: number; completion: number }): number {
    // GPT-4o pricing (per 1M tokens)
    const promptCost = (usage.prompt / 1000000) * 2.5;
    const completionCost = (usage.completion / 1000000) * 10;
    return promptCost + completionCost;
  }
}

// Anthropic Provider
export class AnthropicProvider implements LLMProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = config.anthropicApiKey;
  }

  async *stream(params: StreamParams): AsyncGenerator<StreamEvent> {
    if (!this.apiKey) {
      yield { type: 'error', message: 'Anthropic API key not configured' };
      return;
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: params.model,
          max_tokens: params.maxTokens,
          system: params.systemPrompt,
          messages: params.messages.filter(m => m.role !== 'system').map(m => ({
            role: m.role === 'tool' ? 'user' : m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        yield { type: 'error', message: `Anthropic error: ${error}` };
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        yield { type: 'error', message: 'No response body' };
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.type === 'content_block_delta' && data.delta?.text) {
                yield { type: 'token', delta: data.delta.text };
              }
            } catch {
              // Skip
            }
          }
        }
      }

      yield { type: 'done', usage: { prompt: 0, completion: 0, total: 0 } };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      yield { type: 'error', message };
    }
  }

  estimateCost(usage: { prompt: number; completion: number }): number {
    // Claude 3.5 Sonnet pricing
    const promptCost = (usage.prompt / 1000000) * 3;
    const completionCost = (usage.completion / 1000000) * 15;
    return promptCost + completionCost;
  }
}

// OpenRouter Provider
export class OpenRouterProvider implements LLMProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = config.openrouterApiKey;
  }

  async *stream(params: StreamParams): AsyncGenerator<StreamEvent> {
    if (!this.apiKey) {
      yield { type: 'error', message: 'OpenRouter API key not configured' };
      return;
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: params.model,
          messages: [
            { role: 'system', content: params.systemPrompt },
            ...params.messages.filter(m => m.role !== 'system'),
          ],
          temperature: params.temperature,
          max_tokens: params.maxTokens,
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        yield { type: 'error', message: `OpenRouter error: ${error}` };
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        yield { type: 'error', message: 'No response body' };
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.substring(6));
              const delta = data.choices?.[0]?.delta?.content;
              if (delta) {
                yield { type: 'token', delta };
              }
            } catch {
              // Skip
            }
          }
        }
      }

      yield { type: 'done', usage: { prompt: 0, completion: 0, total: 0 } };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      yield { type: 'error', message };
    }
  }

  estimateCost(usage: { prompt: number; completion: number }): number {
    // Average OpenRouter pricing
    const promptCost = (usage.prompt / 1000000) * 1.5;
    const completionCost = (usage.completion / 1000000) * 5;
    return promptCost + completionCost;
  }
}

// Factory function
export function getLLMProvider(provider: 'openai' | 'anthropic' | 'openrouter'): LLMProvider {
  switch (provider) {
    case 'openai':
      return new OpenAIProvider();
    case 'anthropic':
      return new AnthropicProvider();
    case 'openrouter':
      return new OpenRouterProvider();
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
