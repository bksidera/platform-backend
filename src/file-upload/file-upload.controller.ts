// file-upload.controller.ts
import { Controller, Inject, Post, Res, UploadedFile, UseGuards, UseInterceptors, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from './file-upload.service';
import { JwtAuthGuard } from 'src/guards/guards.service';
import { REQUEST } from '@nestjs/core';
import { Response } from "express";
import { InitiateUploadDto } from './Dto/InitiateUploadDto';
import { UploadChunkDto } from './Dto/UploadChunkDto';
import { CompleteUploadDto } from './Dto/CompleteUploadDto';

@Controller('file-upload')
export class FileUploadController {
  constructor(
    private readonly fileUploadService: FileUploadService,
    @Inject(REQUEST) private readonly request: Request,
  ) { }


  // need to use the another s3 bucket and 
  @Post('uploadsmallcontent')
  // @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadsmallcontent(@Res() res: Response, @UploadedFile() file: Express.Multer.File) {
    // const aUser: RequestUserDto = this.request['user'];
    return await this.fileUploadService.uploadsmallcontent(res, file);
  }

  /**
   * First API: Initiate Multipart Upload
   */
  @Post('initiateupload')
  // @UseGuards(JwtAuthGuard)
  async initiateMultipartUpload(@Res() res: Response, @Body() dto: InitiateUploadDto) {
    // const aUser:RequestUserDto = this.request['user'];
    return await this.fileUploadService.initiateMultipartUpload(res, dto);
  }

  
  /**
 * Second API: Upload Chunk
 */
  @Post('uploadchunk')
  // @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('filechunk'))
  async uploadChunk(
    @Res() res: Response,
    @Body() dto: UploadChunkDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // const aUser:RequestUserDto = this.request['user'];
    return await this.fileUploadService.uploadPart(res, dto, file);
  }

  /**
* Third API: Complete Multipart Upload
*/
  @Post('completeupload')
  // @UseGuards(JwtAuthGuard)
  async completeUpload(
    @Res() res: Response,
    @Body() dto: CompleteUploadDto
  ) {
    // const aUser:RequestUserDto = this.request['user'];
    return await this.fileUploadService.completeMultipartUpload(res, dto);
  }

}
/**
 
save to database along with the other data
category 
need to save cat sport, user perfective

create bet->
trash talk-> normal video data with meta data

need to save the sepereate table



 
 */























// // file-upload.controller.ts
// import { Body, Controller, Inject, Post, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
// import { FileInterceptor } from '@nestjs/platform-express';
// // import { CloudinaryService } from 'nestjs-cloudinary';
// // import { v2 as cloudinary } from 'cloudinary';
// // import { UploadApiOptions, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
// import { FileUploadService } from './file-upload.service';
// import { JwtAuthGuard } from 'src/guards/guards.service';
// import { REQUEST } from '@nestjs/core';
// import { RequestUserDto } from 'src/auth/Dto/RequestUserDto';
// import { ResponseService } from 'src/response/response.service';
// import { CompleteUploadDto } from './Dto/CompleteUploadDto';
// import { UploadChunkDto } from './Dto/UploadChunkDto';
// import { InitiateUploadDto } from './Dto/InitiateUploadDto';


// @Controller('file-upload')
// export class FileUploadController {
    
//     constructor(//private readonly cloudinaryService: CloudinaryService,
//         private readonly fileUploadService:FileUploadService,
//         @Inject(REQUEST) private readonly request: Request,
//         private readonly responseService:ResponseService,
        
//     ) {}

//     // @Post('uploadFile1')
//     // @UseInterceptors(FileInterceptor('file', {
//     //   limits: { fileSize: 3 * 1024 * 1024 - 1 }, // Limit set to just under 3MB
//     // }))
//     // // @UseInterceptors(FileInterceptor('file'))
//     // async uploadfile(@Res() res: Response,@UploadedFile() file: Express.Multer.File) {
//     //   return await this.fileUploadService.uploadFile(file,res,{ folder: 'uploads'});
//     // }

    
//     //aws
//     @Post('uploadFile')
//     // @UseGuards(JwtAuthGuard)
//     @UseInterceptors(FileInterceptor('file', {
//       // limits: { fileSize: 3 * 1024 * 1024 - 1 }, // Limit set to just under 3MB
//     }))
//     async uploadFile(@Res() res: Response,@UploadedFile() file: Express.Multer.File) {
//       // const aUser:RequestUserDto = this.request['user'];
//       return await this.fileUploadService.uploadFileAWS(file,res);
//     }

    
//     @Post('uploadVideo')
//     @UseGuards(JwtAuthGuard)
//     @UseInterceptors(FileInterceptor('file'))
//     async uploadVideo(@Res() res: Response,@UploadedFile() file: Express.Multer.File) {
//       const aUser:RequestUserDto = this.request['user'];
//       return await this.fileUploadService.uploadVideo(file,aUser.id,file.originalname,res);
//     }

//     //--------------------new Changes CDN-------------------------------------


    
//   // need to use the another s3 bucket and 
//   @Post('uploadsmallcontent')
//   // @UseGuards(JwtAuthGuard)
//   @UseInterceptors(FileInterceptor('file'))
//   async uploadsmallcontent(@Res() res: Response, @UploadedFile() file: Express.Multer.File) {
//     // const aUser: RequestUserDto = this.request['user'];
//     return await this.fileUploadService.uploadsmallcontent(res, file);
//   }

//   /**
//    * First API: Initiate Multipart Upload
//    */
//   @Post('initiateupload')
//   // @UseGuards(JwtAuthGuard)
//   async initiateMultipartUpload(@Res() res: Response, @Body() dto: InitiateUploadDto) {
//     // const aUser:RequestUserDto = this.request['user'];
//     return await this.fileUploadService.initiateMultipartUpload(res, dto);
//   }

  
//   /**
//  * Second API: Upload Chunk
//  */
//   @Post('uploadchunk')
//   // @UseGuards(JwtAuthGuard)
//   @UseInterceptors(FileInterceptor('filechunk'))
//   async uploadChunk(
//     @Res() res: Response,
//     @Body() dto: UploadChunkDto,
//     @UploadedFile() file: Express.Multer.File,
//   ) {
//     // const aUser:RequestUserDto = this.request['user'];
//     return await this.fileUploadService.uploadPart(res, dto, file);
//   }

//   /**
// * Third API: Complete Multipart Upload
// */
//   @Post('completeupload')
//   // @UseGuards(JwtAuthGuard)
//   async completeUpload(
//     @Res() res: Response,
//     @Body() dto: CompleteUploadDto
//   ) {
//     // const aUser:RequestUserDto = this.request['user'];
//     return await this.fileUploadService.completeMultipartUpload(res, dto);
//   }

// }
