import { Logger } from '@nestjs/common';
import { AuditAction } from '../../../src/audit/audit-action.enum';
import { AuditLogService } from '../../../src/audit/audit-log.service';

describe('AuditLogService', () => {
  let repo: { insert: jest.Mock };
  let service: AuditLogService;

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  beforeEach(() => {
    repo = { insert: jest.fn().mockResolvedValue(undefined) };
    service = new AuditLogService(repo as never);
  });

  it('inserts a row with provided fields and null defaults', async () => {
    await service.record({
      userId: 'u-1',
      action: AuditAction.LoginSuccess,
      ip: '10.0.0.1',
      userAgent: 'jest',
      metadata: { foo: 'bar' },
    });

    expect(repo.insert).toHaveBeenCalledWith({
      userId: 'u-1',
      action: AuditAction.LoginSuccess,
      ip: '10.0.0.1',
      userAgent: 'jest',
      metadata: { foo: 'bar' },
    });
  });

  it('defaults missing optional fields to null', async () => {
    await service.record({ action: AuditAction.LoginFailed });

    expect(repo.insert).toHaveBeenCalledWith({
      userId: null,
      action: AuditAction.LoginFailed,
      ip: null,
      userAgent: null,
      metadata: null,
    });
  });

  it('swallows insert errors so audit never blocks auth', async () => {
    repo.insert.mockRejectedValue(new Error('db down'));
    await expect(service.record({ action: AuditAction.Logout })).resolves.toBeUndefined();
  });
});
