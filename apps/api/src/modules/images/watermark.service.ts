import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';

@Injectable()
export class WatermarkService {
  private readonly logger = new Logger(WatermarkService.name);

  async applyWatermark(imageBuffer: Buffer, userEmail: string): Promise<Buffer> {
    try {
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      const width = metadata.width || 800;
      const height = metadata.height || 600;

      const fontSize = Math.max(12, Math.floor(width / 30));
      const svgText = `
        <svg width="${width}" height="${height}">
          <style>
            .watermark {
              fill: rgba(255, 255, 255, 0.3);
              font-size: ${fontSize}px;
              font-family: Arial, sans-serif;
              font-weight: bold;
            }
          </style>
          <text x="50%" y="30%" text-anchor="middle" class="watermark" transform="rotate(-30, ${width / 2}, ${height / 2})">${userEmail}</text>
          <text x="50%" y="50%" text-anchor="middle" class="watermark" transform="rotate(-30, ${width / 2}, ${height / 2})">CATALYSER</text>
          <text x="50%" y="70%" text-anchor="middle" class="watermark" transform="rotate(-30, ${width / 2}, ${height / 2})">${userEmail}</text>
        </svg>
      `;

      return image
        .composite([{
          input: Buffer.from(svgText),
          gravity: 'center',
        }])
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch (err) {
      this.logger.warn(`Watermark failed, returning original: ${err}`);
      return imageBuffer;
    }
  }
}
