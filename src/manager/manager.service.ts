import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { TaskService } from '../task/task.service';
import { UserService } from '../user/user.service';
import { UserPerformanceStatus, UserRole } from '../user/schemas/user.schema';
import { TaskStatus } from '../task/task.schema';
import { FixedTaskStatus } from '../fixedTask/fixed-task.schema';
import { BaseManagerService } from './base-manager.service';
import { ManagerUsersQueryDto } from './dto/manager-users-query.dto';
import { MonthlyPerformanceQueryDto } from './dto/monthly-performance-query.dto';

@Injectable()
export class ManagerService extends BaseManagerService {
  constructor(
    private readonly userService: UserService,
    private readonly taskService: TaskService,
    @InjectConnection()
    private readonly connection: Connection,
  ) {
    super();
  }

  async getDashboardStatistics(): Promise<{
    openTasks: number;
    activeUsers: number;
  }> {
    const [openTasks, activeUsers] = await Promise.all([
      this.taskService.countOpenTasks(),
      this.userService.countActiveUsers(),
    ]);

    return { openTasks, activeUsers };
  }

  findUsers(query: ManagerUsersQueryDto) {
    const { page, limit } = this.getPagination(query);

    return this.userService.findForManager(page, limit, {
      isActive: query.isActive,
      role: query.role,
      name: query.name,
    });
  }

  updateUserRole(userId: string, role: string) {
    this.toObjectId(userId, 'user ID');

    return this.userService.updateRole(userId, role);
  }

  getTaskStatusOverview() {
    return this.taskService.getTaskStatusOverview();
  }

  getTaskCountsByUsers() {
    return this.taskService.getTaskCountsByAssignee();
  }

  getMonthlyUserPerformance(query: MonthlyPerformanceQueryDto) {
    return this.taskService.getMonthlyUserPerformance({
      month: query.month,
      year: query.year,
    });
  }

  async evaluateUserProgress() {
    const users = await this.connection
      .collection('users')
      .find({
        roles: { $in: [UserRole.SPECIALIST, UserRole.SUPERVISOR] },
      })
      .project({
        firstName: 1,
        lastName: 1,
        email: 1,
        roles: 1,
      })
      .toArray();

    const evaluatedAt = new Date();
    const results = await Promise.all(
      users.map(async (user) => {
        const userId = user._id as Types.ObjectId;
        const [tasks, fixedTasks] = await Promise.all([
          this.connection
            .collection('tasks')
            .find({ assignedTo: userId })
            .project({ status: 1, dueDate: 1, doneTime: 1 })
            .toArray(),
          this.connection
            .collection('fixedtasktemplates')
            .find({ assignedTo: userId })
            .project({ status: 1, doneTime: 1 })
            .toArray(),
        ]);

        const completedTasks = tasks.filter(
          (task) => task.status === TaskStatus.DONE,
        ).length;
        const onTimeTasks = tasks.filter(
          (task) =>
            task.status === TaskStatus.DONE &&
            task.doneTime instanceof Date &&
            task.dueDate instanceof Date &&
            task.doneTime.getTime() < task.dueDate.getTime(),
        ).length;
        const completedFixedTasks = fixedTasks.filter(
          (fixedTask) => fixedTask.status === FixedTaskStatus.DONE,
        ).length;
        const totalWork = tasks.length + fixedTasks.length;
        const completedWork = completedTasks + completedFixedTasks;
        const progressPercentage =
          totalWork === 0 ? 0 : Math.round((completedWork / totalWork) * 100);
        const performanceStatus =
          totalWork > 0 &&
          onTimeTasks === tasks.length &&
          completedFixedTasks === fixedTasks.length
            ? UserPerformanceStatus.GOOD
            : UserPerformanceStatus.WEAK;

        await this.connection.collection('users').updateOne(
          { _id: userId },
          {
            $set: {
              progressPercentage,
              performanceStatus,
              performanceEvaluatedAt: evaluatedAt,
            },
          },
        );

        return {
          userId: userId.toString(),
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.roles,
          totalTasks: tasks.length,
          completedTasks,
          onTimeTasks,
          totalFixedTasks: fixedTasks.length,
          completedFixedTasks,
          progressPercentage,
          performanceStatus,
          performanceEvaluatedAt: evaluatedAt,
        };
      }),
    );

    return results.sort(
      (first, second) => second.progressPercentage - first.progressPercentage,
    );
  }
}
