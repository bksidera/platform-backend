import { BadRequestException, Controller, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FileUploadService } from './file-upload.service';

@Controller('file-upload')
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @Post('uploadsmallcontent')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 3 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      if (!file.mimetype.startsWith('image/')) {
        callback(new BadRequestException('Only image uploads are allowed'), false);
        return;
      }
      callback(null, true);
    },
  }))
  async uploadsmallcontent(@Res() res: Response, @UploadedFile() file: Express.Multer.File) {
    return await this.fileUploadService.uploadsmallcontent(res, file);
  }
}
