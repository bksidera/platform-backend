import { Controller, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FileUploadService } from './file-upload.service';

@Controller('file-upload')
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @Post('uploadsmallcontent')
  @UseInterceptors(FileInterceptor('file'))
  async uploadsmallcontent(@Res() res: Response, @UploadedFile() file: Express.Multer.File) {
    return await this.fileUploadService.uploadsmallcontent(res, file);
  }
}
