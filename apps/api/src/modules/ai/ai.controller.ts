import { Controller, Post, Get, Body, Param, ParseIntPipe, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('AI')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('chat')
  async chat(
    @CurrentUser('userId') userId: number,
    @Body() body: { message: string; chatId?: number },
  ) {
    const result = await this.aiService.chat(BigInt(userId), body.message, body.chatId);
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
