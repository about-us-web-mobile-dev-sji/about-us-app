# Module de notifications About Us

## Analyse du dépôt et choix

Le dépôt contient NestJS 12, TypeScript 6, TypeORM 1.1, PostgreSQL,
`@nestjs/event-emitter`, `class-validator`/`class-transformer` et Vitest.
Les modules user, auth, school et event sont actifs. Le répertoire notification
contenait des ébauches non suivies par Git ; elles ont été complétées.

Conventions conservées : domaine/application/infrastructure, imports ESM `.js`,
ports TypeScript et injection par factories NestJS. L'API publique est exportée
sous le token `NOTIFICATION_API`. Le dossier reste au singulier `notification`.

Le stockage utilise le DataSource TypeORM et du SQL PostgreSQL paramétré dans un
adaptateur dédié. Cette approche permet les verrous `FOR UPDATE SKIP LOCKED` et
les transactions sans relations ORM vers d'autres modules. Les objets de lecture
sont mappés explicitement ; aucune ligne SQL brute n'est retournée aux clients.
Le répertoire `docs/migrations` contenait déjà des migrations SQL manuelles.

L'authentification utilise JWT, sessions persistées et `AuthGuard` ; les endpoints
identifient le destinataire depuis `request.auth.subjectId`. Les mutations par
cookie vérifient l'origine Web, comme les routes auth existantes. La validation
est installée sur le contrôleur, car le bootstrap n'a pas de ValidationPipe global.
Les filtres d'exception Nest existants restent actifs.

Les écoles sont le contexte organisationnel, mais aucun tenant courant partagé
n'existe dans l'authentification. La boîte de réception est donc personnelle,
transversale aux écoles. `organizationId` vient uniquement d'un producteur
interne ; aucun endpoint ne l'accepte pour créer ou cibler une notification.

Aucun fournisseur email, WebSocket, Redis ou module de documents/RAG n'est présent.
Nodemailer est ajouté pour SMTP avec TLS obligatoire, secrets d'environnement et
restrictions d'accès aux fichiers/URL. Le port temps réel a un adaptateur no-op.
Les ports Clock, RecipientDirectory, TemplateRenderer, EmailSender, repositories
et RealtimePublisher permettent les substitutions de tests.

## Flux

1. Un producteur interne appelle `NotificationApi.request` après son écriture métier,
   ou publie un événement existant.
2. La demande et le payload sont validés (UUID, 100 destinataires maximum,
   8 Kio maximum, liste blanche de variables, 200 caractères par variable).
3. Le destinataire est résolu exclusivement via l'API publique `UserAccountService`.
   Les préférences et la langue déterminent les canaux et le contenu.
4. Une transaction enregistre un identifiant de demande, les notifications et les
   livraisons email en attente. Un conflit sur la demande ne produit aucun doublon.
5. Le worker réclame une livraison, puis ferme sa transaction avant l'appel SMTP.
   Une autre transaction enregistre le résultat et l'audit de tentative.
6. L'in-app est disponible immédiatement après le commit, même si l'email échoue.

Les événements de création de compte (Google ou super-admin), changement de statut,
invitation envoyée/acceptée et remplacement d'administrateur sont branchés.
Les erreurs des listeners sont journalisées sans propager l'échec à l'opération
métier. Les événements de statut et rôle portent un identifiant stable par événement.
Rejouer une demande nécessite de conserver le même `requestId`.

## Types retenus

Tous utilisent IN_APP et EMAIL par défaut. Les préférences absentes ne sont pas
matérialisées en base. La désactivation des deux canaux est permise sauf pour
SECURITY_ALERT, qui impose les deux canaux, même si la demande en omet un.

| Type | Producteur / destinataire | Sévérité | Variables | Email désactivable | Rétention |
| --- | --- | --- | --- | --- | --- |
| WELCOME | user / compte créé | INFO | firstName facultatif | oui | durée normale |
| MEMBER_INVITED | school / compte correspondant à l'adresse invitée | INFO | schoolName | oui | durée normale |
| MEMBER_JOINED | school / auteur de l'invitation | INFO | schoolName | oui | durée normale |
| MEMBER_ROLE_CHANGED | school / ancien et nouvel administrateurs | INFO | schoolName | oui | durée normale |
| SECURITY_ALERT | user / compte dont le statut change | WARNING | status facultatif | non | durée sécurité |

