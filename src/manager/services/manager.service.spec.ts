import { TaskReportService } from '../../task/services/task-report.service';
import { UserService } from '../../user/services/user.service';
import { ManagerTasksService } from './manager-tasks.service';
import { ManagerService } from './manager.service';
import { UserProgressService } from './user-progress.service';
import { ManagerLeaveRequestService } from './manager-leave-request.service';

describe('ManagerService', () => {
  const userService = {
    findByName: jest.fn(),
  };
  const service = new ManagerService(
    userService as unknown as UserService,
    {} as TaskReportService,
    {} as UserProgressService,
    {} as ManagerTasksService,
    {} as ManagerLeaveRequestService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('finds a user by first name and last name', async () => {
    const user = { firstName: 'سینا', lastName: 'اعلایی' };
    userService.findByName.mockResolvedValue(user);

    const result = await service.findUserByName('سینا', 'اعلایی');

    expect(userService.findByName).toHaveBeenCalledWith('سینا', 'اعلایی');
    expect(result).toBe(user);
  });
});
