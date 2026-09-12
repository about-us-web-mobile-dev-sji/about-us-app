# Authentification Web et Mobile

Les identites EMAIL et GOOGLE utilisent les memes use cases et le meme
`SessionIssuer`. Les use cases retournent un `AuthenticationResult` contenant
`user: { id, email }`, `sessionId`, `accessToken`, `refreshToken`,
`tokenType` et `expiresIn`. Ils ne manipulent ni cookies ni objets HTTP.

## Configuration

Voir [.env.example](../../../.env.example). Exemple local :

```dotenv
AUTH_WEB_ORIGIN=http://localhost:4200
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/web/google/callback
GOOGLE_CLIENT_ID=<client OAuth Web>
GOOGLE_CLIENT_SECRET=<secret OAuth Web>
GOOGLE_ALLOWED_AUDIENCES=<audiences ID token autorisees, separees par des virgules>
JWT_SECRET=<au moins 32 octets>
JWT_ISSUER=about-us
```

Une liste d'audiences vide utilise `GOOGLE_CLIENT_ID`. Configurer le SDK mobile
pour demander un ID token destine a une audience autorisee par le backend.
Enregistrer exactement la callback dans Google Cloud. Aucun secret client Google
ne doit etre embarque dans l'application mobile.

`AUTH_WEB_ORIGIN` configure CORS avec credentials, la verification CSRF et la
redirection Google vers `<origine>/auth/callback`. Le frontend utilise
`withCredentials: true` (Angular) ou `credentials: 'include'` (fetch).
Les POST Web exigent le header navigateur `Origin` correspondant ; une origine
absente ou differente est refusee. Les navigations Google utilisent le `state`
OAuth a usage unique lie au navigateur.

En production : HTTPS et `NODE_ENV=production`. Les cookies sont HttpOnly,
SameSite=Lax et Secure en production. Le frontend et l'API doivent etre sur le
meme site pour cette politique SameSite (des sous-domaines conviennent).
L'access cookie utilise `/`, le refresh cookie `/auth/web` afin d'etre disponible
pour le renouvellement et la deconnexion. Le callback ne contient aucun token.

## Routes

| Route | Entree | Reponse |
| --- | --- | --- |
| POST /auth/web/login/email | JSON email/password, Origin | Cookies + user/sessionId |
| GET /auth/web/login/google | Navigation navigateur | Redirection Google |
| GET /auth/web/google/callback | Code et state Google | Cookies + redirection frontend |
| POST /auth/web/refresh | Cookie refresh_token, Origin | Cookies renouveles + user/sessionId |
| POST /auth/web/logout | Cookie refresh_token ou access_token, Origin | 204, cookies supprimes |
| POST /auth/mobile/login/email | JSON email/password | AuthenticationResult |
| POST /auth/mobile/login/google | JSON idToken | AuthenticationResult |
| POST /auth/mobile/refresh | JSON refreshToken | AuthenticationResult |
| POST /auth/mobile/logout | JSON refreshToken ou Bearer access token | 204 |
| GET /auth/me | Cookie access_token ou Bearer | user, subjectId, sessionId |

Le type WEB/MOBILE vient du controleur, jamais du corps fourni par le client.
Le renouvellement et la deconnexion verifient le type de session. Les anciennes
routes /auth/login, /auth/google, /auth/refresh et /auth/logout sont remplacees.

Sur mobile, conserver de preference l'access token en memoire et le refresh token
dans un stockage securise reposant sur Keychain/Keystore. Remplacer la paire apres
chaque renouvellement. Serialiser les renouvellements cote client : un token
consomme ne peut pas etre reutilise, meme apres une reponse reseau perdue.

## Identites et sessions

Google Web utilise Passport, l'echange de code serveur et le profil Google
verifie. Google Mobile utilise `google-auth-library` pour verifier la signature,
l'audience, l'emetteur et l'expiration de l'ID token, puis exige un email verifie.
Voir la [documentation Google](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).

L'identite Google est retrouvee par `sub`, jamais par l'email seul.
Plusieurs identites peuvent referencer le meme User. Le rattachement automatique
a un compte de meme email reste interdit (409) ; aucun endpoint de liaison de
comptes n'est ajoute. Le super-admin conserve son authentification par mot de passe.

Les access tokens sont des JWT HS256 de quinze minutes maximum. Les sessions
durent sept jours, sans prolongation lors du refresh. Les refresh tokens sont
opaques (32 octets aleatoires), et seul leur SHA-256 est persiste dans PostgreSQL.
La rotation utilise une mise a jour conditionnelle atomique : une seule requete
concurrente peut remplacer le hash courant. Un rejeu est refuse avec HTTP 401.
La revocation de session invalide tous ses tokens, sans fermer les autres sessions.
Une sauvegarde obsolete ne peut pas reactiver une session revoquee.

`AuthGuard`, exporte par AuthModule, protege les routes avec
`@UseGuards(AuthGuard)`. Il verifie la session, l'identite et le compte, puis
place le resultat dans `request.auth`. Pour les futures mutations utilisant des
cookies, appliquer aussi la verification d'origine de `auth-transport.ts` :
le guard d'authentification ne remplace pas la protection CSRF.

Le state OAuth reste en memoire : l'entree Google et sa callback doivent atteindre
le meme processus (affinite de session). Un redemarrage annule les flux en cours.

## Migration PostgreSQL

En developpement, `DATABASE_SYNCHRONIZE=true` ajoute les colonnes TypeORM.
En production, appliquer [la migration SQL](../../../docs/migrations/20260909-auth-transports.sql)
avec le processus habituel de deploiement, avant de lancer cette version.
Elle ajoute le hash de refresh et le type de client, puis revoque les anciennes
sessions sans hash. Une reconnexion est donc necessaire ; les anciens refresh JWT
ne sont plus acceptes. Aucune migration n'est lancee automatiquement en production.

## Verification

```sh
npm run build
npm run lint
npm test
TEST_DATABASE_URL=postgresql://... npm test
TEST_DATABASE_URL=postgresql://... npm run test:e2e
npx tsc --noEmit --incremental false
```

Les tests PostgreSQL creent et suppriment leurs propres bases temporaires sur un
serveur de test disposant du droit CREATE DATABASE. Sans TEST_DATABASE_URL,
ils sont ignores. Les tests couvrent cookies, CSRF, connexions email/Google,
rotation concurrente, rejeu, revocation et restrictions de compte.
Les tests du verificateur Google utilisent de vrais JWT RSA avec des cles de test ;
seul le telechargement des certificats est simule. Le consentement Google reel
necessite une verification interactive avec le client OAuth configure.

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