Les textes FR/EN sont centralisés dans `notification-templates.ts`, identifiés
par type, canal et langue. Le contenu rendu est conservé lors de la création.
Les variables HTML sont échappées ; les variables requises absentes échouent
avant toute écriture. La langue suit : demande, destinataire, organisation,
configuration, français. Les variantes régionales sont normalisées ; une langue
non supportée passe au candidat suivant. Le catalogue fournit un repli générique.
Le modèle utilisateur/école actuel n'a pas de langue : leurs valeurs restent
absentes jusqu'à l'extension de leur API publique.

## API

Toutes les routes exigent l'authentification Web ou mobile existante.

| Méthode | Route | Résultat |
| --- | --- | --- |
| GET | /notifications?page=1&limit=20&read=false&type=WELCOME | `{ items, total }`, date et UUID décroissants |
| GET | /notifications/unread-count | `{ count }` |
| GET | /notifications/:id | message personnel, sinon 404 |
| PATCH | /notifications/:id/read | 204, idempotent |
| PATCH | /notifications/read-all | 204 |
| GET | /notification-preferences | valeurs effectives par type |
| PUT | /notification-preferences/:type | `{ inAppEnabled, emailEnabled }`, 204 |
| POST | /notifications-admin/deliveries/:id/retry | super-admin uniquement, 204 |

Pagination : limite 1–100, page 1–100000. Les champs inconnus sont rejetés.
Aucun endpoint HTTP ne permet de demander une notification arbitraire.
Les messages email seuls, expirés ou appartenant à un autre utilisateur sont
inaccessibles. Les vues excluent l'adresse email, le fournisseur et les erreurs.

## Migration et démarrage

Migration additive : `docs/migrations/20260915-notifications.sql`.
Elle crée le schéma `notification` et cinq tables : `notifications`, `deliveries`,
`preferences`, `processed_requests`, `delivery_attempts`.

