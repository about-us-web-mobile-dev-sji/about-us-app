import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Request } from 'express';
import { GoogleStateStore } from './google-state.store.js';

afterEach(() => vi.useRealTimers());
describe('GoogleStateStore', () => {
  it('binds state to a browser, expires it after five minutes and consumes it once', () => {
    vi.useFakeTimers();
    const store = new GoogleStateStore(true);
    const cookie = vi.fn();
    const req = {
      headers: {},
      res: { cookie, clearCookie: vi.fn() },
    } as unknown as Request;
    const issued = vi.fn();
    store.store(req, issued);
    const state = issued.mock.calls[0][1];
    const browser = cookie.mock.calls[0][1];
    expect(cookie.mock.calls[0][2]).toMatchObject({
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 300000,
    });
    const verified = vi.fn();
    store.verify(req, state, verified);
    expect(verified).toHaveBeenLastCalledWith(null, false, expect.any(Object));
    req.headers.cookie = `google_oauth_state=${browser}`;
    store.verify(req, state, verified);
    expect(verified).toHaveBeenLastCalledWith(null, true, undefined);
    store.verify(req, state, verified);
    expect(verified).toHaveBeenLastCalledWith(null, false, expect.any(Object));
    store.store(req, issued);
    req.headers.cookie = `google_oauth_state=${cookie.mock.calls[1][1]}`;
    vi.advanceTimersByTime(300000);
    store.verify(req, issued.mock.calls[1][1], verified);
    expect(verified).toHaveBeenLastCalledWith(null, false, expect.any(Object));
  });
});
