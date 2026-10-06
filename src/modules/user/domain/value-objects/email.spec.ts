import { describe, expect, it } from 'vitest';
import { Email } from './email.js';
describe('Email', () => {
  it('normalizes email before persistence', () =>
    expect(Email.create(' Alice@Example.COM ').value).toBe(
      'alice@example.com',
    ));
  it.each([
    '',
    '  ',
    'alice',
    'alice@',
    'a b@example.com',
    'a@b',
    'a'.repeat(321) + '@example.com',
  ])('rejects %j', (value) =>
    expect(() => Email.create(value)).toThrow('Invalid email'),
  );
});
