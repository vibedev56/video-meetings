import {
  CallHandler,
  ExecutionContext,
  PayloadTooLargeException,
} from '@nestjs/common';
import { createMaxContentLengthInterceptor } from './max-content-length.interceptor.js';

describe('createMaxContentLengthInterceptor', () => {
  const Interceptor = createMaxContentLengthInterceptor(100, 'Too large');
  const setHeader = vi.fn();
  const handle = vi.fn();
  const next = { handle } as unknown as CallHandler;

  const run = (headers: Record<string, string>) =>
    new Interceptor().intercept(
      {
        switchToHttp: () => ({
          getRequest: () => ({ headers }),
          getResponse: () => ({ setHeader }),
        }),
      } as unknown as ExecutionContext,
      next,
    );

  beforeEach(() => {
    setHeader.mockReset();
    handle.mockReset().mockReturnValue('passed');
  });

  it('refuses a Content-Length over the limit and closes the connection', () => {
    expect(() => run({ 'content-length': '101' })).toThrow(
      PayloadTooLargeException,
    );
    expect(setHeader).toHaveBeenCalledWith('Connection', 'close');
    expect(handle).not.toHaveBeenCalled();
  });

  it('lets a Content-Length of exactly the limit through', () => {
    expect(run({ 'content-length': '100' })).toBe('passed');
  });

  it('lets a request without the header through', () => {
    expect(run({})).toBe('passed');
  });

  it('lets a non-numeric header through', () => {
    expect(run({ 'content-length': 'abc' })).toBe('passed');
  });
});
