/**
 * NDJSON stream parser for AI Council API responses.
 * UI-agnostic: emits typed events, no DOM references.
 */

export type StreamEvent =
  | { type: 'started' }
  | { type: 'heartbeat'; elapsed: number }
  | { type: 'progress'; message: string }
  | { type: 'model_complete'; provider: string; duration: number; hasError: boolean }
  | { type: 'snapshot'; data: Record<string, any> }
  | { type: 'partial_complete'; data: Record<string, any> }
  | { type: 'complete'; data: Record<string, any> }
  | { type: 'error'; error: string };

export type StreamEventHandler = (event: StreamEvent) => void;

/**
 * Reads an NDJSON response body and calls `onEvent` for each parsed event.
 * Returns the final `complete` or `partial_complete` data, or throws on error.
 */
export async function parseNdjsonStream(
  body: ReadableStream<Uint8Array>,
  onEvent: StreamEventHandler
): Promise<Record<string, any> | null> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalData: Record<string, any> | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const raw = JSON.parse(line);
        const event = normalizeEvent(raw);
        if (!event) continue;

        if (event.type === 'error') {
          throw new Error(event.error);
        }

        onEvent(event);

        if (event.type === 'complete' || event.type === 'partial_complete') {
          finalData = event.data;
        }
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message !== line) {
          throw parseError;
        }
        console.warn('Could not parse streaming event:', line);
      }
    }
  }

  // Process remaining buffer
  if (buffer.trim()) {
    try {
      const raw = JSON.parse(buffer);
      const event = normalizeEvent(raw);
      if (event) {
        if (event.type === 'error') throw new Error(event.error);
        if (event.type === 'complete' || event.type === 'partial_complete') {
          finalData = event.data;
        }
        onEvent(event);
      }
    } catch (_e) {
      // Ignore trailing incomplete JSON
    }
  }

  return finalData;
}

function normalizeEvent(raw: any): StreamEvent | null {
  switch (raw.type) {
    case 'started':
      return { type: 'started' };
    case 'heartbeat':
      return { type: 'heartbeat', elapsed: raw.data?.elapsed ?? 0 };
    case 'progress':
      return { type: 'progress', message: raw.data?.message ?? '' };
    case 'model_complete':
      return {
        type: 'model_complete',
        provider: raw.data?.provider ?? '',
        duration: raw.data?.duration ?? 0,
        hasError: !!raw.data?.hasError
      };
    case 'snapshot':
      return { type: 'snapshot', data: raw.data ?? {} };
    case 'partial_complete':
      return { type: 'partial_complete', data: raw.data ?? {} };
    case 'complete':
      return { type: 'complete', data: raw.data ?? {} };
    case 'error':
      return { type: 'error', error: raw.data?.error ?? 'Unknown error' };
    default:
      return null;
  }
}
