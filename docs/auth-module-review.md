# Cartographie et analyse du module Auth

Date : 8 septembre 2026. Périmètre : code actuel de `src/modules/auth`, interfaces User, configuration JWT et persistance PostgreSQL. Analyse sans correction fonctionnelle ; routes actuelles conservées. Audit métier hors périmètre.

## Verdict

**Le module respecte largement la direction des dépendances de la Clean Architecture, mais ses garanties métier et transactionnelles restent incomplètes.** Application n’importe ni Nest, ni TypeORM, ni Express, ni Passport. Les repositories et gateways sont définis dans les couches internes ; les adaptateurs techniques les implémentent.

Deux problèmes doivent toutefois passer avant un nouveau rangement des dossiers : une sauvegarde de session obsolète peut annuler un logout, et la première connexion Google n’est pas atomique entre User et Auth.

Le critère central est la direction des dépendances vers les politiques internes, plutôt que le nom des dossiers. [Référence : Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html).

## 1. Cartographie

```text
AuthModule — composition Nest et exports
├── application/
│   ├── use-cases/
│   │   ├── EmailLoginUseCase
│   │   ├── GoogleLoginUseCase
│   │   ├── CreateSuperAdminIdentityUseCase
│   │   ├── AuthenticateUseCase
│   │   ├── RefreshTokenUseCase
│   │   └── LogoutUseCase
│   ├── services/
│   │   ├── SessionValidator
│   │   └── AccessTokenIssuer
│   ├── gateways/
│   │   ├── AuthSubjectGateway
│   │   ├── PasswordEncryptionGateway
│   │   ├── AccessTokenGateway
│   │   └── RefreshTokenGateway
│   └── models/GoogleIdentity
├── domain/
│   ├── entities/ AuthIdentity, Session, AccessToken, RefreshToken
│   ├── repositories/ AuthIdentityRepository, SessionRepository
│   ├── enums/ AuthProvider, SessionStatus
│   └── exceptions/ identifiants, session, compte et profil Google invalides
└── infrastructure/
    ├── http/ AuthController, filtre d’exceptions, DTO, mapper de réponse
    ├── services/ Passport Google, state OAuth, JWT Nest, bcrypt, adaptateur User
    ├── events/ SuperAdminCreatedListener
    └── persistence/
        ├── repositories TypeORM Identity et Session
        ├── mappers AuthIdentity et Session
        └── entités ORM AuthIdentityEntity et AuthSessionEntity
```

### Responsabilités des objets métier

| Objet | Responsabilité | Stockage |
| --- | --- | --- |
| `AuthIdentity` | Lien avec User, fournisseur EMAIL/GOOGLE, hash éventuel, dates de connexion | Table `auth.auth_identities` |
| `Session` | Durée de connexion, activité et révocation | Table `auth.auth_sessions` |
| `AccessToken` | Claims d’un jeton d’accès limité à 15 minutes et à la fin de session | Pas de ligne de token |
| `RefreshToken` | Claims d’un jeton de renouvellement valable jusqu’à la fin de session | Pas de ligne de token |

**Les refresh tokens ne sont pas persistés individuellement.** La session référencée par `sid` est persistée et contrôlée à chaque renouvellement. Le `jti` n’est pas suivi en base ; il ne constitue donc pas un identifiant de consommation à usage unique.

### Frontières et dépendances

```text
HTTP / événement User
  → adaptateurs Auth
  → use cases
  → entités + contrats de repositories/gateways
                ↑ implémentés par
     TypeORM / JWT Nest / bcrypt / adaptateur User

Application Auth → AuthSubjectGateway
Infrastructure UserAuthSubjectGateway → UserAccountService
ORM Auth → ORM User, pour les clés étrangères
```

La relation ORM Auth → User est technique et unidirectionnelle. Elle impose une proximité de persistance, mais ne fait pas dépendre le domaine Auth du domaine User.

## 2. Cartographie des flux API

