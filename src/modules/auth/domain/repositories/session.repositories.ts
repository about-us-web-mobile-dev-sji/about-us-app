import type { Session, NewSession } from '../entities/session.js';

export interface SessionRepository {
  findById(id: string): Promise<Session | null>;
  /** Charger les sessions afin d'appliquer revoke() dans le domaine. */
  findBySubjectId(subjectId: string): Promise<Session[]>;
  /** Insérer les valeurs préparées par le domaine ; seule la base génère id. */
  create(input: NewSession): Promise<Session>;
  /** Persister les dates et le statut du domaine sans les recalculer.
   * L'adaptateur doit empêcher une écriture obsolète de réactiver une session
   * révoquée (transaction/verrou ou contrôle optimiste).
   */
  save(session: Session): Promise<Session>;
}

export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY');
