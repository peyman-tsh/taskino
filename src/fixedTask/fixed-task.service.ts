import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProjectService } from '../project/project.service';
import { UserRole } from '../user/schemas/user.schema';
import { UserService } from '../user/user.service';
import { CreateFixedTaskDto } from './dto/create-fixed-task.dto';
import { QueryFixedTaskDto } from './dto/query-fixed-task.dto';
import { UpdateFixedTaskDto } from './dto/update-fixed-task.dto';
import { FixedTaskTemplate, FixedTaskTemplateDocument } from './fixed-task.schema';

@Injectable()
export class FixedTaskService {
  constructor(
    @InjectModel(FixedTaskTemplate.name)
    private readonly fixedTaskModel: Model<FixedTaskTemplateDocument>,
    private readonly userService: UserService,
    private readonly projectService: ProjectService,
  ) {}

  private toObjectId(id: string, label: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label}`);
    }

    return new Types.ObjectId(id);
  }

  private populateTemplate(query: any) {
    return query
      .populate('assignedTo', 'firstName lastName email mobile roles workField isActive')
      .populate('createdBy', 'firstName lastName email roles workField')
      .populate('projectId', 'title status workField isArchived');
  }

  private async validateParticipants(
    creatorId: string,
    assignedTo: string,
    projectId?: string,
  ): Promise<void> {
    if (projectId) {
      await this.projectService.assertTaskParticipants(projectId, creatorId, [assignedTo]);
      return;
    }

    const participants = await this.userService.findProjectParticipantsByIds([
      creatorId,
      assignedTo,
    ]);
    const creator = participants.find((participant) => participant.userId === creatorId);
    const assignee = participants.find((participant) => participant.userId === assignedTo);

    if (creator?.role !== UserRole.MANAGER) {
      throw new BadRequestException('Fixed task creator must have the manager role');
    }

    if (![UserRole.SPECIALIST, UserRole.SUPERVISOR].includes(assignee?.role as UserRole)) {
      throw new BadRequestException(
        'Fixed task assignee must have the specialist or supervisor role',
      );
    }

    if (creator?.workField !== assignee?.workField) {
      throw new BadRequestException('Fixed task creator and assignee must have the same work field');
    }
  }

  async create(creatorId: string, dto: CreateFixedTaskDto) {
    this.toObjectId(creatorId, 'creator user ID');
    this.toObjectId(dto.assignedTo, 'assigned user ID');
    if (dto.projectId) this.toObjectId(dto.projectId, 'project ID');

    await this.validateParticipants(creatorId, dto.assignedTo, dto.projectId);

    const templateId = new Types.ObjectId();
    const template = new this.fixedTaskModel({
      _id: templateId,
      title: dto.title,
      assignedTo: new Types.ObjectId(dto.assignedTo),
      createdBy: new Types.ObjectId(creatorId),
      projectId: dto.projectId ? new Types.ObjectId(dto.projectId) : undefined,
      recurrence: dto.recurrence,
      description: dto.description ?? '',
      isActive: dto.isActive ?? true,
      nextRunAt: dto.nextRunAt ? new Date(dto.nextRunAt) : undefined,
      sourceExcel: `manual:${templateId.toString()}`,
      sourceSheet: 'manual',
      sourceRow: 0,
    });

    await template.save();
    return this.findById(template._id.toString());
  }

  async findAll(queryDto: QueryFixedTaskDto) {
    const query: Record<string, unknown> = {};
    if (queryDto.assignedTo) {
      query.assignedTo = this.toObjectId(queryDto.assignedTo, 'assigned user ID');
    }
    if (queryDto.projectId) {
      query.projectId = this.toObjectId(queryDto.projectId, 'project ID');
    }
    if (queryDto.recurrence) query.recurrence = queryDto.recurrence;
    if (queryDto.isActive !== undefined) query.isActive = queryDto.isActive;

    const skip = (queryDto.page - 1) * queryDto.limit;
    const [data, total] = await Promise.all([
      this.populateTemplate(
        this.fixedTaskModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(queryDto.limit),
      ).exec(),
      this.fixedTaskModel.countDocuments(query).exec(),
    ]);

    return { data, total, page: queryDto.page, limit: queryDto.limit };
  }

  async findById(id: string) {
    const template = await this.populateTemplate(
      this.fixedTaskModel.findById(this.toObjectId(id, 'fixed task ID')),
    ).exec();

    if (!template) {
      throw new NotFoundException('Fixed task template not found');
    }

    return template;
  }

  async update(id: string, creatorId: string, dto: UpdateFixedTaskDto) {
    const template = await this.fixedTaskModel
      .findById(this.toObjectId(id, 'fixed task ID'))
      .exec();
    if (!template) {
      throw new NotFoundException('Fixed task template not found');
    }

    const assignedTo = dto.assignedTo ?? template.assignedTo.toString();
    const projectId =
      dto.projectId !== undefined ? dto.projectId : template.projectId?.toString();

    await this.validateParticipants(creatorId, assignedTo, projectId);

    const updateData: Record<string, unknown> = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.assignedTo !== undefined) updateData.assignedTo = new Types.ObjectId(dto.assignedTo);
    if (dto.projectId !== undefined) updateData.projectId = new Types.ObjectId(dto.projectId);
    if (dto.recurrence !== undefined) updateData.recurrence = dto.recurrence;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.nextRunAt !== undefined) updateData.nextRunAt = new Date(dto.nextRunAt);

    const updatedTemplate = await this.fixedTaskModel
      .findByIdAndUpdate(template._id, updateData, { returnDocument: 'after', runValidators: true })
      .exec();

    if (!updatedTemplate) {
      throw new NotFoundException('Fixed task template not found');
    }

    return this.findById(updatedTemplate._id.toString());
  }

  async delete(id: string): Promise<void> {
    const result = await this.fixedTaskModel
      .findByIdAndDelete(this.toObjectId(id, 'fixed task ID'))
      .exec();

    if (!result) {
      throw new NotFoundException('Fixed task template not found');
    }
  }

  findActiveTemplates() {
    return this.populateTemplate(this.fixedTaskModel.find({ isActive: true })).exec();
  }
}
