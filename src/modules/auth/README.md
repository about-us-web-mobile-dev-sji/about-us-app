# Authentification Google et email/mot de passe

## Configuration et lancement

Le backend utilise le flux OAuth par redirection de `passport-google-oauth20`.
Renseigner ces variables dans `.env` (voir aussi `.env.example`) :

```dotenv
GOOGLE_CLIENT_ID=identifiant-du-client-web-google
GOOGLE_CLIENT_SECRET=secret-du-client-google
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
JWT_SECRET=
JWT_ISSUER=about-us
DATABASE_PATH=./data/about-us.sqlite
```

Générer une valeur pour `JWT_SECRET` avec `openssl rand -hex 32` et la placer dans
`.env`. La configuration exige au moins 32 octets et ne contient pas de secret
par défaut. Ne pas committer les secrets.

Dans Google Cloud, créer un client OAuth de type application Web, configurer
l'écran de consentement et les utilisateurs de test si l'application est en mode
test. Enregistrer exactement `GOOGLE_CALLBACK_URL` comme URI de redirection
autorisée. Démarrer avec `npm run start:dev`, puis ouvrir
`http://localhost:3000/auth/google` dans le navigateur.

## Parcours

1. `GET /auth/google` redirige vers Google avec les scopes `openid`, `email` et
   `profile`. Un `state` aléatoire valable cinq minutes est lié au navigateur par
   un cookie HttpOnly, SameSite=Lax et Secure en production.
2. Google renvoie un code à `GET /auth/google/callback`. Passport vérifie le
   `state` à usage unique, échange le code côté serveur et charge le profil Google.
   Les tokens Google ne sont ni conservés ni retournés au client.
3. `GoogleStrategy.validate()` exige un email vérifié. `profile.id` est le `sub`
   Google, pas un ID token JWT : il n'est pas envoyé à `verifyIdToken()`.
   Le modèle `application/models/google-identity.ts` représente ce profil obtenu
   du serveur Google. L'ancien gateway de vérification d'ID token a été retiré,
   car il correspondait à un autre mode de connexion.
4. `GoogleLoginUseCase` retrouve l'identité avec `(GOOGLE, sub)`. À la première
   connexion, il crée le compte via `AuthSubjectGateway` puis l'identité Google.
   Un email déjà utilisé produit HTTP 409 : aucun rattachement implicite au compte
   existant. Une connexion suivante retrouve le compte par `sub`, même si son
   email Google change. Un compte absent ou suspendu est refusé.
5. Le service sauvegarde la date de connexion et une nouvelle session de sept
   jours. Les entités calculent les claims ; les adaptateurs Nest signent les JWT
   avec HS256. L'access token dure au plus quinze minutes, sans dépasser la session.

Le callback répond en JSON, avec `Cache-Control: no-store` :

```json
{
  "accessToken": "<jwt de l'application>",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "refreshToken": "<jwt de renouvellement de l'application>"
}
```

Ce backend ne comporte pas de frontend : après le consentement, le navigateur
voit cette réponse JSON. Il n'y a pas de redirection vers une page frontend ni de
token ajouté à une URL. L'intégration d'une interface navigateur devra définir
son propre mécanisme de remise et de conservation des tokens.

## Routes de session

| Route | Entrée | Résultat |
| --- | --- | --- |
| `GET /auth/me` | `Authorization: Bearer <accessToken>` | `subjectId` et `sessionId` |
| `POST /auth/refresh` | JSON `{ "refreshToken": "..." }` | Nouvel access token, type et durée |
| `POST /auth/logout` | `Authorization: Bearer <accessToken>` | HTTP 204 ; session révoquée |

Les adaptateurs JWT vérifient signature, algorithme, émetteur, expiration,
structure des claims et `tokenUse`. Le service vérifie ensuite la session,
sa correspondance avec `sub`, l'identité associée et le statut du compte User.
La révocation invalide les access tokens encore valables et le refresh token de
cette session ; elle ne ferme pas les autres sessions de l'utilisateur.

Un refresh token reste réutilisable jusqu'à la fin de sa session. Il n'y a pas
de rotation à usage unique, de hash de token ou d'historique de tokens stocké.
Un renouvellement ne prolonge pas les sept jours. Pour protéger de nouvelles
routes métier, appeler `AuthenticateUseCase.handle()` depuis leur guard ;
l'export de ce use case ne protège pas automatiquement tous les contrôleurs.

## Structure et stockage

