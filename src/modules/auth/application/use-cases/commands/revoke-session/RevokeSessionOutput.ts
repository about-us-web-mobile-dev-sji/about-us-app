export interface RevokeSessionOutput {
  /** The caller revoked the session it is using: the client must sign out. */
  revokedCurrent: boolean;
}
