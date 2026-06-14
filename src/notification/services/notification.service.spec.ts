import { WorkField } from '../../common/enums/work-field.enum';
import { UserService } from '../../user/services/user.service';
import { NotificationTemplateFactory } from '../notification-template.factory';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  const repository = {
    createBulk: jest.fn(),
  };
  const userService = {
    findActiveManagerIdsByWorkField: jest.fn(),
    findById: jest.fn(),
  };
  const service = new NotificationService(
    repository as unknown as NotificationRepository,
    userService as unknown as UserService,
    new NotificationTemplateFactory(),
  );

  beforeEach(() => {
    jest.clearAllMocks();
    userService.findById.mockResolvedValue({});
    repository.createBulk.mockResolvedValue([]);
  });

  it('notifies only active managers in the registered user work field', async () => {
    userService.findActiveManagerIdsByWorkField.mockResolvedValue([
      '507f1f77bcf86cd799439011',
      '507f1f77bcf86cd799439012',
    ]);

    await service.createUserRegistrationApprovalNotifications(
      '507f1f77bcf86cd799439013',
      'Ali',
      'Ahmadi',
      WorkField.IT,
    );

    expect(userService.findActiveManagerIdsByWorkField).toHaveBeenCalledWith(
      WorkField.IT,
    );
    expect(repository.createBulk).toHaveBeenCalledWith([
      expect.objectContaining({
        user: expect.anything(),
        message: expect.stringContaining('Ali Ahmadi'),
        link: '/users/507f1f77bcf86cd799439013',
      }),
      expect.objectContaining({
        user: expect.anything(),
        message: expect.stringContaining('Ali Ahmadi'),
        link: '/users/507f1f77bcf86cd799439013',
      }),
    ]);
  });

  it('does not create notifications when the work field has no active manager', async () => {
    userService.findActiveManagerIdsByWorkField.mockResolvedValue([]);

    await service.createUserRegistrationApprovalNotifications(
      '507f1f77bcf86cd799439013',
      'Ali',
      'Ahmadi',
      WorkField.IT,
    );

    expect(repository.createBulk).not.toHaveBeenCalled();
  });
});
