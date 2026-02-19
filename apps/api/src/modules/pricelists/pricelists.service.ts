import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';

@Injectable()
export class PriceListsService {
  constructor(
    private prisma: PrismaService,
    private pricingService: PricingService,
  ) {}

  async listByUser(userId: bigint) {
    const lists = await this.prisma.priceList.findMany({
      where: { userId },
      include: {
        items: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return lists.map((list) => ({
      id: list.id,
      name: list.name,
      status: list.status,
      itemCount: list.items.length,
      total: list.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0),
      createdAt: list.createdAt.toISOString(),
      updatedAt: list.updatedAt.toISOString(),
    }));
  }

  async getById(id: number, userId: bigint) {
    const list = await this.prisma.priceList.findFirst({
      where: { id, userId },
      include: {
        items: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!list) {
      throw new NotFoundException('Price list not found');
    }

    // Fetch converter details for each item
    const converterIds = list.items.map((item) => item.converterId);
    const converters = await this.prisma.allData.findMany({
      where: { id: { in: converterIds } },
    });

    const converterMap = new Map(converters.map((c) => [c.id, c]));

    const items = list.items.map((item) => {
      const converter = converterMap.get(item.converterId);
      return {
        id: item.id,
        converterId: item.converterId,
        converterName: converter?.name || 'Unknown',
        converterBrand: converter?.brand || 'Unknown',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        createdAt: item.createdAt.toISOString(),
      };
    });

    return {
      id: list.id,
      name: list.name,
      status: list.status,
      items,
      total: items.reduce((sum, item) => sum + (item.totalPrice || 0), 0),
      createdAt: list.createdAt.toISOString(),
      updatedAt: list.updatedAt.toISOString(),
    };
  }

  async create(userId: bigint, name: string) {
    const list = await this.prisma.priceList.create({
      data: {
        userId,
        name,
        status: 'draft',
      },
    });

    return {
      id: list.id,
      name: list.name,
      status: list.status,
      itemCount: 0,
      total: 0,
      createdAt: list.createdAt.toISOString(),
      updatedAt: list.updatedAt.toISOString(),
    };
  }

  async delete(id: number, userId: bigint) {
    const list = await this.prisma.priceList.findFirst({
      where: { id, userId },
    });

    if (!list) {
      throw new NotFoundException('Price list not found');
    }

    await this.prisma.priceList.delete({ where: { id } });
    return { success: true };
  }

  async addItem(priceListId: number, userId: bigint, converterId: number, quantity: number) {
    // Verify list belongs to user
    const list = await this.prisma.priceList.findFirst({
      where: { id: priceListId, userId },
    });

    if (!list) {
      throw new NotFoundException('Price list not found');
    }

    // Fetch converter
    const converter = await this.prisma.allData.findUnique({
      where: { id: converterId },
    });

    if (!converter) {
      throw new NotFoundException('Converter not found');
    }

    // Calculate price
    let unitPrice = 0;
    try {
      const settings = await this.prisma.settingUser.findFirst({ where: { userId } });
      const pricing = await this.pricingService.calculatePrice(converter, settings?.discount || 0);
      unitPrice = pricing.finalPrice;
    } catch {
      // If pricing fails, use 0
    }

    const totalPrice = unitPrice * quantity;

    const item = await this.prisma.priceListItem.create({
      data: {
        priceListId,
        converterId,
        quantity,
        unitPrice,
        totalPrice,
      },
    });

    return {
      id: item.id,
      converterId: item.converterId,
      converterName: converter.name,
      converterBrand: converter.brand,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      createdAt: item.createdAt.toISOString(),
    };
  }

  async removeItem(priceListId: number, itemId: number, userId: bigint) {
    // Verify list belongs to user
    const list = await this.prisma.priceList.findFirst({
      where: { id: priceListId, userId },
    });

    if (!list) {
      throw new NotFoundException('Price list not found');
    }

    const item = await this.prisma.priceListItem.findFirst({
      where: { id: itemId, priceListId },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    await this.prisma.priceListItem.delete({ where: { id: itemId } });
    return { success: true };
  }

  async exportAsText(priceListId: number, userId: bigint) {
    const list = await this.getById(priceListId, userId);

    // Generate a simple text-based export (PDF would require a library like pdfkit)
    const lines: string[] = [
      '='.repeat(60),
      `CATALYSER PRICE LIST: ${list.name}`,
      '='.repeat(60),
      `Date: ${new Date().toISOString().split('T')[0]}`,
      `Items: ${list.items.length}`,
      '',
      '-'.repeat(60),
      'Name'.padEnd(30) + 'Brand'.padEnd(15) + 'Qty'.padEnd(5) + 'Unit $'.padEnd(12) + 'Total $',
      '-'.repeat(60),
    ];

    for (const item of list.items) {
      const name = (item.converterName || '').slice(0, 28).padEnd(30);
      const brand = (item.converterBrand || '').slice(0, 13).padEnd(15);
      const qty = String(item.quantity).padEnd(5);
      const unit = (item.unitPrice || 0).toFixed(2).padStart(10).padEnd(12);
      const total = (item.totalPrice || 0).toFixed(2).padStart(10);
      lines.push(`${name}${brand}${qty}${unit}${total}`);
    }

    lines.push('-'.repeat(60));
    lines.push('TOTAL'.padEnd(50) + ' ' + list.total.toFixed(2).padStart(10));
    lines.push('='.repeat(60));
    lines.push('Generated by Catalyser Platform');

    return lines.join('\n');
  }
}