- `application/use-cases` contient les opérations indépendantes, chacune exposant
  `handle()` : `GoogleLoginUseCase`, `RefreshTokenUseCase`, `AuthenticateUseCase`,
  `LogoutUseCase`, `EmailLoginUseCase` et `CreateSuperAdminIdentityUseCase`. Le contrôleur appelle directement le use case de sa route.
- `application/services` mutualise la validation des sessions (`SessionValidator`)
  et l'émission d'access tokens (`AccessTokenIssuer`). Les use cases ne s'appellent
  pas entre eux et reçoivent uniquement les dépendances nécessaires.
- `AuthModule` enregistre les use cases et exporte ceux de connexion et de session ; les services partagés
  restent internes. La file de création des comptes reste propre à `GoogleLoginUseCase`.
- `application/gateways` contient les contrats et tokens d'injection.
- `infrastructure/services` contient Passport, les adaptateurs JWT, bcrypt et
  l'adaptateur vers le service public `UserAccountService`.
- `infrastructure/http` expose les routes.
- `infrastructure/persistence` contient les repositories SQLite utilisés par Auth.
  Les adaptateurs en mémoire restent disponibles pour les tests unitaires.

La dépendance est Auth → User ; User ne dépend pas d'Auth. Les entités Auth
ne dépendent pas des entités User. Le gateway bcrypt est enregistré dans Auth,
et utilisé pour créer l’identité du super-admin et vérifier la connexion email.
Le démarrage du super-admin publie un événement User dont le traitement Auth est attendu.

**Les comptes, identités et sessions sont persistés dans SQLite**, au chemin
`DATABASE_PATH` (par défaut `./data/about-us.sqlite`). `DatabaseModule`, dans
`shared/infrastructure/database`, partage une connexion entre User et Auth et la
ferme à l'arrêt. Node 24 ou supérieur est requis pour `node:sqlite`.
Le schéma est initialisé automatiquement, avec unicité des emails, des identités
par fournisseur/sujet et des références entre compte, identité et session.
Les fichiers de base et journaux sont ignorés par Git. La base est créée avec
les permissions 0600 ; les nouveaux répertoires utilisent 0700.

