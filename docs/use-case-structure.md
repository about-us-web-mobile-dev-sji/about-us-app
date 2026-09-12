# Organisation des use cases

Chaque action possède un dossier, avec trois fichiers : `<Action>.ts`, `<Action>Input.ts` et `<Action>Output.ts`. Les tests existants sont placés à côté de l’action, dans `<Action>.spec.ts`.

```text
Auth/application/use-cases/
├── commands/
│   ├── email-login/
│   │   ├── EmailLogin.ts
│   │   ├── EmailLoginInput.ts
│   │   └── EmailLoginOutput.ts
│   ├── google-login/                 GoogleLogin{,Input,Output}.ts
│   ├── create-super-admin-identity/  CreateSuperAdminIdentity{,Input,Output}.ts
│   ├── refresh-token/                RefreshToken{,Input,Output}.ts
│   └── logout/                       Logout{,Input,Output}.ts
└── queries/
    └── authenticate/
        ├── Authenticate.ts
        ├── AuthenticateInput.ts
        └── AuthenticateOutput.ts

User/application/use-cases/
└── commands/
    └── create-super-admin/
        ├── CreateSuperAdmin.ts
        ├── CreateSuperAdminInput.ts
        └── CreateSuperAdminOutput.ts
```

Les noms de classes existants (`EmailLoginUseCase`, etc.) restent les tokens d’injection Nest. Les fichiers suivent la convention demandée en PascalCase.

Une commande modifie un état : connexion, création d’identité, création du Super-Admin, mise à jour d’activité lors du refresh ou révocation. `Authenticate` est une query : elle contrôle le token et consulte la session et le compte sans les modifier. Une commande peut retourner un résultat, notamment des tokens.

Chaque méthode publique suit la signature `handle(input: ActionInput): Promise<ActionOutput>`. Les commandes sans réponse métier (`Logout`, `CreateSuperAdmin`, `CreateSuperAdminIdentity`) possèdent un type Output égal à `void`, sans payload HTTP artificiel.

Les contrats Input/Output sont applicatifs et indépendants de Nest. Les DTO HTTP restent dans l’infrastructure et les contrôleurs adaptent les requêtes aux Input. Les routes et les réponses HTTP sont conservées.

Exemples :

```ts
await authenticate.handle({ accessToken });
await refreshToken.handle({ refreshToken });
await googleLogin.handle({ profile, userAgent });
await createSuperAdmin.handle({ email, firstName, lastName });
```

Le constructeur du use case Super-Admin reçoit désormais uniquement ses gateways ; l’initialiseur transforme la configuration en Input lors de l’appel. Cette organisation n’ajoute pas de bus CQRS ni de dépendance Nest dans Application.

Les services applicatifs partagés (`SessionValidator`, `AccessTokenIssuer`, `UserAccountService`) restent des services. Les constats de la revue Auth, notamment la concurrence refresh/logout et le provisioning Google partiel, ne sont pas corrigés par ce déplacement de fichiers.
