import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guard/jwt.guard';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../user/roles.decorator';
import { RolesGuard } from '../user/roles.guard';
import { UserRole } from '../user/schemas/user.schema';
import { HolidayService } from './services/holiday.service';

@ApiTags('Holidays')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MANAGER)
@Controller('holidays')
export class HolidayController {
  constructor(private readonly holidayService: HolidayService) {}

  @Post('seed/iran-1405')
  @Public()
  @ApiOperation({
    summary: 'Seed Iran official holidays for Jalali year 1405',
    description:
      'Uses the official holiday list published by the University of Tehran Calendar Center.',
  })
  @ApiCreatedResponse({
    description: 'Iran 1405 official holidays seeded successfully',
  })
  seedIran1405OfficialHolidays() {
    return this.holidayService.seedIran1405OfficialHolidays();
  }

  @Get('iran-1405')
  @ApiOperation({
    summary: 'Get Iran official holidays for Jalali year 1405',
  })
  @ApiOkResponse({
    description: 'Iran 1405 official holidays retrieved successfully',
  })
  findIran1405OfficialHolidays() {
    return this.holidayService.findIran1405OfficialHolidays();
  }
}
