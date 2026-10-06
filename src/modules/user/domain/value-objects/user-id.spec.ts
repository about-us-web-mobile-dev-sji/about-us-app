import { describe, expect, it } from 'vitest';
import { UserId } from './user-id.js';
describe('UserId', () => {
  it('normalizes an identifier', () =>
    expect(UserId.create('ABCDEF00-0000-4000-8000-000000000001').value).toBe(
      'abcdef00-0000-4000-8000-000000000001',
    ));
  it.each(['', 'not-an-id', '00000000-0000-4000-8000'])('rejects %j', (value) =>
    expect(() => UserId.create(value)).toThrow(),
  );
});
