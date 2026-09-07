import { AuthProvider } from '../enums/auth-provider.enums.js';

export interface AuthIdentityProps {
  id: string;
  subjectId: string;
  provider: AuthProvider;
  providerSubject: string;
  passwordHash: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastAuthenticatedAt: Date | null;
}

/** Données préparées par le domaine ; seule la base attribue id. */
export type NewAuthIdentity = Omit<AuthIdentityProps, 'id'>;

export class AuthIdentity {
  private constructor(private props: AuthIdentityProps) {}

  static prepareCreation(
    input: {
      /** Identifiant abstrait du propriétaire ; Auth ne dépend pas de l’entité User. */
      subjectId: string;
      /** Fournisseur de connexion : EMAIL pour un mot de passe, GOOGLE pour une identité externe. */
      provider: AuthProvider;
      /** Email normalisé pour EMAIL, claim sub stable pour GOOGLE. Le couple (provider, providerSubject) doit être unique en stockage. */
      providerSubject: string;
      /** Hash produit par l’adaptateur de hachage, obligatoire pour EMAIL et null pour GOOGLE ; jamais le mot de passe en clair. */
      passwordHash?: string | null;
    },
    now = new Date(),
  ): NewAuthIdentity {
    if (!Number.isFinite(now.getTime())) throw new Error('Invalid date');
    if (!input.subjectId.trim() || !input.providerSubject.trim()) {
      throw new Error('Subject and provider subject are required');
    }
    if (!Object.values(AuthProvider).includes(input.provider)) {
      throw new Error('Unsupported authentication provider');
    }
    const isEmail = input.provider === AuthProvider.EMAIL;
    if (isEmail && !input.passwordHash?.trim()) {
      throw new Error('Email identity requires a password hash');
    }
    if (!isEmail && input.passwordHash != null) {
      throw new Error('Google identity cannot contain a password hash');
    }
    const providerSubject = isEmail
      ? input.providerSubject.trim().toLowerCase()
      : input.providerSubject;
    return {
      subjectId: input.subjectId,
      provider: input.provider,
      providerSubject,
      passwordHash: input.passwordHash ?? null,
      createdAt: new Date(now),
      updatedAt: new Date(now),
      lastAuthenticatedAt: null,
    };
  }

  static reconstitute(props: AuthIdentityProps): AuthIdentity {
    return new AuthIdentity(structuredClone(props));
  }

  get id(): string {
    return this.props.id;
  }
  get subjectId(): string {
    return this.props.subjectId;
  }
  markAuthenticated(now = new Date()): void {
    if (!Number.isFinite(now.getTime()) || now < this.props.updatedAt) {
      throw new Error('Authentication date cannot precede the last update');
    }
    this.props.lastAuthenticatedAt = new Date(now);
    this.props.updatedAt = new Date(now);
  }

  /** Copie destinée à la persistance, contenant le hash : ne jamais l’exposer dans une réponse HTTP. */
  toPrimitives(): AuthIdentityProps {
    return structuredClone(this.props);
  }
}
