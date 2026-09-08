import { GlobalRole } from '../enum/global-role.enum.js';
import { UUID } from 'crypto';
import UserStatus from '../enum/user-status.enum.js';

interface UserProps {
  id?: UUID;
  firstName: string | null;
  lastName: string | null;
  email: string;
  status: UserStatus;
  globalRole: GlobalRole;
}

export class User {
  private constructor(private props: UserProps) {}

  static create(input: {
    firstName?: string | null;
    lastName?: string | null;
    email: string;
  }): User {
    return new User({
      id: undefined,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      email: input.email,
      status: UserStatus.ACTIVE,
      globalRole: GlobalRole.USER,
    });
  }

  static createSuperAdmin(input: {
    firstName?: string | null;
    lastName?: string | null;
    email: string;
  }): User {
    const user = User.create(input);
    user.props.globalRole = GlobalRole.SUPER_ADMIN;
    return user;
  }

  get globalRole(): GlobalRole {
    return this.props.globalRole;
  }

  static reconstitute(props: Required<UserProps>): User {
    return new User(structuredClone(props));
  }

  get id(): UUID | undefined {
    return this.props.id;
  }
  get firstName(): string | null {
    return this.props.firstName;
  }
  get lastName(): string | null {
    return this.props.lastName;
  }
  get email(): string {
    return this.props.email;
  }
  get status(): UserStatus {
    return this.props.status;
  }

  block(): void {
    if (this.props.status === UserStatus.SUSPENDED) return;
    this.props.status = UserStatus.SUSPENDED;
  }

  activate(): void {
    if (this.props.status === UserStatus.ACTIVE) return;
    this.props.status = UserStatus.ACTIVE;
  }
}
