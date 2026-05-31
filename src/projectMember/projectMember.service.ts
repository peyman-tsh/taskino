import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateProjectMemberDto } from './dto/create-project-member.dto';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto';
import { ProjectMember, ProjectMemberDocument, ProjectMemberRole } from './member.schema';

@Injectable()
export class ProjectMemberService {
  constructor(
    @InjectModel(ProjectMember.name)
    private readonly projectMemberModel: Model<ProjectMemberDocument>,
  ) {}

  /**
   * Create a new project member
   */
  async create(createProjectMemberDto: CreateProjectMemberDto): Promise<ProjectMemberDocument> {
    const { project, user, ...rest } = createProjectMemberDto;

    // Validate project is a valid ObjectId
    if (!Types.ObjectId.isValid(project)) {
      throw new BadRequestException('Invalid project ID');
    }

    // Validate user is a valid ObjectId
    if (!Types.ObjectId.isValid(user)) {
      throw new BadRequestException('Invalid user ID');
    }

    const existingMember = await this.projectMemberModel
      .findOne({
        project: new Types.ObjectId(project),
        user: new Types.ObjectId(user),
        isActive: true,
      })
      .exec();

    if (existingMember) {
      throw new BadRequestException('User is already a member of this project');
    }

    const createdProjectMember = new this.projectMemberModel({
      ...rest,
      project: new Types.ObjectId(project),
      user: new Types.ObjectId(user),
    });

    return await createdProjectMember.save();
  }

  /**
   * Find all project members with pagination and optional filters
   */
  async findAll(
    page: number = 1,
    limit: number = 10,
    filters?: {
      project?: string;
      user?: string;
      role?: ProjectMemberRole;
      isActive?: boolean;
    },
  ): Promise<{
    data: ProjectMemberDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (filters?.project && Types.ObjectId.isValid(filters.project)) {
      query.project = new Types.ObjectId(filters.project);
    }

    if (filters?.user && Types.ObjectId.isValid(filters.user)) {
      query.user = new Types.ObjectId(filters.user);
    }

    if (filters?.role) {
      query.role = filters.role;
    }

    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    const [data, total] = await Promise.all([
      this.projectMemberModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .populate('project', 'title description status')
        .populate('user', 'firstName lastName email mobile')
        .exec(),
      this.projectMemberModel.countDocuments(query).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Find a project member by ID
   */
  async findById(id: string): Promise<ProjectMemberDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid project member ID');
    }

    const projectMember = await this.projectMemberModel
      .findById(id)
      .populate('project', 'title status')
      .populate('user', 'firstName lastName email mobile')
      .exec();

    if (!projectMember) {
      throw new NotFoundException('Project member not found');
    }

    return projectMember;
  }

  /**
   * Find project members by project ID
   */
  async findByProject(projectId: string): Promise<ProjectMemberDocument[]> {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project ID');
    }

    return this.projectMemberModel
      .find({ project: new Types.ObjectId(projectId), isActive: true })
      .populate('project', 'title description status')
      .populate('user', 'firstName lastName email mobile')
      .exec();
  }

  /**
   * Find project members by user ID
   */
  async findByUser(userId: string): Promise<ProjectMemberDocument[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    return this.projectMemberModel
      .find({ user: new Types.ObjectId(userId), isActive: true })
      .populate('project', 'title description status')
      .populate('user', 'firstName lastName email mobile')
      .exec();
  }

  /**
   * Update a project member by ID
   */
  async update(id: string, updateProjectMemberDto: UpdateProjectMemberDto): Promise<ProjectMemberDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid project member ID');
    }

    const projectMember = await this.projectMemberModel.findById(id).exec();

    if (!projectMember) {
      throw new NotFoundException('Project member not found');
    }

    const updateData: Record<string, unknown> = {};

    if (updateProjectMemberDto.role !== undefined) {
      updateData.role = updateProjectMemberDto.role;
    }

    if (updateProjectMemberDto.isActive !== undefined) {
      updateData.isActive = updateProjectMemberDto.isActive;
    }

    const updatedProjectMember = await this.projectMemberModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('project', 'title description status')
      .populate('user', 'firstName lastName email mobile')
      .exec();

    if (!updatedProjectMember) {
      throw new NotFoundException('Project member not found');
    }

    return updatedProjectMember;
  }

  /**
   * Delete a project member by ID
   */
  async delete(id: string): Promise<ProjectMemberDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid project member ID');
    }

    const projectMember = await this.projectMemberModel
      .findByIdAndDelete(id)
      .populate('project', 'title description status')
      .populate('user', 'firstName lastName email mobile')
      .exec();

    if (!projectMember) {
      throw new NotFoundException('Project member not found');
    }

    return projectMember;
  }

  /**
   * Remove a member from a project (soft delete by setting isActive to false)
   */
  async removeMember(projectId: string, userId: string): Promise<ProjectMemberDocument> {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project ID');
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const projectMember = await this.projectMemberModel
      .findOne({
        project: new Types.ObjectId(projectId),
        user: new Types.ObjectId(userId),
      })
      .populate('project', 'title description status')
      .populate('user', 'firstName lastName email mobile')
      .exec();

    if (!projectMember) {
      throw new NotFoundException('Project member not found');
    }

    projectMember.isActive = false;
    return projectMember.save();
  }

  /**
   * Get a member's role in a project
   */
  async getMemberRole(projectId: string, userId: string): Promise<ProjectMemberDocument | null> {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project ID');
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    return this.projectMemberModel
      .findOne({
        project: new Types.ObjectId(projectId),
        user: new Types.ObjectId(userId),
        isActive: true,
      })
      .populate('project', 'title description status')
      .populate('user', 'firstName lastName email mobile')
      .exec();
  }
}