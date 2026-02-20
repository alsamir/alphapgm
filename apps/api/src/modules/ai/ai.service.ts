import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';
import { PrismaService } from '../../prisma/prisma.service';
import { ConvertersService } from '../converters/converters.service';
import { PricingService } from '../pricing/pricing.service';
import { CreditsService } from '../subscriptions/credits.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CREDITS } from '@catapp/shared-utils';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

type Provider = 'groq' | 'anthropic' | null;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private anthropicClient: Anthropic | null = null;
  private groqClient: Groq | null = null;
  private provider: Provider = null;
  private foundConverters: Array<{ id: number; name: string; brand: string; weight?: string; imageUrl?: string; hasPt: boolean; hasPd: boolean; hasRh: boolean }> = [];

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private convertersService: ConvertersService,
    private pricingService: PricingService,
    private creditsService: CreditsService,
    private subscriptionsService: SubscriptionsService,
  ) {
    // Priority: Groq (free/dev) → Anthropic (production)
    const groqKey = this.configService.get('GROQ_API_KEY');
    if (groqKey && !groqKey.includes('placeholder') && groqKey.length > 10) {
      this.groqClient = new Groq({ apiKey: groqKey });
      this.provider = 'groq';
      this.logger.log('AI provider: Groq (llama-3.3-70b-versatile)');
    }

    const anthropicKey = this.configService.get('ANTHROPIC_API_KEY');
    if (anthropicKey && anthropicKey !== 'sk-ant-...' && !anthropicKey.includes('placeholder')) {
      this.anthropicClient = new Anthropic({ apiKey: anthropicKey });
      if (!this.provider) {
        this.provider = 'anthropic';
        this.logger.log('AI provider: Anthropic (Claude)');
      }
    }

    if (!this.provider) {
      this.logger.warn('No AI provider configured. Set GROQ_API_KEY (free) or ANTHROPIC_API_KEY.');
    }
  }

  async chat(userId: bigint, message: string, chatId?: number, locale?: string) {
    if (!this.provider) {
      const balance = await this.creditsService.getBalance(userId).catch(() => ({ available: 0 }));
      return {
        chatId: chatId || 0,
        message: 'The AI assistant is temporarily unavailable. The administrator needs to configure an API key (GROQ_API_KEY for free tier, or ANTHROPIC_API_KEY). Please try again later.',
        creditsUsed: 0,
        creditsRemaining: balance.available,
      };
    }

    // Check credits — need at least 1 credit (= 100 AI queries)
    const balance = await this.creditsService.getBalance(userId);
    if (balance.available < 1) {
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

    const systemPrompt = `You are Catalyser AI, a helpful assistant for the Catalyser catalytic converter pricing platform.

You have access to a database of ${await this.getConverterCount()} catalytic converters across 99 car brands.

Current metal spot prices (per troy ounce) — these are PUBLIC market data:
- Platinum (Pt): $${metalPrices.platinum?.price || 0} USD
- Palladium (Pd): $${metalPrices.palladium?.price || 0} USD
- Rhodium (Rh): $${metalPrices.rhodium?.price || 0} USD

CAPABILITIES:
1. Search converters by name, brand, or code
2. Check user's credit balance and transaction history
3. Show subscription information and available plans
4. Show user's price list details

CRITICAL DATA PROTECTION RULES:
1. NEVER reveal any prices for individual converters — pricing is a paid feature
2. NEVER reveal metal content values (pt, pd, rh) — these are proprietary
3. NEVER show price breakdowns or estimates per converter
4. General market spot prices (above) are public and can be shared
5. Tell users they can view pricing on the converter detail page (costs 1 credit)
6. You can share: converter name, brand, weight, whether it contains each metal (yes/no)
7. If a user viewed a converter within the last 7 days, they can re-view it for free (no credit deduction)
8. Credit system: 1 credit = 1 converter view = 100 AI queries. Every 100 AI queries deducts 1 credit.

When you find converters, simply describe what you found (name, brand, weight, which metals it contains).
Tell the user: "Click the converter card below to view full pricing details."
The system will automatically show converter cards with links — you don't need to format them specially.

For account questions:
- Use get_credit_balance to show their credits
- Use get_credit_history to show recent transactions
- Use get_subscription_info to show their plan details and available plans
- Use get_price_list to show their price list contents
- To purchase credits, direct them to the dashboard page
- To manage subscriptions, direct them to the pricing page

Keep responses concise and helpful.
${locale && locale !== 'en' ? `\nIMPORTANT: Respond in ${locale === 'ar' ? 'Arabic' : locale === 'fr' ? 'French' : locale === 'de' ? 'German' : locale === 'es' ? 'Spanish' : locale === 'it' ? 'Italian' : locale === 'nl' ? 'Dutch' : locale === 'tr' ? 'Turkish' : 'English'}. The user's interface is in this language.` : ''}`;

    try {
      // Reset found converters for this request
      this.foundConverters = [];

      let finalText: string;

      if (this.provider === 'groq') {
        finalText = await this.chatWithGroq(systemPrompt, previousMessages, message, userId);
      } else {
        finalText = await this.chatWithAnthropic(systemPrompt, previousMessages, message, userId);
      }

      // Record AI query — 100 queries per 1 credit deduction
      const aiResult = await this.creditsService.recordAiQuery(userId);

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
        converters: this.foundConverters,
        creditsUsed: aiResult.creditDeducted,
        creditsRemaining: aiResult.creditsRemaining,
        aiQueriesRemaining: aiResult.queriesRemaining,
        aiQueryCounter: aiResult.aiQueryCounter,
      };
    } catch (err: any) {
      this.logger.error(`AI chat error (${this.provider}): ${err.message}`);
      throw err;
    }
  }

  // =========================================================================
  // Groq provider (free tier — llama-3.3-70b-versatile)
  // =========================================================================

  private async chatWithGroq(
    systemPrompt: string,
    previousMessages: Array<{ role: string; content: string }>,
    message: string,
    userId: bigint,
  ): Promise<string> {
    const tools: Groq.Chat.Completions.ChatCompletionTool[] = [
      {
        type: 'function',
        function: {
          name: 'search_converters',
          description: 'Search the converter database by name, brand, or code. Returns converter names, brands, weights.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query (converter name, code, or brand)' },
              brand: { type: 'string', description: 'Optional: filter by brand name' },
            },
            required: ['query'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_converter_price',
          description: 'Look up details of a specific converter by its database ID number.',
          parameters: {
            type: 'object',
            properties: {
              converterId: { type: 'integer', description: 'The converter ID number' },
            },
            required: ['converterId'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_credit_balance',
          description: 'Get the user\'s current credit balance, lifetime earned and spent.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_credit_history',
          description: 'Get the user\'s recent credit transaction history.',
          parameters: {
            type: 'object',
            properties: {
              page: { type: 'integer', description: 'Page number (default 1)' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_subscription_info',
          description: 'Get the user\'s current subscription plan and available plans.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_price_list',
          description: 'Get the user\'s price list with all items and totals.',
          parameters: { type: 'object', properties: {} },
        },
      },
    ];

    const buildMessages = (): Groq.Chat.Completions.ChatCompletionMessageParam[] => [
      { role: 'system', content: systemPrompt },
      ...previousMessages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    try {
      const messages = buildMessages();
      let response = await this.groqClient!.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1024,
        messages,
        tools,
        tool_choice: 'auto',
      });

      // Tool call loop
      let iterations = 0;
      while (response.choices[0]?.finish_reason === 'tool_calls' && iterations < 5) {
        iterations++;
        const assistantMessage = response.choices[0].message;
        messages.push(assistantMessage as any);

        const toolCalls = assistantMessage.tool_calls || [];
        for (const toolCall of toolCalls) {
          const args = JSON.parse(toolCall.function.arguments);
          const result = await this.executeToolCall(toolCall.function.name, args, userId);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: result,
          } as any);
        }

        response = await this.groqClient!.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 1024,
          messages,
          tools,
          tool_choice: 'auto',
        });
      }

      return response.choices[0]?.message?.content || 'I could not generate a response. Please try again.';
    } catch (err: any) {
      // If tool calling fails (malformed call), retry without tools
      if (err.message?.includes('tool_use_failed') || err.status === 400) {
        this.logger.warn('Groq tool call failed, retrying without tools');
        const fallbackMessages = buildMessages();
        const fallbackResponse = await this.groqClient!.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 1024,
          messages: fallbackMessages,
        });
        return fallbackResponse.choices[0]?.message?.content || 'I could not generate a response. Please try again.';
      }
      throw err;
    }
  }

  // =========================================================================
  // Anthropic provider (production — Claude)
  // =========================================================================

  private async chatWithAnthropic(
    systemPrompt: string,
    previousMessages: Array<{ role: string; content: string }>,
    message: string,
    userId: bigint,
  ): Promise<string> {
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
        description: 'Look up details of a specific converter by its database ID',
        input_schema: {
          type: 'object' as const,
          properties: {
            converterId: { type: 'number', description: 'The converter ID' },
          },
          required: ['converterId'],
        },
      },
      {
        name: 'get_credit_balance',
        description: "Get the user's current credit balance, lifetime earned and spent",
        input_schema: { type: 'object' as const, properties: {} },
      },
      {
        name: 'get_credit_history',
        description: "Get the user's recent credit transaction history",
        input_schema: {
          type: 'object' as const,
          properties: {
            page: { type: 'number', description: 'Page number (default 1)' },
          },
        },
      },
      {
        name: 'get_subscription_info',
        description: "Get the user's current subscription plan and available plans",
        input_schema: { type: 'object' as const, properties: {} },
      },
      {
        name: 'get_price_list',
        description: "Get the user's price list with all items and totals",
        input_schema: { type: 'object' as const, properties: {} },
      },
    ];

    let response = await this.anthropicClient!.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
      tools,
    });

    let finalText = '';
    let iterations = 0;
    while (response.stop_reason === 'tool_use' && iterations < 5) {
      iterations++;
      const toolUseBlocks = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        const result = await this.executeToolCall(toolUse.name, toolUse.input as Record<string, any>, userId);
        toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: result });
      }

      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });

      response = await this.anthropicClient!.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
        tools,
      });
    }

    for (const block of response.content) {
      if (block.type === 'text') {
        finalText += block.text;
      }
    }

    return finalText || 'I could not generate a response. Please try again.';
  }

  // =========================================================================
  // Shared tool execution (used by both providers)
  // =========================================================================

  private async executeToolCall(name: string, args: Record<string, any>, userId: bigint): Promise<string> {
    try {
      if (name === 'search_converters') {
        const searchResult = await this.convertersService.search({
          query: args.query,
          brand: args.brand,
          limit: Math.min(args.limit || 5, 10),
        });
        // Strip ALL proprietary data — no metal values, no prices
        const safeData = await Promise.all(
          searchResult.data.map(async (c: any) => {
            const full = await this.prisma.allData.findUnique({ where: { id: c.id } });
            if (!full) return { id: c.id, name: c.name, brand: c.brand };
            const hasPt = full.pt != null && full.pt !== '' && parseFloat(String(full.pt)) > 0;
            const hasPd = full.pd != null && full.pd !== '' && parseFloat(String(full.pd)) > 0;
            const hasRh = full.rh != null && full.rh !== '' && parseFloat(String(full.rh)) > 0;
            // Check if user viewed this converter within 7 days
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const recentView = await this.prisma.creditLedger.findFirst({
              where: { userId, sourceId: full.id, type: 'CONSUMPTION', createdAt: { gte: sevenDaysAgo } },
            });
            // Collect converter references for the frontend cards
            this.foundConverters.push({
              id: full.id,
              name: full.name,
              brand: full.brand,
              weight: full.weight || undefined,
              imageUrl: full.imageUrl || undefined,
              hasPt, hasPd, hasRh,
            });
            return {
              id: full.id,
              name: full.name,
              brand: full.brand,
              weight: full.weight,
              hasPt, hasPd, hasRh,
              freeReview: !!recentView,
              // NO prices, NO metal content values
            };
          }),
        );
        return JSON.stringify(safeData);
      } else if (name === 'get_converter_price') {
        // Don't return actual prices — tell AI to redirect user to detail page
        const converter = await this.convertersService.findById(args.converterId);
        const hasPt = converter.pt != null && converter.pt !== '' && parseFloat(String(converter.pt)) > 0;
        const hasPd = converter.pd != null && converter.pd !== '' && parseFloat(String(converter.pd)) > 0;
        const hasRh = converter.rh != null && converter.rh !== '' && parseFloat(String(converter.rh)) > 0;
        // Check 7-day history
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentView = await this.prisma.creditLedger.findFirst({
          where: { userId, sourceId: converter.id, type: 'CONSUMPTION', createdAt: { gte: sevenDaysAgo } },
        });
        this.foundConverters.push({
          id: converter.id,
          name: converter.name,
          brand: converter.brand,
          weight: converter.weight || undefined,
          imageUrl: converter.imageUrl || undefined,
          hasPt, hasPd, hasRh,
        });
        return JSON.stringify({
          id: converter.id,
          name: converter.name,
          brand: converter.brand,
          weight: converter.weight,
          hasPt, hasPd, hasRh,
          freeReview: !!recentView,
          note: recentView
            ? 'User viewed this converter recently. They can re-view pricing for free on the detail page (no credit needed).'
            : 'Pricing is available on the converter detail page (costs 1 credit to view).',
        });
      } else if (name === 'get_credit_balance') {
        const balance = await this.creditsService.getBalance(userId);
        return JSON.stringify({
          available: balance.available,
          lifetimeEarned: balance.lifetimeEarned,
          lifetimeSpent: balance.lifetimeSpent,
          aiQueryCounter: balance.aiQueryCounter,
          aiQueriesPerCredit: CREDITS.AI_QUERIES_PER_CREDIT,
          aiQueriesRemaining: (balance.available > 0 ? (balance.available - 1) * CREDITS.AI_QUERIES_PER_CREDIT + (CREDITS.AI_QUERIES_PER_CREDIT - balance.aiQueryCounter) : 0),
          converterViewsRemaining: balance.available,
          note: `1 credit = 1 converter view OR ${CREDITS.AI_QUERIES_PER_CREDIT} AI queries. User has used ${balance.aiQueryCounter}/${CREDITS.AI_QUERIES_PER_CREDIT} AI queries in current credit.`,
        });
      } else if (name === 'get_credit_history') {
        const page = args.page || 1;
        const ledger = await this.creditsService.getLedger(userId, page, 10);
        return JSON.stringify({
          transactions: ledger.data.map((e: any) => ({
            amount: e.amount,
            type: e.type,
            detail: e.sourceDetail,
            date: e.createdAt,
            balanceAfter: e.balanceAfter,
          })),
          page: ledger.page,
          hasMore: ledger.hasMore,
        });
      } else if (name === 'get_subscription_info') {
        const subscription = await this.subscriptionsService.getUserSubscription(userId);
        const plans = await this.subscriptionsService.getPlans();
        return JSON.stringify({
          currentPlan: subscription ? {
            name: subscription.plan.name,
            status: subscription.status,
            monthlyCredits: subscription.plan.monthlyCredits,
            currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          } : null,
          availablePlans: plans.map((p: any) => ({
            name: p.name,
            slug: p.slug,
            monthlyCredits: p.monthlyCredits,
            priceCents: p.priceCents,
          })),
        });
      } else if (name === 'get_price_list') {
        const lists = await this.prisma.priceList.findMany({
          where: { userId },
          include: { items: true },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        });
        if (lists.length === 0) {
          return JSON.stringify({ hasPriceList: false, message: 'No price list found. User can create one from the converter detail page.' });
        }
        const list = lists[0];
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const isExpired = list.updatedAt < sevenDaysAgo;
        // Get converter details for items
        const converterIds = list.items.map((i) => i.converterId);
        const converters = await this.prisma.allData.findMany({ where: { id: { in: converterIds } } });
        const converterMap = new Map(converters.map((c) => [c.id, c]));
        return JSON.stringify({
          hasPriceList: true,
          name: list.name,
          status: isExpired ? 'expired' : list.status,
          isExpired,
          itemCount: list.items.length,
          total: list.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0),
          updatedAt: list.updatedAt.toISOString(),
          expiresAt: new Date(list.updatedAt.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          items: list.items.slice(0, 10).map((item) => {
            const conv = converterMap.get(item.converterId);
            return {
              converterName: conv?.name || 'Unknown',
              brand: conv?.brand || 'Unknown',
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            };
          }),
        });
      }
      return 'Unknown tool';
    } catch (err: any) {
      return `Error: ${err.message}`;
    }
  }

  async getChatHistory(userId: bigint) {
    const chats = await this.prisma.aiChat.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
    return chats.map((c) => ({
      id: c.id,
      messages: c.messages,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  }

  async getChat(userId: bigint, chatId: number) {
    const chat = await this.prisma.aiChat.findFirst({ where: { id: chatId, userId } });
    if (!chat) return null;
    return {
      id: chat.id,
      messages: chat.messages,
      createdAt: chat.createdAt.toISOString(),
      updatedAt: chat.updatedAt.toISOString(),
    };
  }

  /**
   * Identify a converter from an uploaded image.
   * Costs 100 AI queries (= 1 credit). Stores image for admin review.
   */
  async identifyFromImage(
    userId: bigint,
    imageBuffer: Buffer,
    mimeType: string,
    message?: string,
    locale?: string,
    ipAddress?: string,
  ) {
    if (!this.provider) {
      throw new ForbiddenException('AI assistant is not configured. Set GROQ_API_KEY or ANTHROPIC_API_KEY.');
    }

    // Check credits — image identification costs 1 full credit (100 AI queries)
    const balance = await this.creditsService.getBalance(userId);
    if (balance.available < 1) {
      throw new ForbiddenException('Insufficient credits for image identification. Each image costs 1 credit.');
    }

    // Save image to disk for admin review
    const uploadsDir = path.resolve(process.cwd(), 'uploads/ai-identify');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, imageBuffer);

    try {
      // Convert to base64 for AI vision (Groq limit: 4MB base64)
      const base64Image = imageBuffer.toString('base64');
      if (this.provider === 'groq' && imageBuffer.length > 4 * 1024 * 1024) {
        throw new ForbiddenException('Image too large for AI processing. Please use an image under 4MB.');
      }
      const dataUrl = `data:${mimeType};base64,${base64Image}`;

      const userPrompt = message || 'Identify this catalytic converter. What brand and model is it?';

      const langInstruction = locale && locale !== 'en'
        ? `\nRespond in ${locale === 'ar' ? 'Arabic' : locale === 'fr' ? 'French' : locale === 'de' ? 'German' : locale === 'es' ? 'Spanish' : locale === 'it' ? 'Italian' : locale === 'nl' ? 'Dutch' : locale === 'tr' ? 'Turkish' : 'English'}.`
        : '';

      const systemText = `You are a catalytic converter identification expert. Analyze the image and identify the converter.
Provide: brand name, model/part number, any visible markings or codes.
If you can identify specific features (shape, size, markings), describe them.
After identification, suggest search terms that could find this converter in our database.
CRITICAL: NEVER reveal pricing or metal content values.${langInstruction}`;

      let identificationText: string;

      if (this.provider === 'groq') {
        // Groq vision: Llama 4 Scout (multimodal)
        const response = await this.groqClient!.chat.completions.create({
          model: 'meta-llama/llama-4-scout-17b-16e-instruct',
          max_tokens: 1024,
          messages: [
            { role: 'system', content: systemText },
            {
              role: 'user',
              content: [
                { type: 'text', text: userPrompt },
                { type: 'image_url', image_url: { url: dataUrl } },
              ],
            },
          ],
        });
        identificationText = response.choices[0]?.message?.content || 'Could not identify the converter from this image.';
      } else {
        // Anthropic Claude vision
        const response = await this.anthropicClient!.messages.create({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 1024,
          system: systemText,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                    data: base64Image,
                  },
                },
                { type: 'text', text: userPrompt },
              ],
            },
          ],
        });
        identificationText = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('\n') || 'Could not identify the converter from this image.';
      }

      // Try to search for matching converters based on identification
      this.foundConverters = [];
      const searchTerms = this.extractSearchTerms(identificationText);
      let matchedConverters: any[] = [];

      if (searchTerms.length > 0) {
        for (const term of searchTerms.slice(0, 3)) {
          try {
            const results = await this.convertersService.search({ query: term, limit: 3 });
            for (const c of results.data) {
              if (!matchedConverters.find((m) => m.id === c.id)) {
                const full = await this.prisma.allData.findUnique({ where: { id: c.id } });
                if (full) {
                  const entry = {
                    id: full.id,
                    name: full.name,
                    brand: full.brand,
                    weight: full.weight || undefined,
                    imageUrl: full.imageUrl || undefined,
                    hasPt: full.pt != null && full.pt !== '' && parseFloat(String(full.pt)) > 0,
                    hasPd: full.pd != null && full.pd !== '' && parseFloat(String(full.pd)) > 0,
                    hasRh: full.rh != null && full.rh !== '' && parseFloat(String(full.rh)) > 0,
                  };
                  matchedConverters.push(entry);
                  this.foundConverters.push(entry);
                }
              }
            }
          } catch {
            // Search failures are non-critical
          }
        }
      }

      // Deduct 1 credit (= 100 AI queries) for image identification
      const aiResult = await this.creditsService.recordAiQuery(userId, CREDITS.AI_QUERIES_PER_CREDIT);

      // Save record for admin review
      await this.prisma.aiImageUpload.create({
        data: {
          userId,
          imagePath: `ai-identify/${filename}`,
          result: {
            identification: identificationText,
            searchTerms,
            matchedConverterIds: matchedConverters.map((c) => c.id),
            matchCount: matchedConverters.length,
          },
          ipAddress: ipAddress || null,
        },
      });

      return {
        identification: identificationText,
        converters: this.foundConverters,
        creditsUsed: aiResult.creditDeducted,
        creditsRemaining: aiResult.creditsRemaining,
        aiQueriesRemaining: aiResult.queriesRemaining,
      };
    } catch (err: any) {
      this.logger.error(`Image identification error: ${err.message}`);
      throw err;
    }
  }

  private extractSearchTerms(text: string): string[] {
    const terms: string[] = [];
    // Look for patterns like part numbers, brand names, codes
    const codePatterns = text.match(/\b[A-Z0-9]{3,}[-/]?[A-Z0-9]{2,}\b/g);
    if (codePatterns) {
      terms.push(...codePatterns.slice(0, 3));
    }
    // Extract potential brand names (common car brands)
    const brands = ['BMW', 'Mercedes', 'Toyota', 'Honda', 'Ford', 'Audi', 'VW', 'Volkswagen',
      'Nissan', 'Hyundai', 'Kia', 'Chevrolet', 'GM', 'Bosal', 'Walker', 'Magnaflow'];
    for (const brand of brands) {
      if (text.toLowerCase().includes(brand.toLowerCase())) {
        terms.push(brand);
      }
    }
    return [...new Set(terms)];
  }

  private async getConverterCount(): Promise<number> {
    return this.prisma.allData.count();
  }
}
