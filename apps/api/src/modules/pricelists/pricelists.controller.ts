import {
  Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe,
  UseGuards, Res, HttpCode, HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PriceListsService } from './pricelists.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Price Lists')
@Controller('pricelists')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PriceListsController {
  constructor(private priceListsService: PriceListsService) {}

  @Get()
  async list(@CurrentUser('userId') userId: number) {
    const lists = await this.priceListsService.listByUser(BigInt(userId));
    return { success: true, data: lists };
  }

  @Get(':id')
  async getById(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('userId') userId: number,
  ) {
    const list = await this.priceListsService.getById(id, BigInt(userId));
    return { success: true, data: list };
  }

  @Post()
  async create(
    @Body() body: { name: string },
    @CurrentUser('userId') userId: number,
  ) {
    const list = await this.priceListsService.create(BigInt(userId), body.name);
    return { success: true, data: list };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('userId') userId: number,
  ) {
    const result = await this.priceListsService.delete(id, BigInt(userId));
    return { success: true, data: result };
  }

  @Post(':id/items')
  async addItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { converterId: number; quantity: number },
    @CurrentUser('userId') userId: number,
  ) {
    const item = await this.priceListsService.addItem(
      id, BigInt(userId), body.converterId, body.quantity || 1,
    );
    return { success: true, data: item };
  }

  @Put(':id/items/:itemId')
  async updateItemQuantity(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() body: { quantity: number },
    @CurrentUser('userId') userId: number,
  ) {
    const result = await this.priceListsService.updateItemQuantity(
      id, itemId, BigInt(userId), body.quantity,
    );
    return { success: true, data: result };
  }

  @Delete(':id/items/:itemId')
  @HttpCode(HttpStatus.OK)
  async removeItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @CurrentUser('userId') userId: number,
  ) {
    const result = await this.priceListsService.removeItem(id, itemId, BigInt(userId));
    return { success: true, data: result };
  }

  @Get(':id/export')
  async exportList(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('userId') userId: number,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.priceListsService.exportAsPdf(id, BigInt(userId));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="pricelist-${id}.pdf"`);
    res.send(pdfBuffer);
  }
}
