# Auth dans un backend modulaire unique

## Modèle simplifié

- `AuthIdentity` conserve la méthode de connexion : email normalisé ou `sub`
  Google, `subjectId`, hash de mot de passe pour EMAIL et dates de suivi.
  Le statut métier du sujet appartient à User ; il n’est pas dupliqué ici.
- `Session` conserve les identifiants (`id`, `subjectId`, `identityId`), le statut,
  les dates (`createdAt`, `lastActivityAt`, `expiresAt`, `revokedAt`), le motif
  de révocation et uniquement `userAgent` comme information facultative du client.
  La création reçoit `subjectId`, `identityId`, `userAgent` si disponible et
  `ttlSeconds` ; les dates et le statut initial sont préparés par le domaine, et la base attribue id.
- `AccessToken` et `RefreshToken` sont des objets de claims à signer, créés en
  mémoire puis envoyés au client. Aucun token, hash de token, liste de tokens ou
  historique de rotation n’est persisté côté backend.

Seuls AuthIdentity et Session ont des contrats de repository. Le hash du mot
de passe reste nécessaire : ce n’est pas un hash de token.

## Validation et renouvellement

Les adaptateurs JWT doivent vérifier signature, algorithme autorisé, issuer,
expiration et `tokenUse`. Les access tokens et refresh tokens ne contiennent pas
d’audience. Un refresh token ne doit jamais être accepté
comme access token, ni inversement. Le refresh token expire avec sa session ;
un renouvellement ne prolonge pas cette limite. L’access token dure au plus
15 minutes et ne dépasse pas la fin de session.

Après validation cryptographique, les futurs use cases et guards doivent :

1. Charger la session avec `sid`, refuser une session absente ou inactive.
2. Vérifier que `session.subjectId` correspond au claim `sub`.
3. Contrôler le droit de connexion via AuthSubjectPort (un sujet absent ou bloqué
   doit être refusé). Vérifier également que l’identité de session existe encore.
4. Pour un renouvellement, produire un nouvel access token depuis cette session.

La déconnexion révoque la session. La vérification de session sur chaque requête
permet de refuser aussi les access tokens encore non expirés. Les claims seuls
ne réalisent pas ce contrôle. L’access token ne contient ni rôles ni permissions ; les autorisations sont
contrôlées côté backend par les services métier.

Sans état de token persistant, un refresh token est réutilisable jusqu’à sa fin
ou à la révocation de session. Il n’y a pas de rotation à usage unique ni de
détection automatique du rejeu. Une invalidation explicite utilise le statut
`REVOKED` et peut être accompagnée d’un motif de révocation.

## Communication entre modules

Tout s’exécute dans le même processus NestJS : les modules communiquent par
injection de services et appels de méthodes, sans HTTP interne ni microservice.
Auth ne dépend d’aucune entité User. Un adaptateur d’AuthSubjectPort pourra appeler
un service public exporté par UserModule. La dépendance doit rester à sens unique.

L’initialisation du Super-Admin pourra être orchestrée dans un module de démarrage
qui importe User et Auth : création du sujet puis création de son identité EMAIL.
Cela évite un cycle où User importe Auth et Auth importe User. L’orchestrateur
devra garantir la cohérence transactionnelle et l’audit de cette création.

Les deux repositories peuvent utiliser la même base que les autres modules.
Le stockage devra imposer UNIQUE(provider, providerSubject),
UNIQUE(subjectId, provider) et la référence Session.identityId. Les snapshots
d’identité contiennent un hash sensible et ne sont pas des DTO de réponse.
L’email Google et son état de vérification restent des résultats du vérificateur
Google, sans duplication dans l’identité. Aucun rattachement par email implicite.

## État de l’implémentation

AuthModule est enregistré dans AppModule. Le domaine, les ports et leurs tests
sont présents. Le module reste un socle : repositories concrets, adaptateurs JWT,
Google et hachage, use cases, guards et endpoints ne sont pas encore branchés.
Les contrats de validation décrits ci-dessus doivent être implémentés avant
qu’une authentification soit opérationnelle.

## Dates gérées par le domaine

La base génère uniquement les identifiants des identités et sessions.
`prepareCreation(input, now)` prépare les dates de création, les valeurs initiales
et, pour Session, l’expiration calculée à partir de ttlSeconds. Les repositories
insèrent ces valeurs sans utiliser leur propre horloge puis renvoient la ligne
avec son identifiant via `reconstitute()`.

`AuthIdentity.markAuthenticated(now)` met à jour lastAuthenticatedAt et updatedAt.
`Session.touch(now)` met à jour lastActivityAt sans prolonger expiresAt.
`Session.revoke(reason, now)` renseigne le statut, revokedAt et le motif ; un nouvel
appel préserve la première révocation. Ces mutations sont en mémoire : l'appelant
doit ensuite appeler `repository.save(entity)`.

Pour fermer toutes les sessions, le use case charge `findBySubjectId()`, applique
`revoke()` avec une même date, puis sauvegarde dans une transaction adaptée.
L'adaptateur doit empêcher les écritures obsolètes de réactiver une session révoquée.
Il ne doit pas remplacer les dates métier par des timestamps ou triggers SQL.

`now` vaut l'heure courante par défaut et peut être fourni pour les tests.
Les tokens restent non persistés ; leurs dates sont également calculées dans
le domaine et leur expiration ne dépasse pas celle de la session.
Aucun adaptateur de base concret n'est encore branché : ces obligations de
persistance restent à implémenter.
