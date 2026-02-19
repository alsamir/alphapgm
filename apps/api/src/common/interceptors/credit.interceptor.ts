import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { CREDIT_COST_KEY } from '../decorators/credit-cost.decorator';

@Injectable()
export class CreditInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const cost = this.reflector.get<number>(CREDIT_COST_KEY, context.getHandler());
    if (!cost) return next.handle();

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;
    if (!userId) return next.handle();

    const balance = await this.prisma.creditBalance.findUnique({
      where: { userId: BigInt(userId) },
    });

    if (!balance || balance.available < cost) {
      throw new ForbiddenException('Insufficient credits. Please upgrade your plan or purchase more credits.');
    }

    // Extract resource ID from request params
    const resourceId = request.params?.id;
    const handlerName = context.getHandler().name;

    return next.handle().pipe(
      tap(async () => {
        let sourceDetail = handlerName;
        let sourceId: number | null = null;

        // For converter detail views, lookup the converter name
        if (handlerName === 'findOne' && resourceId) {
          try {
            const converter = await this.prisma.allData.findUnique({
              where: { id: parseInt(resourceId) },
              select: { name: true, brand: true },
            });
            if (converter) {
              sourceDetail = `${converter.name} - ${converter.brand}`;
              sourceId = parseInt(resourceId);
            }
          } catch {
            sourceDetail = `${handlerName}:${resourceId}`;
          }
        }

        await this.prisma.$transaction([
          this.prisma.creditBalance.update({
            where: { userId: BigInt(userId) },
            data: {
              available: { decrement: cost },
              lifetimeSpent: { increment: cost },
            },
          }),
          this.prisma.creditLedger.create({
            data: {
              userId: BigInt(userId),
              amount: -cost,
              balanceAfter: balance.available - cost,
              type: 'CONSUMPTION',
              sourceDetail,
              sourceId,
            },
          }),
        ]);
      }),
    );
  }
}
