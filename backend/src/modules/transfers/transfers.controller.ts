import { Controller, Get, Post, Body, Param, Put, UseGuards, Query, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../guards/roles.guard';
import { TransfersService } from './transfers.service';
import { CreateTransferDto, UpdateTransferStatusDto } from './dto/transfer.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('transfers')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateTransferDto) {
    return this.transfersService.create(req.user.companyId, req.user.userId, dto);
  }

  @Get()
  findAll(@Request() req: any, @Query() query: PaginationDto) {
    return this.transfersService.findAll(req.user.companyId, query);
  }

  @Put(':id/status')
  updateStatus(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateTransferStatusDto,
  ) {
    return this.transfersService.updateStatus(req.user.companyId, id, req.user.userId, dto);
  }
}
