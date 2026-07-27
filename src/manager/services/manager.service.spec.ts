import { TaskReportService } from '../../task/services/task-report.service';
import { UserService } from '../../user/services/user.service';
import { ManagerTasksService } from './manager-tasks.service';
import { ManagerService } from './manager.service';
import { UserProgressService } from './user-progress.service';
import { ManagerLeaveRequestService } from './manager-leave-request.service';
import { ManagerWorkStatusService } from './manager-work-status.service';
import { FixedTaskService } from '../../fixedTask/services/fixed-task.service';
import { Types } from 'mongoose';

describe('ManagerService', () => {
  const userService = {
    findByName: jest.fn(),
    findForManagerWorkField: jest.fn(),
    findAllForManagerWorkField: jest.fn(),
    getAllTimeStartScoresForManager: jest.fn(),
  };
  const service = new ManagerService(
    userService as unknown as UserService,
    {} as TaskReportService,
    {} as UserProgressService,
    {} as ManagerTasksService,
    {} as ManagerLeaveRequestService,
    {} as ManagerWorkStatusService,
    {} as FixedTaskService,
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

  it('returns only active users in the manager work field', async () => {
    const managerId = new Types.ObjectId().toString();
    userService.findForManagerWorkField.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
    });

    await service.findUsers(managerId, { page: 1, limit: 10 });

    expect(userService.findForManagerWorkField).toHaveBeenCalledWith(
      managerId,
      1,
      10,
      { role: undefined, name: undefined },
    );
  });

  it('returns active and inactive users in the manager work field', async () => {
    const managerId = new Types.ObjectId().toString();
    userService.findAllForManagerWorkField.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
    });

    await service.findAllUsersInManagerWorkField(managerId, {
      page: 1,
      limit: 10,
      isActive: false,
    });

    expect(userService.findAllForManagerWorkField).toHaveBeenCalledWith(
      managerId,
      1,
      10,
      { role: undefined, name: undefined },
    );
  });

  it('returns all-time start scores for the manager work field', async () => {
    const managerId = new Types.ObjectId().toString();
    userService.getAllTimeStartScoresForManager.mockResolvedValue({
      total: 0,
      data: [],
    });

    await service.getAllTimeStartScores(managerId);

    expect(userService.getAllTimeStartScoresForManager).toHaveBeenCalledWith(
      managerId,
    );
  });
});