Les transactions de bootstrap utilisent `BEGIN IMMEDIATE` et une attente de verrou
limitée à dix secondes. La garantie de concurrence concerne les processus utilisant
le **même fichier SQLite sur le même hôte**. Des bases séparées ne partagent pas cette
garantie. En conteneur, monter un volume persistant ; pour plusieurs hôtes, utiliser
un service de base de données partagé et les adaptateurs correspondants.
Les mécanismes utilisés sont documentés dans [Node SQLite](https://nodejs.org/api/sqlite.html)
et [les transactions SQLite](https://www.sqlite.org/lang_transaction.html).

Le repository Session empêche une sauvegarde obsolète de réactiver une session
révoquée ; ses dates d'expiration ne sont pas recalculées lors des sauvegardes.
Les transactions OAuth `state` restent en mémoire : elles expirent au redémarrage
et nécessitent que l'entrée Google et son callback atteignent le même processus.
Aucune donnée des anciens repositories en mémoire ne peut être migrée après leur
arrêt ; les données de démonstration ne sont plus insérées automatiquement.

En production, utiliser HTTPS et `NODE_ENV=production` pour le cookie OAuth Secure.
La callback doit rester sur le même hôte que le point d'entrée de connexion.

## Vérifications

`npm test` couvre les entités et un parcours HTTP complet avec les appels Google
simulés : redirection, callback, reconnexion, renouvellement, déconnexion, comptes
suspendus, email existant, email non vérifié, mauvais tokens et protection state.
`npm run test:e2e` vérifie le démarrage d'AppModule et sa route d'accueil.
`npx tsc --noEmit` vérifie aussi les signatures TypeScript des tests.

La connexion réelle nécessite un client OAuth Google configuré et un consentement
interactif ; elle n'est pas effectuée par les tests automatisés.

## Erreurs applicatives et HTTP

La couche Application ne dépend pas de NestJS. Elle lève `InvalidSessionException`,
`AccountUnavailableException`, `InvalidGoogleIdentityException` ou
`InvalidCredentialsException`, définies dans
`domain/exceptions` et dérivées de `Error`, sans statut HTTP.

`AuthApplicationExceptionFilter`, dans `infrastructure/http`, traduit uniquement ces
exceptions en HTTP 401 avec le format `{ statusCode, message, error }`.
Le filtre est enregistré via `APP_FILTER` dans AuthModule : il s'applique aussi
aux routes d'autres modules utilisant les use cases exportés. Les erreurs HTTP
existantes et les erreurs inattendues restent traitées par Nest normalement.

## Super-admin : événement User → Auth

Configurer `SUPER_ADMIN_EMAIL` et `SUPER_ADMIN_PASSWORD` pour la première initialisation.
Un Super-Admin déjà enregistré avec son identité ne nécessite plus ces paramètres.
Le mot de passe est obligatoire pour la première création de l'identité et limité
à 72 octets UTF-8, limite de bcrypt ; ne pas utiliser une valeur tronquée.

1. `SuperAdminInitializer` appelle `CreateSuperAdminUseCase` au bootstrap.
2. User recherche un compte par le rôle `SUPER_ADMIN`. S'il est absent, le
   repository vérifie à nouveau sous transaction puis crée un User `ACTIVE` avec
   ce rôle. Un email occupé par un compte ordinaire est refusé, sans promotion
   implicite. Un Super-Admin existant est conservé, même suspendu ou avec un email
   différent de la configuration. User récupère son identifiant puis publie
   `SuperAdminCreatedEvent(subjectId, email)` via `SuperAdminEventsGateway`.
   L'événement ne contient ni mot de passe ni hash. Une rediffusion pour un User
   existant permet de reprendre un bootstrap interrompu après la sauvegarde User.
3. `SuperAdminCreatedListener` s'abonne dans `onModuleInit`, avant le bootstrap.
   Il lit le mot de passe dans la configuration Auth et appelle
   `CreateSuperAdminIdentityUseCase.handle()`.
4. Ce use case impose `AuthProvider.EMAIL`, normalise l'email, hache le mot de
   passe via bcrypt et attend la sauvegarde de l'identité. Il ne reçoit pas de
   fournisseur ou de hash de l'émetteur. Une identité déjà créée pour le même
   sujet est conservée ; une nouvelle livraison ne change pas son mot de passe.
5. La publication attend les listeners. En cas d'absence de listener ou d'erreur,
   le bootstrap échoue, au lieu d'annoncer un démarrage complet avec une identité
   manquante. L'abonnement est retiré à l'arrêt du module.

Le bus est typé, local au processus et implémenté sans dépendance supplémentaire.
User expose le contrat d'événement ; seul l'adaptateur Auth importe ce contrat.
User n'importe aucun fichier Auth. Ce bus ne constitue pas une outbox persistante :
le bootstrap rediffuse l'événement depuis le compte persisté pour réparer une
interruption entre sauvegarde User et création de l'identité. Ce parcours n'est pas
une transaction unique User/Auth : un échec laisse un compte sans credentials,
mais bloque le démarrage et sera repris au prochain essai. La création d'identité
utilise les contraintes SQL et conserve celle gagnant une éventuelle course.

Le rôle global `SUPER_ADMIN` est stocké sur User. La restriction à l'authentification
par mot de passe dépend de ce rôle et non de l'email configuré. Les connexions Google
et les anciennes sessions Google sont refusées pour ce rôle. Changer la configuration
ne renomme pas le compte et ne crée pas de second Super-Admin.

### Connexion email/mot de passe

```http
POST /auth/login
Content-Type: application/json

{"email":"admin@example.com","password":"<mot de passe configuré>"}
```

`EmailLoginUseCase` recherche exclusivement une identité EMAIL, compare le mot de
passe au hash et refuse un compte suspendu. Il crée une session et renvoie les mêmes
champs que Google : `accessToken`, `refreshToken`, `tokenType`, `expiresIn`, avec
`Cache-Control: no-store`. Les routes `/auth/me`, `/auth/refresh` et `/auth/logout`
fonctionnent aussi pour ces sessions. Un mauvais email ou mot de passe produit
la même réponse HTTP 401 ; le hash n'est jamais inclus dans la réponse.

Modifier `SUPER_ADMIN_PASSWORD` ne réinitialise pas une identité déjà enregistrée.
Les redémarrages conservent le hash en base. Un changement de mot de passe devra
passer par un flux explicite dédié, distinct du bootstrap.

## SYS 1.0

Les tests `test/sys10-persistence.spec.ts` couvrent les redémarrages sur un fichier
conservé, la configuration modifiée ou absente, le rôle, le hash bcrypt, les sessions
persistées, la reprise après un échec et quatre processus concurrents. L'audit de
création est volontairement exclu de cette livraison ; les logs existants de
bootstrap ne constituent pas un audit.
