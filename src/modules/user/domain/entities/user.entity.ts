import { GlobalRole } from '../enum/global-role.enum.js';
import type { UUID } from 'node:crypto';
import { Email } from '../value-objects/email.js';
import { UserId } from '../value-objects/user-id.js';
import { InvalidUserException } from '../exceptions/invalid-user.exception.js';
import UserStatus from '../enum/user-status.enum.js';

interface UserProps {
  id?: UUID;
  firstName: string | null;
  lastName: string | null;
  email: string;
  status: UserStatus;
  globalRole: GlobalRole;
  avatarUrl: string | null;
}

export class User {
  static readonly ENTITY_TYPE = 'user';

  private readonly emailValue: Email;
  private readonly idValue?: UserId;
  private constructor(private props: UserProps) {
    this.emailValue = Email.create(props.email);
    this.idValue = props.id === undefined ? undefined : UserId.create(props.id);
    if (
      !Object.values(UserStatus).includes(props.status) ||
      !Object.values(GlobalRole).includes(props.globalRole)
    )
      throw new InvalidUserException('Invalid user status or role');
  }

  static create(input: {
    firstName?: string | null;
    lastName?: string | null;
    email: string;
    avatarUrl?: string | null;
  }): User {
    return new User({
      id: undefined,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      email: input.email,
      status: UserStatus.ACTIVE,
      globalRole: GlobalRole.USER,
      avatarUrl: input.avatarUrl?.trim() || null,
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

  get globalRole(): GlobalRole {return this.props.globalRole;}

  static reconstitute(props: Required<Omit<UserProps, 'avatarUrl'>> & { avatarUrl?: string | null }): User {
    return new User(structuredClone({ ...props, avatarUrl: props.avatarUrl ?? null }));
  }

  get id(): UUID | undefined {return this.idValue?.value;}
  get firstName(): string | null {return this.props.firstName;}
  get lastName(): string | null {return this.props.lastName;}
  get email(): string {return this.emailValue.value;}
  get status(): UserStatus {return this.props.status;}
  get avatarUrl(): string | null {return this.props.avatarUrl;}
  get fullName(): string | null {
    return [this.props.firstName, this.props.lastName].filter((part) => part?.trim()).join(' ').trim() || null;
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