En production (`DATABASE_SYNCHRONIZE=false`), l'appliquer **avant** le déploiement :

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f docs/migrations/20260915-notifications.sql
```

`DATABASE_URL` est ici une variable d'exploitation passée à psql ; l'application
continue à lire les variables `DATABASE_*` documentées dans `.env.example`.
Aucune migration n'a été exécutée sur votre base applicative pendant ce travail.

En développement avec synchronisation activée, la migration TypeORM
`Notifications1789430400000` s'exécute après la synchronisation existante. La
migration SQL et la migration TypeORM créent le même schéma et sont rejouables.
Le rollback destructif n'est pas automatique : conserver les données et
l'historique de déduplication exige une décision explicite de rétention.

Configurer les variables ajoutées à `.env.example`. `EMAIL_ENABLED=false` par
défaut : les emails programmés sont classés DEAD_LETTER avec EMAIL_DISABLED et
restent réessayables après configuration SMTP, pendant leur rétention.
Aucun faux succès d'envoi n'est enregistré.

`SMTP_SECURE=true` correspond au TLS implicite, généralement port 465 ; `false`
exige STARTTLS, généralement port 587. L'authentification SMTP peut être omise
pour un relais autorisé, mais utilisateur et mot de passe doivent être renseignés
ensemble. Les valeurs invalides font échouer la configuration au démarrage.

## Fiabilité, audit et exploitation

- Unicité par demande, destinataire et canal ; historique minimal des demandes
  conservé sans limite pour qu'un replay ne ressuscite pas des messages supprimés.
- Verrou de deux minutes avec renouvellement toutes les 30 secondes ; un jeton de
  possession empêche un ancien worker de finaliser la livraison reprise ailleurs.
- Cinq tentatives maximum : immédiate, puis 30 s, 2 min, 10 min, 30 min après
  chaque échec précédent. Les timeouts/réseaux et réponses SMTP 4xx sont temporaires.
  Une adresse invalide, l'authentification SMTP ou une réponse SMTP 5xx est définitive
  (la sémantique SMTP diffère des erreurs HTTP 5xx).
- Chaque tentative a une entrée PROCESSING puis son résultat. Une tentative
  interrompue reste visible ; les baux expirés à la limite passent en DEAD_LETTER.
- Renvoi manuel : DEAD_LETTER seulement, délai minimal d'une minute, au plus dix
  renvois par administrateur par minute ; contrôles atomiques en PostgreSQL.
  L'audit contient l'identité administrative. Le compteur de tentatives repart
  à zéro ; l'historique antérieur reste conservé.
- Les logs structurés contiennent les événements et identifiants utiles, jamais
  le texte SMTP, le contenu d'email ou une adresse destinataire. Les erreurs
  exposées sont des codes contrôlés. Le log existant d'invitation a été assaini.
- Nettoyage horaire : notifications expirées sans livraison active, livraisons
  terminales et tentatives selon la rétention technique ; durée de sécurité
  distincte. Une notification email en attente reste conservée jusqu'au traitement.
- Le contenu email est supprimé dès le succès. Les paramètres de rétention sont
  configurables ; aucune livraison PROCESSING n'est supprimée par le nettoyage.

## Limites explicites

- SMTP ne fournit pas d'exactly-once : une panne après acceptation mais avant le
  commit du succès peut dupliquer un email. Un Message-ID stable aide au diagnostic
  mais ne garantit pas la déduplication par le fournisseur. Une partition réseau
  empêchant le renouvellement d'un bail présente la même limite.
- L'EventEmitter existant est en mémoire. Une panne entre l'écriture du producteur
  et l'enregistrement de la notification peut perdre l'événement. La transaction
  notification/email est durable une fois acceptée ; garantir le premier segment
  nécessiterait un outbox transactionnel dans chaque producteur.
- Une invitation à une adresse sans compte existant est signalée par un log
  `notification.recipient_unavailable`. Elle ne crée pas d'utilisateur implicitement.
  Le modèle d'invitation externe devra exposer un destinataire public pour ce cas.
- Vérification email, OTP, réinitialisation, indexation et documents ne sont pas
  implémentés dans ce dépôt. Ces types ne sont pas simulés. Leur ajout devra définir
  un transport de secrets dédié ; les payloads actuels refusent tokens, OTP et liens.
- Pas de push WebSocket/mobile, ni de nouvelle infrastructure de métriques.
  L'intégration Observe existante n'expose pas de convention de métriques métier.
- Les identifiants de demandes occupent une table croissante volontairement ;
  leur purge exige une politique explicite limitant la fenêtre de replay.
- Aucun envoi vers un serveur SMTP réel n'a été effectué ; fournir la configuration
  de votre relais et vérifier un envoi lors du déploiement.

## Fichiers

- `src/modules/notification/api` : contrat public et vues.
- `domain` : notification, livraison, destinataire, rendu, canaux et politiques.
- `application/ports` : interfaces ; `application/use-cases` : création et gestion personnelle.
- `infrastructure/persistence` : repository PostgreSQL et migration TypeORM.
- `infrastructure/templates`, `email`, `workers` : rendu, SMTP et traitement différé.
- `infrastructure/http`, `events` : DTO, routes et listeners des producteurs.
- `notification.module.ts` : assemblage ; `notification*.spec.ts` : tests.
- `src/app.module.ts`, `src/main.ts`, `database.module.ts` : chargement et arrêt.
- `UserAccountService`, `UserModule`, événement de statut : API destinataires et événements.
- `ReplaceSchoolAdministrator`, `SchoolModule` : événement de changement de rôle.
- `InvitationSentListener` : suppression de l'adresse email dans le log.
- `.env.example`, `package.json`, `package-lock.json` : configuration et dépendances SMTP.
- `test/app.e2e-spec.ts` : contrôle d'intégration avec authentification réelle et
  correction de l'ancienne assertion `name` devenue `database` dans la configuration.

## Validation

```sh
npm run build
npm run lint
TEST_DATABASE_URL=postgresql://... npm test
TEST_DATABASE_URL=postgresql://... npm run test:e2e
```

Les tests PostgreSQL utilisent des bases aléatoires créées puis supprimées par
le helper existant. Ne fournir qu'un serveur dédié aux tests avec CREATE DATABASE.
Les tests couvrent les contraintes, transactions, pagination, propriété, préférences,
langues, templates, transitions, erreurs SMTP, concurrence, reprise, rétention,
renvoi manuel, endpoints HTTP et le branchement réel auth → notifications.
