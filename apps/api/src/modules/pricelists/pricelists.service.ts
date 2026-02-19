import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
const PDFDocument = require('pdfkit');

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
    // Enforce single price list per user
    const existingCount = await this.prisma.priceList.count({ where: { userId } });
    if (existingCount >= 1) {
      throw new BadRequestException('You can only have one price list. Please use your existing list.');
    }

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

    // Check if converter already exists in this list — increment quantity if so
    const existing = await this.prisma.priceListItem.findFirst({
      where: { priceListId, converterId },
    });

    if (existing) {
      const newQty = existing.quantity + quantity;
      const newTotal = unitPrice * newQty;
      const updated = await this.prisma.priceListItem.update({
        where: { id: existing.id },
        data: { quantity: newQty, unitPrice, totalPrice: newTotal },
      });
      return {
        id: updated.id,
        converterId: updated.converterId,
        converterName: converter.name,
        converterBrand: converter.brand,
        quantity: updated.quantity,
        unitPrice: updated.unitPrice,
        totalPrice: updated.totalPrice,
        createdAt: updated.createdAt.toISOString(),
      };
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

  async updateItemQuantity(priceListId: number, itemId: number, userId: bigint, quantity: number) {
    if (quantity < 1) {
      throw new BadRequestException('Quantity must be at least 1');
    }

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

    const totalPrice = (item.unitPrice || 0) * quantity;
    const updated = await this.prisma.priceListItem.update({
      where: { id: itemId },
      data: { quantity, totalPrice },
    });

    return {
      id: updated.id,
      quantity: updated.quantity,
      totalPrice: updated.totalPrice,
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

  async exportAsPdf(priceListId: number, userId: bigint): Promise<Buffer> {
    const list = await this.getById(priceListId, userId);

    // Fetch site settings for branding
    let siteName = 'Catalyser';
    let siteDescription = 'Professional Catalytic Converter Pricing Platform';
    let contactEmail = '';
    let contactPhone = '';
    let contactAddress = '';
    try {
      const settings = await this.prisma.siteSetting.findMany();
      for (const s of settings) {
        if (s.key === 'site_name') siteName = s.value;
        if (s.key === 'site_description') siteDescription = s.value;
        if (s.key === 'contact_email') contactEmail = s.value;
        if (s.key === 'contact_phone') contactPhone = s.value;
        if (s.key === 'contact_address') contactAddress = s.value;
      }
    } catch {
      // fallback to defaults
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 100; // margins
      const green = '#00e88f';
      const dark = '#0a0a1a';
      const gray = '#6b7280';

      // --- Header with branding ---
      doc.rect(0, 0, doc.page.width, 100).fill(dark);
      doc.fontSize(24).fillColor(green).text(siteName, 50, 30);
      doc.fontSize(10).fillColor('#ffffff').text(siteDescription, 50, 60);

      // Date
      const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      doc.fontSize(9).fillColor('#aaaaaa').text(dateStr, 50, 80);

      doc.moveDown(3);

      // --- Price List Title ---
      doc.fontSize(18).fillColor('#333333').text(list.name, 50, 120);
      doc.fontSize(10).fillColor(gray).text(`${list.items.length} items`, 50, 145);

      // --- Divider ---
      doc.moveTo(50, 165).lineTo(50 + pageWidth, 165).strokeColor(green).lineWidth(2).stroke();

      // --- Table Header ---
      let y = 180;
      const colWidths = [200, 80, 50, 80, 80]; // name, brand, qty, unit, total
      const headers = ['Converter', 'Brand', 'Qty', 'Unit Price', 'Total'];

      doc.rect(50, y, pageWidth, 25).fill('#f3f4f6');
      doc.fontSize(9).fillColor('#374151');
      let x = 55;
      for (let i = 0; i < headers.length; i++) {
        doc.text(headers[i], x, y + 8, { width: colWidths[i], align: i >= 3 ? 'right' : 'left' });
        x += colWidths[i];
      }
      y += 30;

      // --- Table Rows ---
      doc.fontSize(9).fillColor('#1f2937');
      for (let idx = 0; idx < list.items.length; idx++) {
        if (y > 720) {
          doc.addPage();
          y = 50;
        }
        const item = list.items[idx];
        const rowBg = idx % 2 === 0 ? '#ffffff' : '#fafafa';
        doc.rect(50, y - 3, pageWidth, 22).fill(rowBg);

        x = 55;
        doc.fillColor('#1f2937');
        doc.text((item.converterName || '').slice(0, 35), x, y + 3, { width: colWidths[0] });
        x += colWidths[0];
        doc.fillColor(gray);
        doc.text((item.converterBrand || '').slice(0, 15), x, y + 3, { width: colWidths[1] });
        x += colWidths[1];
        doc.fillColor('#1f2937');
        doc.text(String(item.quantity), x, y + 3, { width: colWidths[2], align: 'center' });
        x += colWidths[2];
        doc.text(`$${(item.unitPrice || 0).toFixed(2)}`, x, y + 3, { width: colWidths[3], align: 'right' });
        x += colWidths[3];
        doc.fillColor('#111827').font('Helvetica-Bold');
        doc.text(`$${(item.totalPrice || 0).toFixed(2)}`, x, y + 3, { width: colWidths[4], align: 'right' });
        doc.font('Helvetica');

        y += 22;
      }

      // --- Total Row ---
      y += 5;
      doc.moveTo(50, y).lineTo(50 + pageWidth, y).strokeColor('#d1d5db').lineWidth(1).stroke();
      y += 10;
      doc.fontSize(12).fillColor('#111827').font('Helvetica-Bold');
      doc.text('Total:', 55, y, { width: pageWidth - 95 });
      doc.fillColor(green);
      doc.text(`$${list.total.toFixed(2)}`, 55, y, { width: pageWidth - 10, align: 'right' });
      doc.font('Helvetica');

      // --- Footer ---
      y += 40;
      doc.moveTo(50, y).lineTo(50 + pageWidth, y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
      y += 15;
      doc.fontSize(8).fillColor(gray);
      doc.text(`Generated by ${siteName} — ${siteDescription}`, 50, y);
      if (contactEmail) doc.text(`Contact: ${contactEmail}`, 50, y + 12);
      if (contactPhone) doc.text(`Phone: ${contactPhone}`, 50, y + 24);
      if (contactAddress) doc.text(`Address: ${contactAddress}`, 50, y + 36);
      doc.text('Prices are estimates based on current market rates and may vary.', 50, y + 52);
      doc.text(`Export date: ${dateStr}`, 50, y + 64);

      doc.end();
    });
  }
}
