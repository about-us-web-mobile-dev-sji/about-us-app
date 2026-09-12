import { describe, it, expect } from 'vitest';
import { School } from './School.js';
import { SchoolStatus } from '../enums/SchoolStatus.js';

describe('School Entity', () => {
  it('should create a school with valid data', () => {
    const now = new Date();
    const school = new School(
      '123e4567-e89b-12d3-a456-426614174000',
      'SCHOOL001',
      'Test School',
      'A test school',
      '123 Main St',
      'Paris',
      '75001',
      'France',
      SchoolStatus.PENDING,
      null,
      'user-123',
      now,
      now,
    );

    expect(school.getId()).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(school.getIdentifier()).toBe('SCHOOL001');
    expect(school.getName()).toBe('Test School');
    expect(school.getStatus()).toBe(SchoolStatus.PENDING);
  });

  it('should update school name', () => {
    const now = new Date();
    const school = new School(
      '123e4567-e89b-12d3-a456-426614174000',
      'SCHOOL001',
      'Test School',
      'A test school',
      '123 Main St',
      'Paris',
      '75001',
      'France',
      SchoolStatus.PENDING,
      null,
      'user-123',
      now,
      now,
    );

    school.updateName('Updated School Name');
    expect(school.getName()).toBe('Updated School Name');
  });

  it('should not allow empty school name', () => {
    const now = new Date();
    const school = new School(
      '123e4567-e89b-12d3-a456-426614174000',
      'SCHOOL001',
      'Test School',
      'A test school',
      '123 Main St',
      'Paris',
      '75001',
      'France',
      SchoolStatus.PENDING,
      null,
      'user-123',
      now,
      now,
    );

    expect(() => school.updateName('')).toThrow('School name cannot be empty');
  });

  it('should assign main administrator', () => {
    const now = new Date();
    const school = new School(
      '123e4567-e89b-12d3-a456-426614174000',
      'SCHOOL001',
      'Test School',
      'A test school',
      '123 Main St',
      'Paris',
      '75001',
      'France',
      SchoolStatus.PENDING,
      null,
      'user-123',
      now,
      now,
    );

    school.assignMainAdministrator('admin-456');
    expect(school.getMainAdministratorId()).toBe('admin-456');
  });
});
