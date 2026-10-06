# Cartographie et revue du module User

> État avant correction. Voir [les changements et leur validation](user-module-changes.md) pour l’état corrigé.

Date : 8 septembre 2026. Périmètre : version actuelle TypeORM/PostgreSQL, module User et interfaces avec Auth et DatabaseModule. Analyse du code ; aucune correction fonctionnelle effectuée dans cette revue. L’audit métier reste hors périmètre, conformément à la demande précédente.

## Conclusion

Le module suit **partiellement** la Clean Architecture. Le domaine est indépendant de Nest et de TypeORM, le repository est défini par une interface interne, et les adaptateurs techniques sont séparés. Cependant, Application connaît encore une exception HTTP Nest et le bus EventEmitter2. La persistance du Super-Admin contourne également sa fabrique métier.

La structure des dossiers est donc une bonne base, mais elle ne suffit pas à garantir l’indépendance des couches. Des problèmes de démarrage et de concurrence existent en plus des écarts architecturaux.

La règle de référence est que les dépendances du code pointent vers les couches internes : les frameworks et la base de données sont des détails externes. [Référence : Robert C. Martin, The Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html).

## 1. Cartographie physique

```text
user/
├── user.module.ts                         Assemblage des dépendances Nest
├── application/
│   ├── user-account.service.ts            Façade de gestion et consultation
│   └── use-cases/create-super-admin/
│       └── create-super-admin.usecase.ts  Orchestration de l’initialisation
├── domain/
│   ├── entities/
│   │   ├── user.enity.ts                  Entité métier User
│   │   └── user.enity.spec.ts             Tests de l’entité
│   ├── enum/
│   │   ├── global-role.enum.ts            USER / SUPER_ADMIN
│   │   └── user-status.enum.ts            ACTIVE / SUSPENDED
│   ├── events/super-admin-created.event.ts
│   ├── exceptions/super-admin-email-conflict.exception.ts
│   └── repositories/i-user.repository.ts Contrat de persistance
└── infrastructure/
    ├── persistence/
    │   ├── entity/p-user.entity.ts        Ancienne représentation inutilisée
    │   ├── typeorm/user.entity.ts         Entité ORM, table user.users
    │   └── typeorm-user.repository.ts     Adaptateur du repository
    └── startup/super-admin-initializer.ts Adaptateur du démarrage Nest
```

Le nom `user.enity.ts` contient une coquille : `user.entity.ts` serait plus clair. Ce point est cosmétique.

## 2. Responsabilités et flux

| Élément | Responsabilité actuelle | Dépendances principales |
| --- | --- | --- |
| `User` | Création, rôle initial, activation et suspension | Enums du domaine ; type UUID Node |
| `UserRepository` | Recherche, sauvegarde, création initiale annoncée atomique | Entité User |
| `UserAccountService` | Créer un compte, vérifier existence/statut et obligation du mot de passe | Repository, domaine, **ConflictException Nest** |
| `CreateSuperAdminUseCase` | Chercher/créer le Super-Admin puis publier un événement | Repository, événement métier, **EventEmitter2** |
| `TypeormUserRepository` | Lire/écrire et convertir les utilisateurs | TypeORM, entité ORM, domaine |
| `SuperAdminInitializer` | Déclencher le use case au bootstrap | Cycle de vie et Logger Nest, use case |
| `UserModule` | Construire et exporter les services | Nest, Config, TypeORM, bus d’événements |

### Initialisation

```text
Démarrage Nest
  → SuperAdminInitializer.onApplicationBootstrap()
  → CreateSuperAdminUseCase.handle()
  → UserRepository.findSuperAdmin()
      absent : createInitialSuperAdmin() → TypeormUserRepository → PostgreSQL
      présent : réutilisation du compte
  → émission « super-admin.created » dans les deux cas
  → Auth.SuperAdminCreatedListener
  → vérification du rôle via UserAccountService
  → CreateSuperAdminIdentityUseCase
  → hash du mot de passe et persistance de l’identité par Auth
```

L’événement transporte `subjectId` et `email`, pas le mot de passe. Auth lit lui-même le secret depuis la configuration : cette séparation est pertinente. La republication sur un compte existant vise à réparer une initialisation interrompue ; elle exige un consommateur idempotent.

### Utilisation par Auth

```text
Use cases Auth
  → port AuthSubjectGateway
  → adaptateur UserAuthSubjectGateway
  → UserAccountService, exporté par UserModule
  → UserRepository
  → TypeormUserRepository
```

User ne possède pas de contrôleur HTTP : ce n’est pas un défaut pour un module utilisé par d’autres modules.

## 3. Ce qui respecte la Clean Architecture

