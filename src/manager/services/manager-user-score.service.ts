import { Injectable } from '@nestjs/common';
import { UserService } from '../../user/services/user.service';

@Injectable()
export class ManagerUserScoreService {
  constructor(private readonly userService: UserService) {}

  adjustSpecialistScore(userId: string, score: number) {
    return this.userService.adjustSpecialistScoreManually(userId, score);
  }
}
