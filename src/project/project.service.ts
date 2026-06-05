import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project, ProjectDocument, ProjectStatus } from './project.schema';
import { TaskStatus } from '../task/task.schema';
import { TaskService } from 'src/task/task.service';

@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
    private readonly taskService: TaskService,
  ) {}

  /**
   * Create a new project
   */
  async create(createProjectDto: CreateProjectDto): Promise<ProjectDocument> {
    const { owner, members, ...rest } = createProjectDto;

    // Validate owner is a valid ObjectId
    if (!Types.ObjectId.isValid(owner)) {
      throw new BadRequestException('Invalid owner user ID');
    }

    // Validate members IDs if provided
    if (members && members.length > 0) {
      const invalidIds = members.filter((id) => !Types.ObjectId.isValid(id));
      if (invalidIds.length > 0) {
        throw new BadRequestException('Invalid member user IDs');
      }
    }

    const createdProject = new this.projectModel({
      ...rest,
      owner: new Types.ObjectId(owner),
      members: members?.map((id) => new Types.ObjectId(id)) || [],
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
        .populate('owner', 'firstName lastName email')
        .populate('members', 'firstName lastName email')
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

  /**
   * Find a project by ID
   */
  async findById(id: string): Promise<ProjectDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid project ID');
    }

    const project = await this.projectModel
      .findById(id)
      .populate('owner', 'firstName lastName email')
      .populate('members', 'firstName lastName email')
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
      .populate('owner', 'firstName lastName email')
      .populate('members', 'firstName lastName email')
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
      const invalidIds = updateProjectDto.members?.filter((userId) => !Types.ObjectId.isValid(userId)) || [];
      if (invalidIds.length > 0) {
        throw new BadRequestException('Invalid member user IDs');
      }
      updateData.members = updateProjectDto.members?.map((userId) => new Types.ObjectId(userId)) || [];
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
      .populate('owner', 'firstName lastName email')
      .populate('members', 'firstName lastName email')
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