| Route | Flux principal |
| --- | --- |
| `POST /auth/login` | DTO → identité EMAIL → comparaison bcrypt → statut User → session → JWT |
| `GET /auth/google` | Guard Passport → state lié au navigateur → redirection Google |
| `GET /auth/google/callback` | Validation state/profil → identité GOOGLE ou création User + identité → session → JWT |
| `GET /auth/me` | JWT access → SessionValidator → DTO subjectId/sessionId |
| `POST /auth/refresh` | DTO → JWT refresh → SessionValidator → activité sauvegardée → nouvel access token |
| `POST /auth/logout` | JWT access → SessionValidator → révocation → sauvegarde |

`SessionValidator` vérifie la session, la correspondance du sujet, l’identité associée et l’autorisation de connexion du User. Il refuse aussi les anciennes sessions Google d’un Super-Admin.

Au bootstrap : événement User → listener Auth → contrôle du rôle → `CreateSuperAdminIdentityUseCase` → hash → insertion EMAIL idempotente. Le listener propage les erreurs et le mot de passe existant n’est pas remplacé lors d’une nouvelle livraison.

## 3. Évaluation Clean Architecture

| Aspect | Évaluation |
| --- | --- |
| Application indépendante des frameworks | Conforme dans les imports et les constructeurs |
| Contrats internes de persistance et de services externes | Conforme |
| Entités métier distinctes des entités ORM | Conforme |
| DTO HTTP distincts des modèles applicatifs | Conforme |
| Assemblage Nest dans `AuthModule` | Conforme ; sa longueur n’est pas une violation en soi |
| Contrat d’erreur des gateways | Partiel : un adaptateur JWT laisse remonter une exception HTTP |
| Invariants à la reconstitution | Insuffisants |
| Atomicité et concurrence | Insuffisantes sur sessions et provisioning Google |
| Indépendance du domaine vis-à-vis du format JWT | Partielle, choix à expliciter |

**`application/models/google-identity.ts` est à sa place.** Il représente une entrée applicative issue d’un profil Google vérifié, sans importer Passport. Il ne faut pas le déplacer dans Domain uniquement à cause du mot « model ».

Des services applicatifs concrets comme `SessionValidator` peuvent être partagés entre use cases sans imposer une interface pour chacun. L’absence de value objects dans Auth n’est pas non plus une violation automatique : leur intérêt dépend des invariants à garantir.

## 4. Manquements prioritaires

### P1 — Une sauvegarde obsolète réactive une session révoquée — confirmé sur PostgreSQL

**Localisation :** `infrastructure/persistence/typeorm-session.repository.ts:36`, avec `RefreshTokenUseCase` et `LogoutUseCase`.

`save()` réécrit le statut et les champs de révocation à partir de l’objet reçu, sans condition sur l’état actuellement persisté.

Reproduction avec les repositories réels :

1. Deux lectures récupèrent la même session ACTIVE.
2. La copie du logout est révoquée puis sauvegardée : état en base REVOKED.
3. La copie détenue par le refresh est touchée puis sauvegardée.
4. État final observé : `status=ACTIVE`, `revokedAt=null`, `isActive=true`.

Le contrôle `isActive()` après sauvegarde dans le refresh ne protège pas : la sauvegarde vient précisément de réactiver la ligne. La modification concurrente peut également faire régresser la date d’activité.

**Correction recommandée :** opérations de persistance explicites pour toucher et révoquer une session, avec mises à jour conditionnelles atomiques ou versionnement optimiste. Une mise à jour d’activité ne doit jamais écrire ACTIVE sur une ligne révoquée. Couvrir les deux ordres d’exécution avec un test PostgreSQL.

### P1 — Création Google partielle et concurrence non maîtrisée

**Localisation :** `application/use-cases/google-login.usecase.ts:46`.

La création User est validée avant celle de l’identité Auth. Si la seconde échoue, le User reste enregistré sans identité. À la tentative suivante, l’email existe et la création User renvoie un conflit : le parcours ne répare pas cet état.

