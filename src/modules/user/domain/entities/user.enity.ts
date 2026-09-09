import { UUID } from "crypto";
import UserStatus from "../enum/user-status.enum.js";
import UserRole from "../enum/user-role.enum.js";

interface UserProps {
  id?: UUID;
  schoolId?: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  status: UserStatus;
  role: UserRole;
}

export class User {

  private constructor(private props: UserProps) {}

  static create(input: {
    schoolId?: string;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
    role?: UserRole | null;
  }): User {
    return new User({
      id: undefined,
      schoolId: input.schoolId,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      email: input.email,
      status: UserStatus.ACTIVE,
      role: input.role ?? UserRole.MEMBER,
    });
  }

  static reconstitute(props: Required<Omit<UserProps, 'schoolId'>> & Pick<UserProps, 'schoolId'>): User {
    return new User(props);
  }

  get id(): UUID | undefined { return this.props.id;}
  get schoolId(): string | undefined { return this.props.schoolId; }
  get firstName(): string | null {return this.props.firstName;}
  get lastName(): string | null {return this.props.lastName;}
  get email(): string {return this.props.email;}
  get status(): UserStatus {return this.props.status;}
  get role(): UserRole {return this.props.role;}

  block(): void {
    if (this.props.status === UserStatus.SUSPENDED) return;
    this.props.status = UserStatus.SUSPENDED;
  }

  activate(): void {
    if (this.props.status === UserStatus.ACTIVE) return;
    this.props.status = UserStatus.ACTIVE;
  }

}