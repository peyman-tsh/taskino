import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserRole } from '../user/schemas/user.schema';
import { UserService } from '../user/user.service';
import { isValidTimeRange } from '../common/constants/time.constants';
import { CreateFixedTaskDto } from './dto/create-fixed-task.dto';
import { QueryFixedTaskDto } from './dto/query-fixed-task.dto';
import { UpdateFixedTaskDto } from './dto/update-fixed-task.dto';
import {
  FixedTaskRecurrence,
  FixedTaskStatus,
  FixedTaskTemplate,
  FixedTaskTemplateDocument,
} from './fixed-task.schema';

@Injectable()
export class FixedTaskService {
  constructor(
    @InjectModel(FixedTaskTemplate.name)
    private readonly fixedTaskModel: Model<FixedTaskTemplateDocument>,
    private readonly userService: UserService,
  ) {}

  private toObjectId(id: string, label: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label}`);
    }

    return new Types.ObjectId(id);
  }

  private populateTemplate(query: any) {
    return query
      .populate(
        'assignedTo',
        'firstName lastName email mobile roles workField isActive',
      )
      .populate('createdBy', 'firstName lastName email roles workField');
  }

  private async validateParticipants(
    creatorId: string,
    assignedTo: string,
  ): Promise<void> {
    const participants = await this.userService.findTaskParticipantsByIds([
      creatorId,
      assignedTo,
    ]);
    const creator = participants.find(
      (participant) => participant.userId === creatorId,
    );
    const assignee = participants.find(
      (participant) => participant.userId === assignedTo,
    );

    if (
      ![UserRole.MANAGER, UserRole.SUPERVISOR].includes(
        creator?.role as UserRole,
      )
    ) {
      throw new BadRequestException(
        'Fixed task creator must have the manager or supervisor role',
      );
    }

    if (
      ![UserRole.SPECIALIST, UserRole.SUPERVISOR].includes(
        assignee?.role as UserRole,
      )
    ) {
      throw new BadRequestException(
        'Fixed task assignee must have the specialist or supervisor role',
      );
    }

    if (creator?.workField !== assignee?.workField) {
      throw new BadRequestException(
        'Fixed task creator and assignee must have the same work field',
      );
    }
  }

  private assertValidTimeRange(startTime?: string, endTime?: string): void {
    if (!isValidTimeRange(startTime, endTime)) {
      throw new BadRequestException('endTime must be after startTime');
    }
  }

  async create(creatorId: string, dto: CreateFixedTaskDto) {
    this.toObjectId(creatorId, 'creator user ID');
    this.toObjectId(dto.assignedTo, 'assigned user ID');
    await this.validateParticipants(creatorId, dto.assignedTo);
    this.assertValidTimeRange(dto.startTime, dto.endTime);

    const templateId = new Types.ObjectId();
    const template = new this.fixedTaskModel({
      _id: templateId,
      title: dto.title,
      assignedTo: new Types.ObjectId(dto.assignedTo),
      createdBy: new Types.ObjectId(creatorId),
      recurrence: dto.recurrence,
      status: dto.status ?? FixedTaskStatus.TODO,
      doneTime: dto.status === FixedTaskStatus.DONE ? new Date() : undefined,
      description: dto.description ?? '',
      isActive: dto.isActive ?? true,
      nextRunAt: dto.nextRunAt ? new Date(dto.nextRunAt) : undefined,
      startTime: dto.startTime,
      endTime: dto.endTime,
      sourceExcel: `manual:${templateId.toString()}`,
      sourceSheet: 'manual',
      sourceRow: 0,
    });

    await template.save();
    return this.findById(template._id.toString());
  }

  async findAll(queryDto: QueryFixedTaskDto) {
    const query: Record<string, unknown> = {};
    if (queryDto.title) {
      query.title = {
        $regex: queryDto.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        $options: 'i',
      };
    }
    if (queryDto.assignedTo) {
      query.assignedTo = this.toObjectId(
        queryDto.assignedTo,
        'assigned user ID',
      );
    }
    if (queryDto.recurrence) {
      if (!Object.values(FixedTaskRecurrence).includes(queryDto.recurrence)) {
        throw new BadRequestException('Invalid fixed task recurrence');
      }
      query.recurrence = queryDto.recurrence;
    }
    if (queryDto.isActive !== undefined) query.isActive = queryDto.isActive;

    const skip = (queryDto.page - 1) * queryDto.limit;
    const [data, total] = await Promise.all([
      this.populateTemplate(
        this.fixedTaskModel
          .find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(queryDto.limit),
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
    await this.validateParticipants(creatorId, assignedTo);
    this.assertValidTimeRange(
      dto.startTime ?? template.startTime,
      dto.endTime ?? template.endTime,
    );

    const updateData: Record<string, unknown> = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.assignedTo !== undefined)
      updateData.assignedTo = new Types.ObjectId(dto.assignedTo);
    if (dto.recurrence !== undefined) updateData.recurrence = dto.recurrence;
    if (dto.status !== undefined) {
      updateData.status = dto.status;
      updateData.doneTime =
        dto.status === FixedTaskStatus.DONE
          ? (template.doneTime ?? new Date())
          : null;
    }
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.nextRunAt !== undefined)
      updateData.nextRunAt = new Date(dto.nextRunAt);
    if (dto.startTime !== undefined) updateData.startTime = dto.startTime;
    if (dto.endTime !== undefined) updateData.endTime = dto.endTime;

    const updatedTemplate = await this.fixedTaskModel
      .findByIdAndUpdate(template._id, updateData, {
        returnDocument: 'after',
        runValidators: true,
      })
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
    return this.populateTemplate(
      this.fixedTaskModel.find({ isActive: true }),
    ).exec();
  }
}