`loginQueue` ne protège qu’une instance et sérialise toutes ses connexions Google, y compris celles de personnes différentes. Deux instances peuvent toujours rechercher simultanément une identité absente. Les contraintes uniques évitent certains doublons, mais ne rendent pas la séquence idempotente et peuvent laisser remonter une erreur SQL brute.

**Correction recommandée :** un contrat applicatif de provisioning atomique/idempotent, implémenté avec une transaction commune dans ce monolithe ou une reprise persistée si les modules sont séparés. Ne pas introduire de rattachement automatique par simple égalité d’email : le refus de liaison implicite reste une règle utile.

Ce constat découle de la séquence du code ; aucune panne Google réelle n’a été provoquée pendant la revue.

### P2 — Invariants contournables à la reconstitution

**Localisations :** `domain/entities/auth-identity.ts:63`, `domain/entities/session.ts:60`, mappers associés.

Les deux méthodes `reconstitute()` clonent les propriétés sans les valider. `prepareCreation()` vérifie certains invariants, mais ce chemin est contourné au chargement depuis la base.

Exemples non rejetés à cette frontière : provider inconnu, identité EMAIL sans hash, identité GOOGLE avec hash, dates incohérentes, session ACTIVE avec une date de révocation. Les colonnes provider et status sont du texte ; leur annotation TypeScript ne fournit pas une validation SQL.

**Correction recommandée :** validations communes à la création et à la reconstitution, avec des objets valeur là où ils apportent une garantie : identifiants, référence fournisseur, durée et intervalle de validité. Compléter par des contraintes SQL pertinentes. Un objet `PasswordHash` peut valider une représentation, mais ne peut prouver à lui seul qu’une chaîne est effectivement issue d’un hash sécurisé.

### P2 — Une erreur HTTP traverse le contrat JWT

**Localisation :** `infrastructure/services/jwt.services.ts:36`.

L’adaptateur lève `UnauthorizedException`. Il est normal que ce fichier d’infrastructure importe Nest ; le problème est que cette erreur traverse le gateway vers des use cases réutilisables hors HTTP.

**Correction recommandée :** exception interne `InvalidTokenException` et traduction HTTP dans le filtre. Le `catch` global transforme également toute erreur de vérification, y compris une erreur technique inattendue, en échec d’authentification ; distinguer les erreurs attendues des défaillances internes.

Les `Error` génériques du domaine et du bootstrap méritent aussi une classification. Par exemple, une expiration entre `SessionValidator.validate()` et `Session.touch()` peut produire une erreur générique et donc une réponse 500 au lieu d’un refus de session.

### P2 — State OAuth limité à un processus

**Localisation :** `infrastructure/services/google-state.store.ts`.

Le state est aléatoire, lié au navigateur, limité à cinq minutes et consommé après validation : ces protections existent. Cependant, son stockage en `Map` disparaît au redémarrage. Avec plusieurs instances, un callback arrivant ailleurs est refusé.

**Correction recommandée si plusieurs instances sont prévues :** stockage partagé avec consommation atomique, expiration et liaison au navigateur conservées. Injecter le store depuis la composition au lieu de l’instancier dans `GoogleStrategy` faciliterait ce remplacement. Ce n’est pas une violation du domaine : c’est une limitation d’exploitation.

### P2 — Protection contre les tentatives répétées non visible dans le dépôt

Le login email appelle bcrypt mais aucune limitation de débit n’a été trouvée dans le module ou le bootstrap examiné. L’absence d’identité évite la comparaison bcrypt, contrairement à un mauvais mot de passe sur un compte existant : un écart temporel peut faciliter l’énumération, même avec le même message HTTP.

**Recommandation :** vérifier les protections du reverse proxy, puis définir une limitation par compte et origine et une comparaison factice pour réduire cet écart. Aucun dispositif extérieur au dépôt n’a été inspecté et aucune exploitabilité temporelle n’a été mesurée. [OWASP : Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).

### P3 — Politique de refresh réutilisable à assumer explicitement

