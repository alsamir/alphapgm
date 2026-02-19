import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaService } from '../../prisma/prisma.service';
import { WatermarkService } from './watermark.service';
import { RedisService } from '../../common/redis/redis.service';
import { Readable } from 'stream';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp');

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);
  private s3Client: S3Client | null = null;
  private bucket: string;
  private cdnUrl: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private watermarkService: WatermarkService,
    private redis: RedisService,
  ) {
    const key = this.configService.get('DO_SPACES_KEY');
    const secret = this.configService.get('DO_SPACES_SECRET');
    const endpoint = this.configService.get('DO_SPACES_ENDPOINT');
    this.bucket = this.configService.get('DO_SPACES_BUCKET', 'catalyser-images');
    this.cdnUrl = this.configService.get('DO_SPACES_CDN_URL', '');

    if (key && secret && endpoint && key !== 'your-spaces-key' && key !== 'placeholder') {
      this.s3Client = new S3Client({
        endpoint,
        region: 'us-east-1',
        credentials: { accessKeyId: key, secretAccessKey: secret },
        forcePathStyle: false,
      });
    }
  }

  async getConverterImage(converterId: number, userEmail?: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    const converter = await this.prisma.allData.findUnique({ where: { id: converterId } });
    if (!converter || !converter.imageUrl) {
      throw new NotFoundException('Image not found');
    }

    // Check cache for watermarked version
    if (userEmail) {
      const cacheKey = `img:${converterId}:${Buffer.from(userEmail).toString('base64').slice(0, 20)}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return { buffer: Buffer.from(cached, 'base64'), contentType: 'image/jpeg' };
      }
    }

    let imageBuffer: Buffer;

    if (this.s3Client) {
      try {
        const imagePath = converter.imageUrl.startsWith('/') ? converter.imageUrl.slice(1) : converter.imageUrl;
        const command = new GetObjectCommand({ Bucket: this.bucket, Key: imagePath });
        const response = await this.s3Client.send(command);
        const stream = response.Body as Readable;
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
          chunks.push(Buffer.from(chunk));
        }
        imageBuffer = Buffer.concat(chunks);
      } catch (err) {
        this.logger.warn(`Failed to fetch image from S3: ${err}`);
        imageBuffer = await this.generatePlaceholderImage(converter.name, converter.brand);
      }
    } else {
      // S3 not configured - generate a placeholder image with converter info
      imageBuffer = await this.generatePlaceholderImage(converter.name, converter.brand);
    }

    // Apply watermark if user is authenticated
    if (userEmail) {
      imageBuffer = await this.watermarkService.applyWatermark(imageBuffer, userEmail);
      const cacheKey = `img:${converterId}:${Buffer.from(userEmail).toString('base64').slice(0, 20)}`;
      await this.redis.set(cacheKey, imageBuffer.toString('base64'), 3600); // Cache 1 hour
    }

    return { buffer: imageBuffer, contentType: 'image/jpeg' };
  }

  private async generatePlaceholderImage(name: string, brand: string): Promise<Buffer> {
    // sharp imported at top level
    const width = 600;
    const height = 450;
    const escapedName = name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const escapedBrand = brand.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // Truncate long names
    const displayName = escapedName.length > 30 ? escapedName.slice(0, 27) + '...' : escapedName;

    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#1a1a2e"/>
        <rect x="20" y="20" width="${width - 40}" height="${height - 40}" rx="12" fill="#16213e" stroke="#0f3460" stroke-width="2"/>
        <text x="50%" y="40%" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="#e94560" font-weight="bold">${escapedBrand}</text>
        <text x="50%" y="55%" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#eee">${displayName}</text>
        <text x="50%" y="75%" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#888">CATALYSER</text>
      </svg>
    `;

    return sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer();
  }

  async uploadImage(file: Buffer, filename: string): Promise<string> {
    if (!this.s3Client) throw new Error('Image storage not configured');

    const key = `converters/${Date.now()}-${filename}`;
    await this.s3Client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file,
      ACL: 'public-read',
      ContentType: 'image/jpeg',
    }));

    return `${this.cdnUrl}/${key}`;
  }
}
