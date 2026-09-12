# Corrections du module User

## Architecture et invariants

Le domaine utilise désormais `Email` et `UserId`, deux objets valeur immuables. `Email` normalise et valide l’adresse ; `UserId` valide le format UUID. `User` les construit à la création comme à la reconstitution et contrôle aussi les valeurs du rôle et du statut. Les getters continuent à fournir des primitives pour préserver les contrats des appelants.

`UserAccountService` lève `UserEmailAlreadyUsedException`, indépendante de Nest. Le filtre HTTP User traduit les conflits en 409 et les données métier invalides en 400. Les erreurs inattendues restent des erreurs serveur.

`CreateSuperAdminUseCase` dépend de `SuperAdminEventsGateway`, dans `application/gateway`. L’adaptateur Nest publie l’événement ; l’initialiseur attend la disponibilité des listeners. Le listener Auth propage ses erreurs. Un redémarrage republie l’événement pour réparer une éventuelle interruption entre la sauvegarde du User et celle de l’identité. Ce mécanisme ne constitue pas une transaction distribuée ni une file durable.

## Persistance

- `UserMapper`, `AuthIdentityMapper` et `SessionMapper` sélectionnent explicitement les champs entre ORM et domaine.
- Le repository utilise `User.createSuperAdmin()` pour les règles initiales.
- La transaction du bootstrap prend un verrou consultatif PostgreSQL commun à toutes les instances, puis recherche de nouveau le Super-Admin. Elle n’interdit pas au métier de créer d’autres Super-Admins ultérieurement.
- Les contraintes uniques des identités couvrent `(provider, providerSubject)` et `(subjectId, provider)`. `ON CONFLICT DO NOTHING` gère la concurrence sans masquer les autres erreurs SQL.
- Les dates Auth utilisent `bigint` avec un transformer pour préserver les millisecondes.
- User ne référence plus l’entité ORM Auth. Les relations et clés étrangères Auth → User sont conservées.
- Les providers utilisent des imports ESM statiques. `user.enity.ts` est renommé `user.entity.ts` et l’ancien modèle `PUser` inutilisé est supprimé.

## API et DTO

Les endpoints existants gardent leurs routes et leurs champs de réponse :

| Endpoint                    | Entrée / sortie                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------ |
| `POST /auth/login`          | `EmailLoginDto.parse()` valide l’entrée ; `TokenResponseDto` représente la réponse   |
| `POST /auth/refresh`        | `RefreshTokenDto.parse()` valide l’entrée ; `TokenResponseDto` représente la réponse |
| `GET /auth/google/callback` | `TokenResponseDto` représente la réponse                                             |
| `GET /auth/me`              | `AuthenticatedSubjectDto` représente la réponse                                      |

`AuthResponseMapper` sélectionne les propriétés publiques. La validation est explicite à l’exécution, sans dépendre de décorateurs qui nécessiteraient un ValidationPipe supplémentaire. Les champs additionnels des requêtes ne sont pas transmis aux use cases.

Les routes du module User utilisent les requêtes et réponses définies dans `infrastructure/api`. Le dossier `infrastructure/http` contient le filtre de traduction des exceptions métier en réponses HTTP.

## Configuration de développement

Les migrations ont été retirées à la demande de l’utilisateur. Le schéma est synchronisé depuis les entités TypeORM au démarrage en développement, après création des schémas PostgreSQL `auth` et `user`.

`DATABASE_*` reste la convention principale, avec compatibilité des anciens `DB_*`. Le port et le booléen sont validés. `DATABASE_SYNCHRONIZE=true` active explicitement la synchronisation ; sans valeur explicite, elle est active hors production et désactivée en production. Le fichier `.env.example` est configuré pour le développement.

Aucune commande de migration n’est nécessaire. Les tests initialisent aussi leurs bases temporaires par synchronisation. La base de l’application n’a pas été modifiée pendant cette adaptation.

## Vérification

- Tests unitaires et d’intégration : 92 réussis, dont les tests HTTP Auth.
- Tests e2e AppModule : 2 réussis, avec sa véritable configuration TypeORM.
- Build TypeScript et imports ESM User/Auth vérifiés.
- Concurrence via deux DataSources indépendantes, reprise après reconnexion, conflits d’email, unicité des identités et conservation des dates vérifiées sur PostgreSQL 16.
- Les anciens tests propres aux migrations ont été retirés ; le test de conformité du schéma utilise maintenant la synchronisation TypeORM.

Pour exécuter également les tests PostgreSQL :

```sh
TEST_DATABASE_URL=postgresql://postgres:password@localhost:5432/postgres npm test
TEST_DATABASE_URL=postgresql://postgres:password@localhost:5432/postgres npm run test:e2e
```

Utiliser un serveur de test avec le droit CREATE DATABASE. Chaque test crée puis supprime uniquement sa propre base au nom aléatoire. Sans cette variable, les suites PostgreSQL sont explicitement ignorées.

Le worker Observe préexistant signale un redémarrage durant les tests e2e, bien que les deux tests réussissent. L’audit métier reste exclu du périmètre.

## Vérifications complémentaires

Les routes HTTP sont conservées, conformément au choix confirmé. Le DTO User reste disponible pour une future route autorisée.

Treize tests supplémentaires couvrent désormais la façade User et la création de l’identité initiale : normalisation et conflit d’email, compte absent ou suspendu, persistance exclusive du hash, conservation du mot de passe lors des redélivrances, limite de 72 octets UTF-8 et reprise après une erreur de persistance. Ces treize tests passent, ainsi que la vérification TypeScript. Les 94 tests précédemment exécutés ne sont pas recomptés comme une nouvelle exécution complète.

L’assertion non-null redondante dans `Session.revoke()` a été supprimée ; les tests de Session ont été revérifiés et le lint ne signale plus d’avertissement.
