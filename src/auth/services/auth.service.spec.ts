import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Types } from 'mongoose';
import { InternalEventBus } from '../../common/events/internal-event-bus.service';
import { WorkField } from '../../common/enums/work-field.enum';
import { NotificationEvents } from '../../notification/events/notification.events';
import { UserDocument, UserRole } from '../../user/schemas/user.schema';
import { UserService } from '../../user/services/user.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const userService = {
    create: jest.fn(),
  };
  const jwtService = {
    sign: jest.fn(() => 'token'),
  };
  const configService = {
    get: jest.fn(),
  };
  const eventBus = {
    publish: jest.fn(),
  };
  const service = new AuthService(
    userService as unknown as UserService,
    jwtService as unknown as JwtService,
    configService as unknown as ConfigService,
    eventBus as unknown as InternalEventBus,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('publishes a registration event after creating a user', async () => {
    const user = {
      _id: new Types.ObjectId(),
      firstName: 'Ali',
      lastName: 'Ahmadi',
      email: 'ali@example.com',
      roles: UserRole.SPECIALIST,
      workField: WorkField.IT,
    } as UserDocument;
    userService.create.mockResolvedValue(user);

    await service.register({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '123456',
      workField: user.workField,
    });

    expect(eventBus.publish).toHaveBeenCalledWith(
      NotificationEvents.USER_REGISTERED,
      expect.objectContaining({
        userId: user._id.toString(),
        workField: WorkField.IT,
      }),
    );
  });
});