Le refresh est réutilisable pendant la session de sept jours. Il n’est ni rotatif ni lié cryptographiquement à un client ; il n’existe pas de détection de réutilisation par `jti`. La révocation de session reste le mécanisme d’invalidation, sous réserve de corriger P1.

Ce choix ne viole pas la Clean Architecture. Il doit être évalué selon les clients et le scénario de vol de token. La rotation ou la liaison à l’émetteur sont des protections décrites pour les refresh tokens OAuth, notamment pour les clients publics ; leur exigence normative ne doit pas être appliquée mécaniquement à ce mécanisme de session interne. [RFC 9700, section 4.14](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.14).

## 5. Améliorations de conception secondaires

- `AccessToken` et `RefreshToken` produisent directement `sub`, `sid`, `iat`, `exp` avec `toClaims()`. Si le domaine doit être indépendant de JWT, déplacer ce mapping dans l’adaptateur et exposer des primitives métier. Si JWT fait partie du contrat produit assumé, ce couplage peut rester explicite.
- L’usage de `randomUUID()` du runtime Node ne constitue pas en soi une dépendance à Nest. Une horloge et un générateur injectables amélioreraient toutefois les tests et la cohérence temporelle. `AccessToken.create(now)` utilise encore `session.isActive()` basé sur l’heure réelle et ne valide pas directement un `now` invalide.
- Le plafond de 72 octets de bcrypt apparaît dans les use cases. Il s’agit d’une contrainte d’algorithme : centraliser cette politique faciliterait un changement de hasher.
- Email et Google dupliquent la fin de connexion : mise à jour d’identité, création de session et émission des tokens. Un service applicatif commun peut éviter les divergences, sans fusionner les use cases.
- Les assertions `!` après création masquent la possibilité d’une ligne devenue absente. Les erreurs de conflit et de disparition devraient avoir un contrat explicite, y compris hors bootstrap.

## 6. Tests et documentation

Vérifications réalisées durant cette revue :

- `npm run build` : réussi.
- Tests Auth hors suite HTTP PostgreSQL : **48 tests réussis dans 8 fichiers**.
- Reproduction ciblée du défaut refresh/logout avec les repositories réels sur PostgreSQL 16, dans une base temporaire créée puis supprimée.
- Pas de nouveau parcours OAuth réel, pas de mesure de charge ni de test d’intrusion. Les tests HTTP PostgreSQL de la précédente intervention ne sont pas présentés comme une nouvelle exécution.

Les quatre entités ont chacune leur fichier de test. Il manque notamment des tests unitaires dédiés aux use cases email, Google, refresh, authenticate et logout, ainsi qu’aux services partagés. La couverture HTTP existante ne couvre pas toutes les courses et pannes intermédiaires.

Tests à ajouter en priorité : révocation monotone en concurrence, panne entre création User et identité Google, provisioning depuis deux instances, état invalide chargé par mapper, expiration pendant refresh et contrat d’erreur du gateway JWT.

**Le README Auth est obsolète.** Il décrit encore SQLite, `DATABASE_PATH`, `BEGIN IMMEDIATE`, des adaptateurs mémoire et des tests supprimés. Il affirme aussi qu’une sauvegarde obsolète ne réactive pas une session révoquée, ce que la reproduction contredit. Enfin, il décrit un ancien abonnement événementiel et un échec en absence de listener : l’adaptateur EventEmitter2 actuel n’impose pas cette dernière garantie.

## 7. Ordre recommandé

1. Corriger la course refresh/logout et ajouter son test de non-régression.
2. Fiabiliser le provisioning Google et sa reprise après échec.
3. Renforcer les invariants à la reconstitution et normaliser les exceptions des ports.
4. Compléter les protections de connexion et décider de la politique de refresh et de déploiement multi-instance.
5. Actualiser le README et compléter les tests ciblés.

La structure générale peut être conservée. Les principaux travaux portent sur les garanties de persistance, les frontières d’erreur et les invariants, plutôt que sur un déplacement massif de fichiers.
