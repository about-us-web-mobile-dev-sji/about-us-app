import type {
  AuthIdentity,
  NewAuthIdentity,
} from '../entities/auth-identity.js';
import type { AuthProvider } from '../enums/auth-provider.enums.js';

export interface AuthIdentityRepository {
  findById(id: string): Promise<AuthIdentity | null>;
  findByProvider(
    provider: AuthProvider,
    providerSubject: string,
  ): Promise<AuthIdentity | null>;
  /** Insérer les valeurs de prepareCreation sans recalculer les dates.
   * La base génère uniquement id. Imposer les contraintes d'unicité du fournisseur.
   */
  create(input: NewAuthIdentity): Promise<AuthIdentity>;
  /** Persister les changements du domaine et retourner l'identité enregistrée. */
  save(identity: AuthIdentity): Promise<AuthIdentity>;
}

export const AUTH_IDENTITY_REPOSITORY = Symbol('AUTH_IDENTITY_REPOSITORY');
