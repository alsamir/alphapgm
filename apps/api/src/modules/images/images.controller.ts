import { Controller, Get, Post, Param, ParseIntPipe, Res, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImagesService } from './images.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Images')
@Controller('images')
export class ImagesController {
  constructor(private imagesService: ImagesService) {}

  @Get(':converterId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getImage(
    @Param('converterId', ParseIntPipe) converterId: number,
    @CurrentUser('email') email: string,
    @Res() res: Response,
  ) {
    const result = await this.imagesService.getConverterImage(converterId, email);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Image not found' });
    }
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(result.buffer);
  }

  @Post('upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROLE_ADMIN')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    const url = await this.imagesService.uploadImage(file.buffer, file.originalname);
    return { success: true, data: { url } };
  }
}