- L’entité métier n’est pas une entité TypeORM et ne contient pas de décorateurs Nest.
- Le contrat `UserRepository` appartient à une couche interne ; l’infrastructure l’implémente.
- Les comportements `activate()` et `block()` sont portés par l’entité.
- Le domaine définit les rôles, statuts et l’exception de conflit du Super-Admin sans statut HTTP.
- La configuration et l’assemblage des instances sont réalisés dans le module Nest.
- Les mots de passe et les identités restent dans Auth.

Un dossier `model` dans Application ne serait pas, en soi, une violation. Des entrées/sorties de use cases peuvent y vivre. Ce sont leurs dépendances et leur responsabilité qui comptent ; les modèles ORM doivent rester en infrastructure.

## 4. Écarts architecturaux

### A1 — Application dépend d’une erreur HTTP

**Fichier :** `src/modules/user/application/user-account.service.ts`, import et méthode `create()`.

`ConflictException` provient de `@nestjs/common`. La création d’un utilisateur impose ainsi une traduction HTTP à tous ses appelants, y compris un worker ou une commande.

**Recommandation :** lever une exception métier/applicative, par exemple `UserEmailAlreadyUsedException`, puis la traduire en HTTP 409 dans un filtre d’infrastructure. Éviter aussi de lier le message générique User à la procédure Auth de liaison de comptes.

### A2 — Le use case dépend du bus Nest

**Fichier :** `application/use-cases/create-super-admin/create-super-admin.usecase.ts`.

Le constructeur attend `EventEmitter2`. L’import est de type uniquement, mais le contrat du use case reste lié à cette technologie.

**Recommandation :** réintroduire un port dans `application/gateway`, avec une méthode explicite de publication, puis fournir un adaptateur EventEmitter2 en infrastructure. La politique d’échec de publication doit être explicite.

### A3 — La persistance recrée les règles métier

**Fichier :** `infrastructure/persistence/typeorm-user.repository.ts`, `createInitialSuperAdmin()`.

L’adaptateur attribue directement les chaînes `ACTIVE` et `SUPER_ADMIN` au lieu de passer par `User.createSuperAdmin()`. Deux endroits deviennent responsables des mêmes règles.

**Recommandation :** construire l’entité avec sa fabrique métier, puis la mapper pour la sauvegarde. L’adaptateur garde les mécanismes techniques de transaction et de verrouillage.

### A4 — Dépendance circulaire entre les modèles ORM User et Auth

**Fichiers :** `user/infrastructure/persistence/typeorm/user.entity.ts` et `auth/infrastructure/persistence/typeorm/auth-identity.entity.ts`.

Chaque entité importe l’autre pour une relation bidirectionnelle. Cela couple les infrastructures des deux modules. Ce n’est pas une dépendance du domaine vers l’extérieur, mais cela réduit l’autonomie de User. Avec ESM et les métadonnées de décorateurs, cette boucle présente aussi un risque d’accès à une classe avant son initialisation ; ce risque n’a pas été reproduit à l’exécution ici.

**Recommandation :** conserver si nécessaire la relation unidirectionnelle Auth → User, sans collection d’identités dans User. Vérifier les métadonnées émises et utiliser un type de relation adapté au chargement ESM.

### A5 — Conversion ORM/domaine insuffisamment explicite

**Fichier :** `typeorm-user.repository.ts`, `read()` et sauvegardes.

Le spread de la ligne ORM avec `as any` peut transmettre des propriétés techniques ou des relations au domaine et contourne le contrôle des types. Les rôles et statuts sont de simples chaînes côté ORM. Les assertions `!` supposent que les sauvegardes ont toujours produit un utilisateur et un identifiant.

**Recommandation :** mapper explicitement les champs, contrôler les valeurs persistées et rendre explicite la garantie d’identifiant après sauvegarde.

### A6 — Invariants métier incomplets

**Fichier :** `domain/entities/user.enity.ts`.

L’entité accepte un email vide ou invalide ; la normalisation est réalisée dans la persistance, et une validation partielle existe uniquement dans le bootstrap. Un utilisateur créé en mémoire peut donc différer de sa version persistée.

**Recommandation :** centraliser la politique d’email dans le domaine si elle constitue une règle métier, éventuellement avec un objet valeur. La validation des variables d’environnement reste une responsabilité de configuration.

## 5. Défauts de fonctionnement prioritaires

Ces points sont distincts de la conformité architecturale, mais affectent le flux User.

