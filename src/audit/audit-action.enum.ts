export enum AuditAction {
  Register = 'register',
  RegisterBlocked = 'register_blocked',
  LoginSuccess = 'login_success',
  LoginFailed = 'login_failed',
  RefreshRotated = 'refresh_rotated',
  RefreshReplay = 'refresh_replay',
  RefreshInvalid = 'refresh_invalid',
  Logout = 'logout',
  AccountDeleted = 'account_deleted',
}
