import {
  Controller, Post, Get, Body, Param, ParseIntPipe, UseGuards, Query,
  UseInterceptors, UploadedFile, Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Request } from 'express';

@ApiTags('AI')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('chat')
  async chat(
    @CurrentUser('userId') userId: number,
    @Body() body: { message: string; chatId?: number; locale?: string },
  ) {
    const result = await this.aiService.chat(BigInt(userId), body.message, body.chatId, body.locale);
    return { success: true, data: result };
  }

  @Post('identify')
  @UseInterceptors(FileInterceptor('image', {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed'), false);
      }
      cb(null, true);
    },
  }))
  async identifyConverter(
    @CurrentUser('userId') userId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { message?: string; locale?: string },
    @Req() req: Request,
  ) {
    if (!file) {
      return { success: false, error: 'No image uploaded' };
    }
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
    const result = await this.aiService.identifyFromImage(
      BigInt(userId),
      file.buffer,
      file.mimetype,
      body.message,
      body.locale,
      ip,
    );
    return { success: true, data: result };
  }

  @Get('history')
  async getChatHistory(@CurrentUser('userId') userId: number) {
    const history = await this.aiService.getChatHistory(BigInt(userId));
    return { success: true, data: history };
  }

  @Get('chat/:chatId')
  async getChat(
    @CurrentUser('userId') userId: number,
    @Param('chatId', ParseIntPipe) chatId: number,
  ) {
    const chat = await this.aiService.getChat(BigInt(userId), chatId);
    return { success: true, data: chat };
  }
}
