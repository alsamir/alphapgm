import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaService } from '../../prisma/prisma.service';
import { WatermarkService } from './watermark.service';
import { RedisService } from '../../common/redis/redis.service';
import { Readable } from 'stream';

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

    if (key && secret && endpoint && key !== 'your-spaces-key') {
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
        throw new NotFoundException('Image not available');
      }
    } else {
      throw new NotFoundException('Image storage not configured');
    }

    // Apply watermark if user is authenticated
    if (userEmail) {
      imageBuffer = await this.watermarkService.applyWatermark(imageBuffer, userEmail);
      const cacheKey = `img:${converterId}:${Buffer.from(userEmail).toString('base64').slice(0, 20)}`;
      await this.redis.set(cacheKey, imageBuffer.toString('base64'), 3600); // Cache 1 hour
    }

    return { buffer: imageBuffer, contentType: 'image/jpeg' };
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
