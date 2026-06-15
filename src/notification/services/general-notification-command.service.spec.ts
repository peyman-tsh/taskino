import { WorkField } from '../../common/enums/work-field.enum';
import { UserService } from '../../user/services/user.service';
import { NotificationTemplateFactory } from '../notification-template.factory';
import { GeneralNotificationCommandService } from './general-notification-command.service';
import { NotificationWriteService } from './notification-write.service';
import { TaskNotificationTemplateFactory } from '../factories/task-notification-template.factory';
import { FixedTaskNotificationTemplateFactory } from '../factories/fixed-task-notification-template.factory';
import { GeneralNotificationTemplateFactory } from '../factories/general-notification-template.factory';

describe('GeneralNotificationCommandService', () => {
  const writer = { createBulk: jest.fn() };
  const userService = { findActiveManagerIdsByWorkField: jest.fn() };
  const service = new GeneralNotificationCommandService(
    writer as unknown as NotificationWriteService,
    userService as unknown as UserService,
    new NotificationTemplateFactory(
      new TaskNotificationTemplateFactory(),
      new FixedTaskNotificationTemplateFactory(),
      new GeneralNotificationTemplateFactory(),
    ),
  );

  beforeEach(() => jest.clearAllMocks());

  it('notifies only active managers in the registered user work field', async () => {
    userService.findActiveManagerIdsByWorkField.mockResolvedValue([
      '507f1f77bcf86cd799439011',
      '507f1f77bcf86cd799439012',
    ]);

    await service.createUserRegistrationApproval(
      '507f1f77bcf86cd799439013',
      'Ali',
      'Ahmadi',
      WorkField.IT,
    );

    expect(writer.createBulk).toHaveBeenCalledWith([
      expect.objectContaining({ message: expect.stringContaining('Ali Ahmadi') }),
      expect.objectContaining({ message: expect.stringContaining('Ali Ahmadi') }),
    ]);
  });

  it('does not create notifications when the work field has no active manager', async () => {
    userService.findActiveManagerIdsByWorkField.mockResolvedValue([]);

    await service.createUserRegistrationApproval(
      '507f1f77bcf86cd799439013',
      'Ali',
      'Ahmadi',
      WorkField.IT,
    );

    expect(writer.createBulk).not.toHaveBeenCalled();
  });
});
