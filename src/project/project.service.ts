import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project, ProjectDocument, ProjectStatus } from './project.schema';
import { TaskStatus } from '../task/task.schema';
import { TaskService } from 'src/task/task.service';
import { UserService } from '../user/user.service';
import { UserRole } from '../user/schemas/user.schema';
import { WorkField } from '../common/enums/work-field.enum';

@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
    @Inject(forwardRef(() => TaskService))
    private readonly taskService: TaskService,
    private readonly userService: UserService,
  ) {}

  private async validateProjectParticipants(
    workField: WorkField,
    ownerId: string,
    supervisorId: string,
    assigneeId?: string,
  ): Promise<void> {
    const participants = await this.userService.findProjectParticipantsByIds([
      ownerId,
      supervisorId,
      ...(assigneeId ? [assigneeId] : []),
    ]);
    const participantsById = new Map(
      participants.map((participant) => [participant.userId, participant]),
    );
    const owner = participantsById.get(ownerId);
    const supervisor = participantsById.get(supervisorId);
    const assignee = assigneeId ? participantsById.get(assigneeId) : undefined;

    if (owner?.role !== UserRole.MANAGER) {
      throw new BadRequestException('Project owner must have the manager role');
    }

    if (supervisor?.role !== UserRole.SUPERVISOR) {
      throw new BadRequestException(
        'Selected user must have the supervisor role',
      );
    }

    if (assigneeId && assignee?.role !== UserRole.SPECIALIST) {
      throw new BadRequestException(
        'Project assignee must have the specialist role',
      );
    }

    if (assigneeId && !assignee?.isActive) {
      throw new BadRequestException('Project assignee must be active');
    }

    const mismatchedParticipants = participants.filter(
      (participant) => participant.workField !== workField,
    );
    if (mismatchedParticipants.length > 0) {
      throw new BadRequestException(
        'Project owner, supervisor, and assignee must have the same work field as the project',
      );
    }
  }

  private getProjectAssigneeId(project: {
    assigneeId?: Types.ObjectId;
  }): string | undefined {
    return project.assigneeId?.toString();
  }

  private requireProjectAssigneeId(project: {
    assigneeId?: Types.ObjectId;
  }): string {
    const assigneeId = this.getProjectAssigneeId(project);
    if (!assigneeId) {
      throw new BadRequestException(
        'Project does not have an assigned specialist',
      );
    }

    return assigneeId;
  }

  async assertAssigneeMatchesProjectWorkField(
    projectId: string,
    userId: string,
  ): Promise<WorkField> {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project ID');
    }

    const project = await this.projectModel
      .findById(projectId)
      .select('workField')
      .lean()
      .exec();
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (!project.workField) {
      throw new BadRequestException(
        'Project work field must be configured before assigning a specialist',
      );
    }

    const [participant] = await this.userService.findProjectParticipantsByIds([
      userId,
    ]);
    if (participant.workField !== project.workField) {
      throw new BadRequestException(
        'User work field must match the project work field',
      );
    }

    return project.workField;
  }

  async assertTaskParticipants(
    projectId: string,
    creatorId: string,
    assigneeIds: string[],
  ): Promise<void> {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project ID');
    }

    const project = await this.projectModel
      .findById(projectId)
      .select('owner supervisorId assigneeId workField')
      .lean()
      .exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const participants = await this.userService.findProjectParticipantsByIds([
      creatorId,
      ...assigneeIds,
    ]);
    const participantsById = new Map(
      participants.map((participant) => [participant.userId, participant]),
    );
    const creator = participantsById.get(creatorId);

    const isOwner =
      creator?.role === UserRole.MANAGER &&
      project.owner.toString() === creatorId;
    const isSupervisor =
      creator?.role === UserRole.SUPERVISOR &&
      project.supervisorId.toString() === creatorId;

    if (!isOwner && !isSupervisor) {
      throw new BadRequestException(
        'Task creator must be the project owner or supervisor',
      );
    }

    if (assigneeIds.length !== 1) {
      throw new BadRequestException(
        'A project task must be assigned to exactly one user',
      );
    }

    const projectAssigneeId = this.requireProjectAssigneeId(project);
    const assignee = participantsById.get(assigneeIds[0]);
    const invalidAssignee =
      assigneeIds[0] !== projectAssigneeId ||
      assignee?.workField !== project.workField ||
      assignee?.role !== UserRole.SPECIALIST;

    if (invalidAssignee) {
      throw new BadRequestException(
        'Every project task must be assigned to the specialist responsible for that project',
      );
    }
  }

  /**
   * Create a new project
   */
  async create(createProjectDto: CreateProjectDto): Promise<ProjectDocument> {
    const { owner, supervisorId, assigneeId, ...rest } = createProjectDto;

    // Validate owner is a valid ObjectId
    if (!Types.ObjectId.isValid(owner)) {
      throw new BadRequestException('Invalid owner user ID');
    }

    await this.validateProjectParticipants(
      createProjectDto.workField,
      owner,
      supervisorId,
      assigneeId,
    );
    const createdProject = new this.projectModel({
      ...rest,
      owner: new Types.ObjectId(owner),
      supervisorId: new Types.ObjectId(supervisorId),
      assigneeId: assigneeId ? new Types.ObjectId(assigneeId) : undefined,
      isPublic: !assigneeId,
    });

    return createdProject.save();
  }

  /**
   * Find all projects with pagination and optional filters
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
    filters?: {
      owner?: string;
      assignee?: string;
      status?: ProjectStatus;
      isArchived?: boolean;
      isPublic?: boolean;
    },
  ): Promise<{
    data: ProjectDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (filters?.owner && Types.ObjectId.isValid(filters.owner)) {
      query.owner = new Types.ObjectId(filters.owner);
    }

    if (filters?.assignee && Types.ObjectId.isValid(filters.assignee)) {
      query.assigneeId = new Types.ObjectId(filters.assignee);
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.isArchived !== undefined) {
      query.isArchived = filters.isArchived;
    }

    if (filters?.isPublic !== undefined) {
      query.isPublic = filters.isPublic;
    }

    const [data, total] = await Promise.all([
      this.projectModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .populate('owner', 'firstName lastName email workField')
        .populate('supervisorId', 'firstName lastName email roles workField')
        .populate(
          'assigneeId',
          'firstName lastName email roles isActive workField',
        )
        .populate('tasks')
        .exec(),
      this.projectModel.countDocuments(query).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async countActiveProjects(): Promise<number> {
    return this.projectModel
      .countDocuments({
        isArchived: false,
        status: { $ne: ProjectStatus.COMPLETED },
      })
      .exec();
  }

  async findSupervisedProjectIds(supervisorId: string): Promise<string[]> {
    if (!Types.ObjectId.isValid(supervisorId)) {
      throw new BadRequestException('Invalid supervisor user ID');
    }

    const projectIds = await this.projectModel.distinct('_id', {
      supervisorId: new Types.ObjectId(supervisorId),
    });

    return projectIds.map((projectId) => projectId.toString());
  }

  async findParticipatingProjectIds(userId: string): Promise<string[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const userObjectId = new Types.ObjectId(userId);
    const projectIds = await this.projectModel.distinct('_id', {
      $or: [{ supervisorId: userObjectId }, { assigneeId: userObjectId }],
    });

    return projectIds.map((projectId) => projectId.toString());
  }

  async findSupervisedProjects(
    supervisorId: string,
    page: number,
    limit: number,
  ) {
    if (!Types.ObjectId.isValid(supervisorId)) {
      throw new BadRequestException('Invalid supervisor user ID');
    }

    const match = { supervisorId: new Types.ObjectId(supervisorId) };
    const skip = (page - 1) * limit;
    const [projects, total] = await Promise.all([
      this.projectModel
        .find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('title status isArchived assigneeId')
        .lean()
        .exec(),
      this.projectModel.countDocuments(match).exec(),
    ]);

    return {
      data: projects.map((project) => ({
        projectId: project._id.toString(),
        title: project.title,
        status: project.status,
        isArchived: project.isArchived,
        assigneeCount: this.getProjectAssigneeId(project) ? 1 : 0,
      })),
      total,
      page,
      limit,
    };
  }

  async getSupervisedProjectAccess(supervisorId: string, projectId: string) {
    if (
      !Types.ObjectId.isValid(supervisorId) ||
      !Types.ObjectId.isValid(projectId)
    ) {
      throw new BadRequestException('Invalid supervisor or project ID');
    }

    const project = await this.projectModel
      .findOne({
        _id: new Types.ObjectId(projectId),
        supervisorId: new Types.ObjectId(supervisorId),
      })
      .select('title assigneeId')
      .lean()
      .exec();

    if (!project) {
      throw new NotFoundException(
        'Project not found or is not supervised by the current user',
      );
    }

    return {
      projectId: project._id.toString(),
      projectName: project.title,
      assigneeId: this.getProjectAssigneeId(project),
    };
  }

  async assignSpecialistBySupervisor(
    supervisorId: string,
    projectId: string,
    assigneeId: string,
    session?: ClientSession,
  ): Promise<{ previousAssigneeId?: string }> {
    if (
      !Types.ObjectId.isValid(supervisorId) ||
      !Types.ObjectId.isValid(projectId) ||
      !Types.ObjectId.isValid(assigneeId)
    ) {
      throw new BadRequestException(
        'Invalid supervisor, project, or assignee ID',
      );
    }

    const project = await this.projectModel
      .findOne({
        _id: new Types.ObjectId(projectId),
        supervisorId: new Types.ObjectId(supervisorId),
      })
      .session(session ?? null)
      .exec();

    if (!project) {
      throw new NotFoundException(
        'Project not found or is not supervised by the current user',
      );
    }

    const [assignee] = await this.userService.findProjectParticipantsByIds([
      assigneeId,
    ]);
    if (assignee.role !== UserRole.SPECIALIST) {
      throw new BadRequestException(
        'Project assignee must have the specialist role',
      );
    }
    if (!assignee.isActive) {
      throw new BadRequestException('Project assignee must be active');
    }
    if (assignee.workField !== project.workField) {
      throw new BadRequestException(
        'Project assignee work field must match the project work field',
      );
    }

    const previousAssigneeId = this.getProjectAssigneeId(project);
    project.assigneeId = new Types.ObjectId(assigneeId);
    project.isPublic = false;
    await project.save({ session });

    return {
      previousAssigneeId,
    };
  }

  async getSupervisedTeamContext(supervisorId: string) {
    if (!Types.ObjectId.isValid(supervisorId)) {
      throw new BadRequestException('Invalid supervisor user ID');
    }

    const projects = await this.projectModel
      .find({ supervisorId: new Types.ObjectId(supervisorId) })
      .select('title assigneeId')
      .lean()
      .exec();

    return projects.map((project) => ({
      projectId: project._id.toString(),
      projectName: project.title,
      assigneeId: this.getProjectAssigneeId(project),
    }));
  }

  /**
   * Find a project by ID
   */
  async findById(id: string): Promise<ProjectDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid project ID');
    }

    const project = await this.projectModel
      .findById(id)
      .populate('owner', 'firstName lastName email workField')
      .populate('supervisorId', 'firstName lastName email roles workField')
      .populate(
        'assigneeId',
        'firstName lastName email roles isActive workField',
      )
      .populate('tasks')
      .exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  /**
   * Find projects by owner ID
   */
  async findByOwner(ownerId: string): Promise<ProjectDocument[]> {
    if (!Types.ObjectId.isValid(ownerId)) {
      throw new BadRequestException('Invalid owner user ID');
    }

    return this.projectModel
      .find({ owner: new Types.ObjectId(ownerId) })
      .populate('owner', 'firstName lastName email workField')
      .populate('supervisorId', 'firstName lastName email roles workField')
      .populate(
        'assigneeId',
        'firstName lastName email roles isActive workField',
      )
      .populate('tasks')
      .exec();
  }

  /**
   * Update a project by ID
   */
  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<ProjectDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid project ID');
    }

    const project = await this.projectModel.findById(id).exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const updateData: Record<string, unknown> = {};

    if (updateProjectDto.title !== undefined) {
      updateData.title = updateProjectDto.title;
    }

    if (updateProjectDto.description !== undefined) {
      updateData.description = updateProjectDto.description;
    }

    if (updateProjectDto.status !== undefined) {
      updateData.status = updateProjectDto.status;
    }

    if (updateProjectDto.supervisorId !== undefined) {
      if (!project.workField) {
        throw new BadRequestException(
          'Project work field must be configured before changing supervisor',
        );
      }
      const [supervisor] = await this.userService.findProjectParticipantsByIds([
        updateProjectDto.supervisorId,
      ]);
      if (supervisor.role !== UserRole.SUPERVISOR) {
        throw new BadRequestException(
          'Selected user must have the supervisor role',
        );
      }
      if (supervisor.workField !== project.workField) {
        throw new BadRequestException(
          'Supervisor work field must match the project work field',
        );
      }
      updateData.supervisorId = new Types.ObjectId(
        updateProjectDto.supervisorId,
      );
    }

    if (updateProjectDto.startDate !== undefined) {
      updateData.startDate = updateProjectDto.startDate;
    }

    if (updateProjectDto.endDate !== undefined) {
      updateData.endDate = updateProjectDto.endDate;
    }

    if (updateProjectDto.isArchived !== undefined) {
      updateData.isArchived = updateProjectDto.isArchived;
    }

    const updatedProject = await this.projectModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('owner', 'firstName lastName email workField')
      .populate('supervisorId', 'firstName lastName email roles workField')
      .populate(
        'assigneeId',
        'firstName lastName email roles isActive workField',
      )
      .populate('tasks')
      .exec();

    if (!updatedProject) {
      throw new NotFoundException('Project not found');
    }

    return updatedProject;
  }

  async setActivation(
    projectId: string,
    isActive: boolean,
  ): Promise<{
    message: string;
    project: ProjectDocument;
  }> {
    const project = await this.update(projectId, { isArchived: !isActive });

    return {
      message: isActive
        ? 'Project activated successfully'
        : 'Project deactivated successfully',
      project,
    };
  }

  /**
   * Delete a project by ID
   */
  async delete(id: string): Promise<ProjectDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid project ID');
    }

    const project = await this.projectModel.findByIdAndDelete(id).exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  /**
   * Add a task to a project
   */
  async addTask(projectId: string, taskId: string): Promise<ProjectDocument> {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project ID');
    }

    if (!Types.ObjectId.isValid(taskId)) {
      throw new BadRequestException('Invalid task ID');
    }

    const project = await this.projectModel.findById(projectId).exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check if task already exists
    if (project.tasks.some((t) => t.equals(new Types.ObjectId(taskId)))) {
      throw new BadRequestException('Task already exists in the project');
    }

    project.tasks.push(new Types.ObjectId(taskId));

    return project.save();
  }

  /**
   * Remove a task from a project
   */
  async removeTask(
    projectId: string,
    taskId: string,
  ): Promise<ProjectDocument> {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project ID');
    }

    if (!Types.ObjectId.isValid(taskId)) {
      throw new BadRequestException('Invalid task ID');
    }

    const project = await this.projectModel.findById(projectId).exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    project.tasks = project.tasks.filter(
      (t) => !t.equals(new Types.ObjectId(taskId)),
    );

    return project.save();
  }

  /**
   * Get project progress percentage based on task completion
   */
  async getProgress(projectId: string): Promise<{
    projectId: string;
    projectName: string;
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    pendingTasks: number;
    progressPercentage: number;
  }> {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project ID');
    }

    const project = await this.projectModel
      .findById(projectId)
      .populate('tasks')
      .exec();
    const tasks = await this.taskService.findTaskByProjectId(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(
      (task) => task.status === TaskStatus.DONE,
    ).length;
    const inProgressTasks = tasks.filter(
      (task) => task.status === TaskStatus.IN_PROGRESS,
    ).length;
    const pendingTasks = tasks.filter(
      (task) => task.status === TaskStatus.TODO,
    ).length;
    const progressPercentage =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      projectId: project._id.toString(),
      projectName: project.title,
      totalTasks,
      completedTasks,
      inProgressTasks,
      pendingTasks,
      progressPercentage,
    };
  }

  async getProgressList(
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: Array<{
      projectId: string;
      projectName: string;
      totalTasks: number;
      completedTasks: number;
      inProgressTasks: number;
      pendingTasks: number;
      progressPercentage: number;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    const projects = await this.findAll(page, limit);
    const data = await Promise.all(
      projects.data.map((project) => this.getProgress(project._id.toString())),
    );

    return {
      data,
      total: projects.total,
      page: projects.page,
      limit: projects.limit,
    };
  }
}
