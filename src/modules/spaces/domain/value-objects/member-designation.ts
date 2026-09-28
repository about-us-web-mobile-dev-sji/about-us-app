export class MemberDesignation {
  constructor(
    public readonly key: string,
    public readonly singular: string,
    public readonly plural: string,
  ) {
    if (!key?.trim()) throw new Error('MemberDesignation key is required');
    if (!singular?.trim()) throw new Error('MemberDesignation singular is required');
    if (!plural?.trim()) throw new Error('MemberDesignation plural is required');
  }

  static create(key: string, singular: string, plural: string): MemberDesignation {
    return new MemberDesignation(key.trim(), singular.trim(), plural.trim());
  }

  equals(other: MemberDesignation): boolean {
    return this.key === other.key && this.singular === other.singular && this.plural === other.plural;
  }

  toPrimitives() {
    return { key: this.key, singular: this.singular, plural: this.plural };
  }
}

export const DEFAULT_STUDENT_DESIGNATION = MemberDesignation.create('student', 'Étudiant', 'Étudiants');
export const DEFAULT_TEACHER_DESIGNATION = MemberDesignation.create('teacher', 'Enseignant', 'Enseignants');
export const DEFAULT_STAFF_DESIGNATION = MemberDesignation.create('staff', 'Personnel', 'Personnels');
export const DEFAULT_RESEARCHER_DESIGNATION = MemberDesignation.create('researcher', 'Chercheur', 'Chercheurs');