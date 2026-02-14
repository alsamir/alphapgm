import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../../prisma/prisma.service';
import { ConvertersService } from '../converters/converters.service';
import { PricingService } from '../pricing/pricing.service';
import { CreditsService } from '../subscriptions/credits.service';
import { CREDITS } from '@catapp/shared-utils';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private client: Anthropic | null = null;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private convertersService: ConvertersService,
    private pricingService: PricingService,
    private creditsService: CreditsService,
  ) {
    const apiKey = this.configService.get('ANTHROPIC_API_KEY');
    if (apiKey && apiKey !== 'sk-ant-...') {
      this.client = new Anthropic({ apiKey });
    }
  }

  async chat(userId: bigint, message: string, chatId?: number) {
    if (!this.client) {
      return {
        chatId: chatId || 0,
        message: 'AI assistant is not configured. Please contact support.',
        creditsUsed: 0,
        creditsRemaining: 0,
      };
    }

    // Check credits
    const balance = await this.creditsService.getBalance(userId);
    if (balance.available < CREDITS.AI_QUERY_COST) {
      throw new ForbiddenException('Insufficient credits for AI query. Please upgrade or purchase more credits.');
    }

    // Get or create chat
    let chat: any;
    let previousMessages: Array<{ role: string; content: string }> = [];
    if (chatId) {
      chat = await this.prisma.aiChat.findFirst({ where: { id: chatId, userId } });
      if (chat) {
        previousMessages = chat.messages as Array<{ role: string; content: string }>;
      }
    }

    // Get current context
    const metalPrices = await this.pricingService.getMetalPrices();
    const percentages = await this.pricingService.getPercentages();

    const systemPrompt = `You are Catalyser AI, a helpful assistant specializing in catalytic converter pricing and precious metals.

You have access to a database of ${await this.getConverterCount()} catalytic converters across 99 car brands.

Current metal prices (per troy ounce):
- Platinum (Pt): $${metalPrices.platinum?.price || 0} USD
- Palladium (Pd): $${metalPrices.palladium?.price || 0} USD
- Rhodium (Rh): $${metalPrices.rhodium?.price || 0} USD

Recovery percentages:
- Pt: ${percentages.pt || 0}%, Pd: ${percentages.pd || 0}%, Rh: ${percentages.rh || 0}%

Price formula: (metal_content_g/kg × weight_kg × spot_price_per_gram × recovery_%) for each metal, summed together.
1 troy ounce = 31.1035 grams.

When users ask about converter prices, search the database and calculate prices using current metal prices and recovery rates.
Be concise, helpful, and provide price breakdowns when relevant.
Always mention that prices are estimates based on current market rates.`;

    const messages: Anthropic.MessageParam[] = [
      ...previousMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    const tools: Anthropic.Tool[] = [
      {
        name: 'search_converters',
        description: 'Search the converter database by name, brand, or code',
        input_schema: {
          type: 'object' as const,
          properties: {
            query: { type: 'string', description: 'Search query (converter name, code, or brand)' },
            brand: { type: 'string', description: 'Filter by brand name' },
            limit: { type: 'number', description: 'Max results (default 5)' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_converter_price',
        description: 'Calculate the current price of a specific converter by its ID',
        input_schema: {
          type: 'object' as const,
          properties: {
            converterId: { type: 'number', description: 'The converter ID' },
          },
          required: ['converterId'],
        },
      },
    ];

    try {
      let response = await this.client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
        tools,
      });

      // Handle tool use
      let finalText = '';
      while (response.stop_reason === 'tool_use') {
        const toolUseBlocks = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const toolUse of toolUseBlocks) {
          let result: string;
          try {
            if (toolUse.name === 'search_converters') {
              const input = toolUse.input as { query: string; brand?: string; limit?: number };
              const searchResult = await this.convertersService.search({
                query: input.query,
                brand: input.brand,
                limit: Math.min(input.limit || 5, 10),
              });
              // Include full data for AI (including metals)
              const fullData = await Promise.all(
                searchResult.data.map(async (c: any) => {
                  const full = await this.prisma.allData.findUnique({ where: { id: c.id } });
                  return full;
                }),
              );
              result = JSON.stringify(fullData);
            } else if (toolUse.name === 'get_converter_price') {
              const input = toolUse.input as { converterId: number };
              const converter = await this.convertersService.findById(input.converterId);
              const price = await this.pricingService.calculatePrice(converter);
              result = JSON.stringify({ converter, price });
            } else {
              result = 'Unknown tool';
            }
          } catch (err: any) {
            result = `Error: ${err.message}`;
          }
          toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: result });
        }

        messages.push({ role: 'assistant', content: response.content });
        messages.push({ role: 'user', content: toolResults });

        response = await this.client.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 1024,
          system: systemPrompt,
          messages,
          tools,
        });
      }

      // Extract text from response
      for (const block of response.content) {
        if (block.type === 'text') {
          finalText += block.text;
        }
      }

      // Deduct credit
      await this.creditsService.deductCredits(userId, CREDITS.AI_QUERY_COST, 'AI chat query');
      const newBalance = await this.creditsService.getBalance(userId);

      // Save chat
      const allMessages = [
        ...previousMessages,
        { role: 'user', content: message },
        { role: 'assistant', content: finalText },
      ];

      let savedChat: any;
      if (chat) {
        savedChat = await this.prisma.aiChat.update({
          where: { id: chat.id },
          data: { messages: allMessages },
        });
      } else {
        savedChat = await this.prisma.aiChat.create({
          data: { userId, messages: allMessages },
        });
      }

      return {
        chatId: savedChat.id,
        message: finalText,
        creditsUsed: CREDITS.AI_QUERY_COST,
        creditsRemaining: newBalance.available,
      };
    } catch (err: any) {
      this.logger.error(`AI chat error: ${err.message}`);
      throw err;
    }
  }

  async getChatHistory(userId: bigint) {
    return this.prisma.aiChat.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
  }

  async getChat(userId: bigint, chatId: number) {
    return this.prisma.aiChat.findFirst({ where: { id: chatId, userId } });
  }

  private async getConverterCount(): Promise<number> {
    return this.prisma.allData.count();
  }
}
