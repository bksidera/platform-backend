import {
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { ResponseService } from 'src/response/response.service';
import {
  S3Client,
  PutObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  CreateMultipartUploadCommandOutput
} from '@aws-sdk/client-s3';
import { Response } from "express";
import { CommonService } from "src/common/common.service";
import * as crypto from 'crypto'
import { InitiateUploadDto } from './Dto/InitiateUploadDto';
import { UploadChunkDto } from './Dto/UploadChunkDto';
import { CompleteUploadDto } from './Dto/CompleteUploadDto';

@Injectable()
export class FileUploadService {
  private s3Client: S3Client;
  private s3ClientForImages: S3Client;
  private bucketName: string;
  private bucketNameForImage:string;
  constructor(
    private readonly configService: ConfigService,
    private readonly responseService: ResponseService,
    private readonly commonService: CommonService,
  ) {
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKETNAME');
    this.bucketNameForImage = this.configService.get<string>('AWS_S3_BUCKETNAMEFORIMAGES');

    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESSKEYID'),
        secretAccessKey: this.configService.get<string>('AWS_SECRETACCESSKEY'),
      },
      useAccelerateEndpoint: true,
    });
    this.s3ClientForImages = new S3Client({
      region: this.configService.get<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESSKEYID'),
        secretAccessKey: this.configService.get<string>('AWS_SECRETACCESSKEY'),
      },
      // useAccelerateEndpoint: true,
    });
  }


  
  async uploadsmallcontent(
    res: Response,
    file: Express.Multer.File,
  ) {
    try {

      if (!file) {
        return await this.responseService.NOT_FOUND('File Not Found', {}, res);
      }

      const fileExtension: { extension: string; type: string } = await this.commonService.getExtensionFromAllMimeType(file.mimetype);

      if (!fileExtension.extension || fileExtension.extension === "unknown")
        return await this.responseService.FORBIDDED(`This file type is not allowed`, res);

      const randomSuffix = crypto.randomBytes(8).toString('hex');

      const fileName = `images/${randomSuffix}${uuidv4()}.${fileExtension.extension}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketNameForImage,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype
      });

      const response = await this.s3ClientForImages.send(command);

      if (response.$metadata.httpStatusCode !== 200)
        return await this.responseService.INTERNAL_SERVER_ERROR("Error In Uploading File", {}, res);

      const fileurl = `${this.configService.get<string>('AWS_CLOUDFRONT_URL')}/${fileName}`;

      return await this.responseService.success(
        'success',
        `Completed ${fileExtension.type} uploaded successfully`,
        { url: fileurl },
        res,
      );
    } catch (error) {
      console.info(error);
      return await this.responseService.INTERNAL_SERVER_ERROR("Error in uploading file", error.toString(), res);
    }
  }


  /**
  * Initiate Multipart Upload
  */
  async initiateMultipartUpload(
    res: Response,
    dto: InitiateUploadDto,
  ): Promise<any> {
    try {

      const fileExtension = await this.commonService.getExtensionFromMimeType(dto.fileType);

      if (fileExtension === "unknown")
        return await this.responseService.FORBIDDED(`This file type is not allowed`, res);

      const randomSuffix = crypto.randomBytes(8).toString('hex');

      const fileName = `${randomSuffix}${uuidv4()}.${fileExtension}`;

      const command = new CreateMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: fileName,
        ContentType: dto.fileType,
      });

      const uploadId = await this.s3Client.send(command);
      console.info("log 115");
      console.log('uploadId', uploadId);
      return await this.responseService.success(
        'success',
        'Multipart upload initiated successfully',
        { uploadId: uploadId.UploadId, fileName: fileName },
        res,
      );

    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR("Error initiating multipart upload", error.toString(), res);
    }
  }


  /**
   * Upload a single part
   */
  async uploadPart(
    res: Response,
    dto: UploadChunkDto,
    file: Express.Multer.File,
  ): Promise<any> {
    try {

      const command = new UploadPartCommand({
        Bucket: this.bucketName,
        Key: dto.fileName, // Use uploadId as part of the key
        PartNumber: dto.partNumber,
        UploadId: dto.uploadId,
        Body: file.buffer,
      });

      const response = await this.s3Client.send(command);

      return this.responseService.success(
        "success",
        `Part ${dto.partNumber} Uploaded Successfully`,
        {
          partNumber: dto.partNumber,
          etag: response.ETag
        },
        res
      );

    } catch (error) {
      return await this.responseService.INTERNAL_SERVER_ERROR("Error initiating multipart upload", error.toString(), res);
    }
  }


  /**
   * Complete Multipart Upload
   */
  async completeMultipartUpload(
    res: Response,
    dto: CompleteUploadDto
  ): Promise<any> {
    try {
      const command = new CompleteMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: dto.fileName,
        UploadId: dto.uploadId,
        MultipartUpload: {
          Parts: dto.parts.map(part => ({
            PartNumber: part.partNumber,
            ETag: part.etag
          }))
        }
      });

      const response = await this.s3Client.send(command);
      // "url": "https://rafterdevbet.s3-accelerate.amazonaws.com/534534416a345345587691f7-3129-4e40-af6c-a5768ab74355.mov"

      return this.responseService.success("success", "Completed Video Upload Successfully", {
        url: `${ await this.configService.get<string>('AWS_CLOUDFRONT_URL')}/${ await this.commonService.extractFilename(response.Location)}`
      },
        res);
    } catch (error) {
      // Optionally, abort the upload if completion fails
      await this.abortMultipartUpload(dto.uploadId, dto.fileName);
      return await this.responseService.INTERNAL_SERVER_ERROR("Error initiating multipart upload", error.toString(), res);
    }
  }

  // async completeMultipartUpload(
  //   res: Response,
  //   dto: CompleteUploadDto
  // ): Promise<any> {
  //   try {
  //     // Validate parts
  //     dto.parts.forEach(part => {
  //       if (!Number.isInteger(part.partNumber) || part.partNumber <= 0) {
  //         throw new Error(`Invalid part number: ${part.partNumber}`);
  //       }
  //       if (!part.etag || typeof part.etag !== 'string') {
  //         throw new Error(`Invalid ETag for part ${part.partNumber}: ${part.etag}`);
  //       }
  //     });
  
  //     const command = new CompleteMultipartUploadCommand({
  //       Bucket: this.bucketName,
  //       Key: dto.fileName,
  //       UploadId: dto.uploadId,
  //       MultipartUpload: {
  //         Parts: dto.parts.map(part => ({
  //           PartNumber: part.partNumber,
  //           ETag: part.etag.replace(/"/g, '') // Ensure ETag is clean
  //         }))
  //       }
  //     });
  
  //     // Send the command to complete the multipart upload
  //     const response = await this.s3Client.send(command);
  // console.info(`${this.configService.get<string>(
  //           'AWS_CLOUDFRONT_URL'
  //         )}/${await  this.commonService.extractFilename(response.Location)}`);

  //     return this.responseService.success(
  //       'Success',
  //       'Completed Video Upload Successfully',
  //       {
  //         url: `${this.configService.get<string>(
  //           'AWS_CLOUDFRONT_URL'
  //         )}/${await this.commonService.extractFilename(response.Location)}`
  //       },
  //       res
  //     );
  //   } catch (error) {
  //     console.error('Error completing multipart upload:', error);
  
  //     // Optionally abort the upload if completion fails
  //     await this.abortMultipartUpload(dto.uploadId, dto.fileName);
  
  //     return await this.responseService.INTERNAL_SERVER_ERROR(
  //       'Error completing multipart upload',
  //       error.toString(),
  //       res
  //     );
  //   }
  // }
  
  

  /**
  * Abort Multipart Upload
  */
  async abortMultipartUpload(
    uploadId: string,
    fileName: string
  ): Promise<void> {
    try {
      const command = new AbortMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: fileName,
        UploadId: uploadId
      });

      const response = await this.s3Client.send(command);
      console.log("response", response);
    } catch (error) {
      console.error(`Failed to abort multipart upload: ${error.toString()}`);
    }
  }

}






// import {
//   BadRequestException,
//   HttpException,
//   HttpStatus,
//   Injectable,
// } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// // import { v2 as cloudinary } from 'cloudinary';
// import { v4 as uuidv4 } from 'uuid';
// // import {
// //   UploadApiOptions,
// //   UploadApiResponse,
// //   UploadApiErrorResponse,
// // } from 'cloudinary';
// import { ResponseService } from 'src/response/response.service';
// import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// @Injectable()
// export class FileUploadService {
//   constructor(
//     private readonly configService: ConfigService,
//     private readonly responseService: ResponseService,
//   ) {
//     // cloudinary.config({
//     //   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//     //   api_key: process.env.CLOUDINARY_API_KEY,
//     //   api_secret: process.env.CLOUDINARY_API_SECRET,
//     // });
//   }

//   private readonly allowedImageExtensions = [
//     'image/jpeg',
//     'image/jpg',
//     'image/png',
//   ];
//   private async uploadToS3(
//     buffer: Buffer,
//     key: string,
//     contentType: string,
//   ): Promise<string> {
//     const command = new PutObjectCommand({
//       Bucket: this.configService.get<string>('AWS_S3_BUCKETNAME'),
//       Key: key,
//       Body: buffer,
//       ContentType: contentType,
//     });
//     try {
//       await this.s3.send(command);
//       return `https://${this.configService.get<string>('AWS_S3_BUCKETNAME')}.s3.amazonaws.com/${key}`;
//     } catch (error) {
//       throw new HttpException(
//         {
//           status: HttpStatus.OK,
//           message: 'Filled to file upload',
//           data: {},
//         },
//         HttpStatus.OK,
//       );
//     }
//   }

//   private readonly s3 = new S3Client({
//     region: this.configService.get<string>('AWS_REGION'),
//     credentials: {
//       accessKeyId: this.configService.get<string>('AWS_ACCESSKEYID'),
//       secretAccessKey: this.configService.get<string>('AWS_SECRETACCESSKEY'),
//     },
//   });

//   async uploadFileAWS1(file: Express.Multer.File,  res) {
//     try {
//       if (!file?.originalname) {
//         return await this.responseService.NOT_FOUND('file not found', {}, res);
//       }
//       const fileName = file.originalname;
//       // const imageType = ['image/jpeg', 'image/jpg', 'image/png'];

//       const videoType = [
//         'image/jpeg',
//         'image/jpg',
//         'image/png',
//         'video/mp4',
//         'video/mpeg',
//         'video/quicktime',
//         'video/webm',
//         'video/x-matroska',
//         'video/x-msvideo',
//         'video/x-ms-wmv',
//         'video/ogg',
//         'video/x-flv',
//         'video/3gpp',
//         'video/3gpp2',
//         'video/MP2T',
//         'video/vnd.rn-realvideo',
//         'video/x-ms-asf',
//         'image/gif',
//         'image/webp',
//       ];

//       // if (!file) {
//       //   return await this.responseService.NOT_FOUND('Image not found', {}, res);
//       // }
//       // if (!videoType.includes(file.mimetype)) {
//       //   return await this.responseService.NOT_FOUND(
//       //     `Image type is not valid,should valid type is  ${videoType}`,
//       //     {},
//       //     res,
//       //   );
//       // }

//       function generateDefaultUUID(): string {
//         return uuidv4();
//       }
//       const newItemId = generateDefaultUUID();
//       // console.info(newItemId);
//       const defaultFileName = "uploadFile"; // Define your static file name
//       // Get the file extension from the MIME type
//       const extension = file.mimetype.split('/')[1]; // Extract the extension (e.g., 'jpeg', 'mp4', etc.)
//       // console.info(extension);
//       // Construct the key using the static name, UUID, and dynamic extension
//       const key = `${defaultFileName}_${newItemId}.${extension}`; 
//       // const key = `${newItemId}_${fil}`;
//       // console.info(fileName.toLowerCase());
//       const imageUrl = await this.uploadToS3(file.buffer, key, file.mimetype);

//       return await this.responseService.success(
//         'success',
//         'file uploaded successfully',
//         { url: imageUrl },
//         res,
//       );
//     } catch (error) {
//       throw new HttpException(error.toString(), HttpStatus.NOT_FOUND);
//     }
//   }

//   async uploadFileAWS(file: Express.Multer.File, res) {
//     try {
//         if (!file?.originalname) {
//             return await this.responseService.NOT_FOUND('file not found', {}, res);
//         }

//       //   const allowedTypes = [
//       //     'image/jpeg',
//       //     'image/jpg',
//       //     'image/png',
//       //     'video/mp4',
//       //     'video/mpeg',
//       //     'video/quicktime',
//       //     'video/webm',
//       //     'video/x-matroska',
//       //     'video/x-msvideo',
//       //     'video/x-ms-wmv',
//       //     'video/ogg',
//       //     'video/x-flv',
//       //     'video/3gpp',
//       //     'video/3gpp2',
//       //     'video/MP2T',
//       //     'video/vnd.rn-realvideo',
//       //     'video/x-ms-asf',
//       //     'image/gif',
//       //     'image/webp',
//       //     'image/tiff',
//       //     'image/svg+xml',
//       //     'image/bmp',
//       //     'image/heif',
//       //     'image/heic',
//       //     'video/avi',
//       //     'video/x-m4v',
//       //     'video/h265',
//       //     // Add more allowed types here
//       // ];

//       //  const allowedTypes = [
//       //   'image/jpeg',
//       //   'image/jpg',
//       //   'image/png',
//       //   'image/gif',    // Only first frame, no animation
//       //   'image/webp',
//       //   'image/bmp',
//       //   'image/svg+xml', // Requires rasterization
//       //   'video/mp4',
//       //   'video/ogg',
//       //   'video/mpeg'
//       // ];

//       const allowedTypes = [
//         'image/jpeg',
//         'image/jpg',
//         'image/png',
//         'image/gif',    // Only first frame, no animation
//         'image/webp',
//         'image/bmp',
//         'image/svg+xml', // Requires rasterization
//         'video/mp4',
//         'video/ogg',
//         'video/mpeg',
//         'image/heic',
//         'image/heif',
//         //--------------
      
//         'video/quicktime',
//         'video/webm',
//         'video/x-matroska',
//         'video/x-msvideo',
//         'video/x-ms-wmv',
//         'video/ogg',
//         'video/x-flv',
//         'video/3gpp',
//         'video/3gpp2',
//         'video/MP2T',
//         'video/vnd.rn-realvideo',
//         'video/x-ms-asf',
//         'image/webp',
//         'video/x-m4v' 
//       ];
      
      

//         if (!allowedTypes.includes(file.mimetype)) {
//             return await this.responseService.NOT_FOUND(
//                 `Invalid file type. Allowed types are: ${allowedTypes.join(', ')}`,
//                 {},
//                 res,
//             );
//         }

//         function generateDefaultUUID(): string {
//             return uuidv4();
//         }
        
//         const newItemId = generateDefaultUUID();
//         const defaultFileName = "uploadFile"; // Define your static file name
//         const extension = file.mimetype.split('/')[1] || 'unknown'; // Extract the extension
//         if (extension === 'unknown') {
//           return await this.responseService.NOT_FOUND(
//             'Unable to determine file type',
//             {},
//             res,
//           );
//         }
//         const key = `${defaultFileName}_${newItemId}.${extension}`; // Construct the key
//         const imageUrl = await this.uploadToS3(file.buffer, key, file.mimetype);

//         return await this.responseService.success(
//             'success',
//             'file uploaded successfully',
//             { url: imageUrl },
//             res,
//         );
//     } catch (error) {
//         console.error('Error uploading file to S3:', error); // Log error
//         throw new HttpException(error.toString(), HttpStatus.NOT_FOUND);
//     }
// }



//   async uploadVideo(
//     file: Express.Multer.File,
//     userId: any,
//     fileName: string,
//     res,
//   ) {
//     try {
//       const videoType = [
//         'video/mp4',
//         'video/mpeg',
//         'video/quicktime',
//         'video/webm',
//         'video/x-matroska',
//         'video/x-msvideo',
//         'video/x-ms-wmv',
//         'video/ogg',
//         'video/x-flv',
//         'video/3gpp',
//         'video/3gpp2',
//         'video/MP2T',
//         'video/vnd.rn-realvideo',
//         'video/x-ms-asf',
//         'image/gif',
//         'image/webp',
//       ];
//       // Add more supported video types if needed

//       if (!file) {
//         return await this.responseService.NOT_FOUND('video not found', {}, res);
//       }

//       if (!videoType.includes(file.mimetype)) {
//         return await this.responseService.NOT_FOUND(
//           `Video type must be: ${videoType} `,
//           {},
//           res,
//         );
//       }

//       const timestamp = Date.now();
//       const key = `${userId}_${fileName.toLowerCase()}_${timestamp}`;
//       const videoUrl = await this.uploadToS3(file.buffer, key, file.mimetype);
//       return await this.responseService.success(
//         'success',
//         'video uploaded successfully',
//         { url: videoUrl },
//         res,
//       );
//     } catch (error) {
//       throw new HttpException(
//         error.toString(),
//         HttpStatus.INTERNAL_SERVER_ERROR,
//       );
//     }
//   }

//   // async uploadFile(
//   //   file: Express.Multer.File,
//   //   res,
//   //   options?: UploadApiOptions,
//   // ): Promise<UploadApiResponse | UploadApiErrorResponse> {
//   //   return new Promise((resolve, reject) => {
//   //     cloudinary.uploader
//   //       .upload_stream(options, (error, result) => {
//   //         if (error) {
//   //           return this.responseService.NOT_FOUND(
//   //             `file not uploaded error: ${error.toString()}`,
//   //             {},
//   //             res,
//   //           );
//   //           reject(error);
//   //         } else {
//   //           return this.responseService.success(
//   //             'success',
//   //             'file uploaded successfully',
//   //             { url: result.secure_url },
//   //             res,
//   //           );
//   //           resolve(result);
//   //         }
//   //       })
//   //       .end(file.buffer);
//   //   });
//   // }
// }
