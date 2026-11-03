import type { UserRepository } from '../domain/repositories/i-user.repository.js';

/** What other modules expose about a user: enough to display them, nothing more. */
export interface UserSummary {
  id: string;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
}

export type UserSummaries = ReadonlyMap<string, UserSummary>;

/** Resolves user ids into display summaries with a single query per call. */
export class UserDirectory {
  constructor(private readonly users: UserRepository) {}

  async summaries(ids: Iterable<string | null | undefined>): Promise<UserSummaries> {
    const unique = [...new Set([...ids].filter((id): id is string => !!id))];
    const found = await this.users.findByIds(unique);
    return new Map(
      found.map((user) => [
        user.id!,
        { id: user.id!, fullName: user.fullName, email: user.email, avatarUrl: user.avatarUrl },
      ]),
    );
  }
}

/** A deleted or unknown user still shows up by id rather than disappearing. */
export function summaryOf(users: UserSummaries, id: string): UserSummary;
export function summaryOf(users: UserSummaries, id: string | null | undefined): UserSummary | null;
export function summaryOf(users: UserSummaries, id: string | null | undefined): UserSummary | null {
  if (!id) return null;
  return users.get(id) ?? { id, fullName: null, email: null, avatarUrl: null };
}
