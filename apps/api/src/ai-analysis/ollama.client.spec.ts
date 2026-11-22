import { AiRuntimeUnavailableError } from './ai-analysis.errors.js';
import { OllamaClient } from './ollama.client.js';

const config = {
  get: (key: string) =>
    key === 'OLLAMA_BASE_URL' ? 'http://ollama.test:1234/' : undefined,
};
const REQUEST = {
  messages: [{ role: 'user' as const, content: 'hi' }],
  format: { type: 'object' },
};
const signal = () => new AbortController().signal;

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const ndjson = (...chunks: object[]) =>
  new Response(chunks.map((chunk) => JSON.stringify(chunk) + '\n').join(''));

const client = () => new OllamaClient(config as never);

describe('OllamaClient', () => {
  it('posts to /api/chat with the schema and returns the answer text', async () => {
    fetchMock.mockResolvedValue(
      ndjson(
        { message: { content: '{"a"' }, done: false },
        { message: { content: ':1}' }, done: false },
        { message: { content: '' }, done: true, done_reason: 'stop' },
      ),
    );
    await expect(client().chat(REQUEST, signal())).resolves.toEqual({
      content: '{"a":1}',
      doneReason: 'stop',
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://ollama.test:1234/api/chat');
    expect(JSON.parse(init.body)).toMatchObject({
      model: 'qwen3:4b-instruct-2507-q4_K_M',
      stream: true,
      format: { type: 'object' },
      keep_alive: '10m',
      options: { num_ctx: 8192 },
    });
  });

  it('maps a refused connection to AiRuntimeUnavailableError', async () => {
    fetchMock.mockRejectedValue(
      new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED' } }),
    );
    await expect(client().chat(REQUEST, signal())).rejects.toBeInstanceOf(
      AiRuntimeUnavailableError,
    );
  });

  it('maps 404 to a "model not installed" error with the pull command', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        '{"error":"model \\"x\\" not found, try pulling it first"}',
        {
          status: 404,
        },
      ),
    );
    const promise = client().chat(REQUEST, signal());
    await expect(promise).rejects.toBeInstanceOf(AiRuntimeUnavailableError);
    await expect(promise).rejects.toThrow('ollama pull');
  });

  it('exposes done_reason "length" when the output was cut', async () => {
    fetchMock.mockResolvedValue(
      ndjson(
        { message: { content: 'abc' }, done: false },
        { done: true, done_reason: 'length' },
      ),
    );
    await expect(client().chat(REQUEST, signal())).resolves.toEqual({
      content: 'abc',
      doneReason: 'length',
    });
  });

  it('joins a JSON line split across network chunks', async () => {
    const line = JSON.stringify({ message: { content: 'ok' }, done: true });
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(line.slice(0, 10)));
        controller.enqueue(encoder.encode(line.slice(10)));
        controller.close();
      },
    });
    fetchMock.mockResolvedValue(new Response(body));
    await expect(client().chat(REQUEST, signal())).resolves.toEqual({
      content: 'ok',
      doneReason: undefined,
    });
  });

  it('throws a plain error for an error line inside the stream', async () => {
    fetchMock.mockResolvedValue(ndjson({ error: 'out of memory' }));
    const promise = client().chat(REQUEST, signal());
    await expect(promise).rejects.toThrow('out of memory');
    await expect(promise).rejects.not.toBeInstanceOf(AiRuntimeUnavailableError);
  });

  it('keeps a 404 that is not about the model a plain error', async () => {
    fetchMock.mockResolvedValue(
      new Response('page not found', { status: 404 }),
    );
    const promise = client().chat(REQUEST, signal());
    await expect(promise).rejects.toThrow('HTTP 404');
    await expect(promise).rejects.not.toBeInstanceOf(AiRuntimeUnavailableError);
  });

  it('keeps a timeout a plain error, so it is retried', async () => {
    const timeout = new DOMException('timed out', 'TimeoutError');
    fetchMock.mockRejectedValue(timeout);
    const promise = client().chat(REQUEST, signal());
    await expect(promise).rejects.toBe(timeout);
    await expect(promise).rejects.not.toBeInstanceOf(AiRuntimeUnavailableError);
  });

  it('throws a plain error for other HTTP failures', async () => {
    fetchMock.mockResolvedValue(new Response('boom', { status: 500 }));
    await expect(client().chat(REQUEST, signal())).rejects.toThrow('HTTP 500');
  });
});
