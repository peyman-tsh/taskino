import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
    private readonly taskService: TaskService,
    private readonly userService: UserService,
  ) {}

  private async validateProjectParticipants(
    workField: WorkField,
    ownerId: string,
    supervisorId: string,
    memberIds: string[],
  ): Promise<void> {
    const participants = await this.userService.findProjectParticipantsByIds([
      ownerId,
      supervisorId,
      ...memberIds,
    ]);
    const participantsById = new Map(
      participants.map((participant) => [participant.userId, participant]),
    );
    const owner = participantsById.get(ownerId);
    const supervisor = participantsById.get(supervisorId);

    if (owner?.role !== UserRole.MANAGER) {
      throw new BadRequestException('Project owner must have the manager role');
    }

    if (supervisor?.role !== UserRole.SUPERVISOR) {
      throw new BadRequestException('Selected user must have the supervisor role');
    }

    const mismatchedParticipants = participants.filter(
      (participant) => participant.workField !== workField,
    );
    if (mismatchedParticipants.length > 0) {
      throw new BadRequestException(
        'Project owner, supervisor, and members must have the same work field as the project',
      );
    }
  }

  async assertMemberMatchesProjectWorkField(projectId: string, userId: string): Promise<WorkField> {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project ID');
    }

    const project = await this.projectModel.findById(projectId).select('workField').lean().exec();
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (!project.workField) {
      throw new BadRequestException('Project work field must be configured before adding members');
    }

    const [participant] = await this.userService.findProjectParticipantsByIds([userId]);
    if (participant.workField !== project.workField) {
      throw new BadRequestException('User work field must match the project work field');
    }

    return project.workField;
  }

  /**
   * Create a new project
   */
  async create(createProjectDto: CreateProjectDto): Promise<ProjectDocument> {
    const { owner, supervisorId, members = [], ...rest } = createProjectDto;

    // Validate owner is a valid ObjectId
    if (!Types.ObjectId.isValid(owner)) {
      throw new BadRequestException('Invalid owner user ID');
    }

    // Validate members IDs if provided
    if (members.length > 0) {
      const invalidIds = members.filter((id) => !Types.ObjectId.isValid(id));
      if (invalidIds.length > 0) {
        throw new BadRequestException('Invalid member user IDs');
      }
    }

    await this.validateProjectParticipants(createProjectDto.workField, owner, supervisorId, members);
    const createdProject = new this.projectModel({
      ...rest,
      owner: new Types.ObjectId(owner),
      supervisorId: new Types.ObjectId(supervisorId),
      members: members.map((id) => new Types.ObjectId(id)),
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
      member?: string;
      status?: ProjectStatus;
      isArchived?: boolean;
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

    if (filters?.member && Types.ObjectId.isValid(filters.member)) {
      query.members = new Types.ObjectId(filters.member);
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.isArchived !== undefined) {
      query.isArchived = filters.isArchived;
    }

    const [data, total] = await Promise.all([
      this.projectModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .populate('owner', 'firstName lastName email workField')
        .populate('supervisorId', 'firstName lastName email roles workField')
        .populate('members', 'firstName lastName email workField')
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
      $or: [{ supervisorId: userObjectId }, { members: userObjectId }],
    });

    return projectIds.map((projectId) => projectId.toString());
  }

  async findSupervisedProjects(supervisorId: string, page: number, limit: number) {
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
        .select('title status isArchived members')
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
        membersCount: project.members.length,
      })),
      total,
      page,
      limit,
    };
  }

  async getSupervisedProjectAccess(supervisorId: string, projectId: string) {
    if (!Types.ObjectId.isValid(supervisorId) || !Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid supervisor or project ID');
    }

    const project = await this.projectModel
      .findOne({
        _id: new Types.ObjectId(projectId),
        supervisorId: new Types.ObjectId(supervisorId),
      })
      .select('title members')
      .lean()
      .exec();

    if (!project) {
      throw new NotFoundException('Project not found or is not supervised by the current user');
    }

    return {
      projectId: project._id.toString(),
      projectName: project.title,
      memberIds: project.members.map((memberId) => memberId.toString()),
    };
  }

  async getSupervisedTeamContext(supervisorId: string) {
    if (!Types.ObjectId.isValid(supervisorId)) {
      throw new BadRequestException('Invalid supervisor user ID');
    }

    const projects = await this.projectModel
      .find({ supervisorId: new Types.ObjectId(supervisorId) })
      .select('title members')
      .lean()
      .exec();

    return projects.map((project) => ({
      projectId: project._id.toString(),
      projectName: project.title,
      memberIds: project.members.map((memberId) => memberId.toString()),
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
      .populate('members', 'firstName lastName email workField')
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
      .populate('members', 'firstName lastName email workField')
      .populate('tasks')
      .exec();
  }

  /**
   * Update a project by ID
   */
  async update(id: string, updateProjectDto: UpdateProjectDto): Promise<ProjectDocument> {
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

    if (updateProjectDto.members !== undefined) {
      if (!project.workField) {
        throw new BadRequestException('Project work field must be configured before updating members');
      }
      const invalidIds = updateProjectDto.members?.filter((userId) => !Types.ObjectId.isValid(userId)) || [];
      if (invalidIds.length > 0) {
        throw new BadRequestException('Invalid member user IDs');
      }
      const participants = await this.userService.findProjectParticipantsByIds(updateProjectDto.members);
      if (participants.some((participant) => participant.workField !== project.workField)) {
        throw new BadRequestException('All project members must have the same work field as the project');
      }
      updateData.members = updateProjectDto.members?.map((userId) => new Types.ObjectId(userId)) || [];
    }

    if (updateProjectDto.supervisorId !== undefined) {
      if (!project.workField) {
        throw new BadRequestException('Project work field must be configured before changing supervisor');
      }
      const [supervisor] = await this.userService.findProjectParticipantsByIds([
        updateProjectDto.supervisorId,
      ]);
      if (supervisor.role !== UserRole.SUPERVISOR) {
        throw new BadRequestException('Selected user must have the supervisor role');
      }
      if (supervisor.workField !== project.workField) {
        throw new BadRequestException('Supervisor work field must match the project work field');
      }
      updateData.supervisorId = new Types.ObjectId(updateProjectDto.supervisorId);
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
      .populate('members', 'firstName lastName email workField')
      .populate('tasks')
      .exec();

    if (!updatedProject) {
      throw new NotFoundException('Project not found');
    }

    return updatedProject;
  }

  async setActivation(projectId: string, isActive: boolean): Promise<{
    message: string;
    project: ProjectDocument;
  }> {
    const project = await this.update(projectId, { isArchived: !isActive });

    return {
      message: isActive ? 'Project activated successfully' : 'Project deactivated successfully',
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
   * Add a member to a project
   */
  async addMember(projectId: string, memberId: string): Promise<ProjectDocument> {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project ID');
    }

    if (!Types.ObjectId.isValid(memberId)) {
      throw new BadRequestException('Invalid member user ID');
    }

    const project = await this.projectModel.findById(projectId).exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check if member already exists
    if (project.members.some((m) => m.equals(new Types.ObjectId(memberId)))) {
      throw new BadRequestException('Member already exists in the project');
    }

    await this.assertMemberMatchesProjectWorkField(projectId, memberId);
    project.members.push(new Types.ObjectId(memberId));

    return project.save();
  }

  /**
   * Remove a member from a project
   */
  async removeMember(projectId: string, memberId: string): Promise<ProjectDocument> {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project ID');
    }

    if (!Types.ObjectId.isValid(memberId)) {
      throw new BadRequestException('Invalid member user ID');
    }

    const project = await this.projectModel.findById(projectId).exec();

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    project.members = project.members.filter(
      (m) => !m.equals(new Types.ObjectId(memberId)),
    );

    return project.save();
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
  async removeTask(projectId: string, taskId: string): Promise<ProjectDocument> {
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
    const tasks=await this.taskService.findTaskByProjectId(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((task) => task.status === TaskStatus.DONE).length;
    const inProgressTasks = tasks.filter((task) => task.status === TaskStatus.IN_PROGRESS).length;
    const pendingTasks = tasks.filter((task) => task.status === TaskStatus.TODO).length;
    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

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

  async getProgressList(page: number = 1, limit: number = 10): Promise<{
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
