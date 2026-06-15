import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { Response } from 'express';
import * as crypto from 'crypto';
import { CommonService } from 'src/common/common.service';
import { ResponseService } from 'src/response/response.service';

@Injectable()
export class FileUploadService {
  private readonly s3ClientForImages: S3Client;
  private readonly bucketNameForImage: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly responseService: ResponseService,
    private readonly commonService: CommonService,
  ) {
    this.bucketNameForImage = this.configService.get<string>('AWS_S3_BUCKETNAMEFORIMAGES');
    this.s3ClientForImages = new S3Client({
      region: this.configService.get<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESSKEYID'),
        secretAccessKey: this.configService.get<string>('AWS_SECRETACCESSKEY'),
      },
    });
  }

  async uploadsmallcontent(res: Response, file: Express.Multer.File) {
    try {
      if (!file) {
        return await this.responseService.NOT_FOUND('File Not Found', {}, res);
      }

      const fileExtension = await this.commonService.getExtensionFromAllMimeType(file.mimetype);

      if (!fileExtension.extension || fileExtension.extension === 'unknown') {
        return await this.responseService.FORBIDDED('This file type is not allowed', res);
      }

      const randomSuffix = crypto.randomBytes(8).toString('hex');
      const fileName = `images/${randomSuffix}${uuidv4()}.${fileExtension.extension}`;
      const command = new PutObjectCommand({
        Bucket: this.bucketNameForImage,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      const response = await this.s3ClientForImages.send(command);

      if (response.$metadata.httpStatusCode !== 200) {
        return await this.responseService.INTERNAL_SERVER_ERROR('Error In Uploading File', {}, res);
      }

      const fileurl = `${this.configService.get<string>('AWS_CLOUDFRONT_URL')}/${fileName}`;

      return await this.responseService.success(
        'success',
        `Completed ${fileExtension.type} uploaded successfully`,
        { url: fileurl },
        res,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown upload error';
      return await this.responseService.INTERNAL_SERVER_ERROR('Error in uploading file', { message }, res);
    }
  }
}