| Priorité | Constat et preuve dans le code | Conséquence / correction attendue |
| --- | --- | --- |
| Haute | `user.module.ts` utilise `require()` alors que `package.json` déclare `type: module` et TypeScript émet en NodeNext | Incompatible avec l’exécution ESM native sans shim ; remplacer par des imports statiques, dont `getRepositoryToken`. Même motif dans AuthModule. |
| Haute | `createInitialSuperAdmin()` fait recherche puis insertion sans transaction ni verrou | Deux processus peuvent créer deux Super-Admins avec des emails différents. Avec le même email, l’un peut échouer sur la contrainte unique. `pending` ne protège qu’une instance du use case. |
| Haute | Le listener Auth utilise `@OnEvent('super-admin.created')` sans désactiver la suppression des erreurs | Une erreur de création d’identité peut être journalisée puis masquée : `emitAsync()` ne garantit alors pas la réussite de l’identité. Rendre l’échec observable et tester la reprise. |
| Haute, intégration Auth | Les dates d’identité sont des colonnes PostgreSQL `integer`, alimentées par `Date.getTime()` | Les millisecondes actuelles dépassent un entier signé 32 bits. Utiliser des timestamps ou une représentation numérique compatible et un mapping adapté. |
| Haute, intégration Auth | `createIfAbsent()` n’est pas soutenu par des contraintes uniques sur les clés d’identité et intercepte toutes les erreurs d’insertion | La transaction seule ne garantit pas l’unicité ; l’interception peut masquer la cause et laisser une transaction PostgreSQL en échec. Ajouter les contraintes métier et gérer précisément les conflits. |
| Moyenne | `DB_SCHEMA_INIT` reçoit une DataSource déjà initialisée | Il ne garantit pas la création des schémas avant la synchronisation, contrairement au commentaire. Prévoir une initialisation préalable ou des migrations, et ne pas masquer les erreurs. |
| Moyenne | DatabaseModule lit `DB_*` alors que `data-base.config.ts` expose `database.*` depuis `DATABASE_*` | Deux conventions concurrentes ; les valeurs configurées peuvent être ignorées. Unifier et valider la configuration. `get<boolean>()` ne convertit pas à lui seul la chaîne `false`. |
| Moyenne | `UserAccountService.create()` vérifie l’email avant la sauvegarde | Une création concurrente peut renvoyer une erreur SQL brute. Garder la contrainte unique et traduire son conflit en exception connue. |

La garantie d’initialisation concurrente peut reposer sur une transaction avec verrou partagé par toutes les instances, suivie d’une nouvelle vérification. Une contrainte interdisant plusieurs Super-Admins ne convient que si le métier interdit aussi d’en créer d’autres ultérieurement.

Pour les événements, Nest documente `suppressErrors: true` par défaut ainsi qu’un risque de publication avant disponibilité des listeners pendant le bootstrap. Le code ne contient pas d’attente explicite de disponibilité ; une perte effective dans cet ordre de démarrage précis n’a pas été démontrée. [Documentation Nest Events](https://docs.nestjs.com/techniques/events).

## 6. Tests et limites de la vérification

- `npx tsc --noEmit` : réussi sur la version inspectée.
- `npx vitest run src/modules/user/domain/entities/user.enity.spec.ts` : **5 tests réussis**.
- Aucun démarrage complet contre PostgreSQL ni test de concurrence réel n’a été exécuté dans cette revue.
- Les anciens tests du use case et du repository User sont supprimés dans l’arbre de travail actuel. Les cinq tests d’entité ne valident pas les nouveaux adaptateurs TypeORM.

Le succès de TypeScript ne prouve ni le bon chargement ESM, ni la validité du schéma SQL, ni l’idempotence distribuée.

Tests à rétablir en priorité :

1. Première initialisation et Super-Admin existant, avec assertions du rôle et du statut.
2. Collision avec l’email d’un utilisateur ordinaire.
3. Deux initialisations concurrentes via des connexions distinctes, y compris avec des emails configurés différents.
4. Réception de l’événement, création effective de l’identité, hash vérifiable et provider email/password uniquement.
5. Échec Auth visible puis reprise sans duplicata après redémarrage.
6. Tests PostgreSQL du mapping, des contraintes et des dates ; démarrage sur une base vierge.
7. Façade User : compte absent, actif, suspendu et conflit d’email.

## 7. Ordre de correction proposé

1. Fiabiliser le chargement ESM et le schéma PostgreSQL afin de permettre un vrai test d’intégration.
2. Garantir l’atomicité du bootstrap et l’unicité des identités ; rendre les erreurs Auth visibles.
3. Retirer les dépendances Nest d’Application grâce aux exceptions internes et au port d’événements.
4. Réutiliser les fabriques métier, expliciter les mappings et la politique d’email.
5. Réduire la relation circulaire ORM et supprimer l’ancien `PUser` après vérification des usages.

Il n’est pas nécessaire de réécrire tout le module ni de déplacer son domaine : les corrections concernent surtout les frontières d’Application et les garanties de l’infrastructure.
