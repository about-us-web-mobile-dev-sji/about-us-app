export class UserResponseDto {
  constructor(
    readonly id: string,
    readonly email: string,
    readonly firstName: string | null,
    readonly lastName: string | null,
    readonly status: string,
    readonly globalRole: string,
  ) {}
}
