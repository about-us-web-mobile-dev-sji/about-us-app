export class SchoolNotFoundException extends Error {
<<<<<<< HEAD
  constructor(schoolId: string) {
    super(`School with ID ${schoolId} not found`);
    this.name = 'SchoolNotFoundException';
  }
}
=======
  constructor() {
    super('School not found');
    this.name = 'SchoolNotFoundException';
  }
}
>>>>>>> bf2f89ad25a959748ed2b806f2f111311ee8bd5a
