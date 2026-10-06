import { SchoolAction } from '../enums/school-action.enum.js';
import { SchoolRoleKey } from '../enums/school-role-key.enum.js';

export interface DefaultSchoolRoleDefinition {
  key: SchoolRoleKey;
  name: string;
  description: string;
  permissions: readonly SchoolAction[];
}

export const DEFAULT_SCHOOL_ROLES: readonly DefaultSchoolRoleDefinition[] = [
  {
    key: SchoolRoleKey.SCHOOL_ADMIN,
    name: 'Administrateur école',
    description: "Administre l'école, ses membres, ses rôles et ses documents",
    permissions: Object.values(SchoolAction),
  },
  {
    key: SchoolRoleKey.CONTENT_MANAGER,
    name: 'Responsable de contenu',
    description: 'Gère les corpus, leurs versions et leurs droits de consultation, et suit les métriques',
    permissions: [
      SchoolAction.VIEW_MEMBERS,
      SchoolAction.MANAGE_DOCUMENTS,
      SchoolAction.SHARE_DOCUMENTS,
      SchoolAction.VIEW_METRICS,
    ],
  },
  {
    key: SchoolRoleKey.STAFF,
    name: 'Personnel',
    description: "Personnel de l'école : procédures, normes et manuels internes",
    permissions: [SchoolAction.VIEW_MEMBERS],
  },
  {
    key: SchoolRoleKey.FIELD_TECHNICIAN,
    name: 'Technicien terrain',
    description: 'Consulte les instructions sur site, parfois sans réseau',
    permissions: [],
  },
  {
    key: SchoolRoleKey.STUDENT,
    name: 'Élève',
    description: "Élève de l'école : supports explicitement publiés",
    permissions: [],
  },
];

export function defaultSchoolRole(key: SchoolRoleKey): DefaultSchoolRoleDefinition {
  const definition = DEFAULT_SCHOOL_ROLES.find((d) => d.key === key);
  if (!definition) {
    throw new Error(`Unknown system role ${key}`);
  }
  return definition;
}
