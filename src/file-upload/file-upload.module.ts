import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
// import { CloudinaryModule } from 'nestjs-cloudinary';
import { FileUploadController } from './file-upload.controller';
import { FileUploadService } from './file-upload.service';
import { ResponseService } from 'src/response/response.service';
import { CommonService } from 'src/common/common.service';

@Module({
    imports:[
        ConfigModule
        // ConfigModule.forRoot(), // Import ConfigModule to load environment variables
        // CloudinaryModule.forRootAsync({
        //     imports: [ConfigModule], // Import ConfigModule to inject ConfigService
        //     useFactory: (configService: ConfigService) => ({
        //         isGlobal: true,
        //         cloud_name: configService.get<string>('CLOUDINARY_CLOUD_NAME'), // Retrieve from ConfigService
        //         api_key: configService.get<string>('CLOUDINARY_API_KEY'), // Retrieve from ConfigService
        //         api_secret: configService.get<string>('CLOUDINARY_API_SECRET'), // Retrieve from ConfigService
        //     }),
        //     inject: [ConfigService], // Inject ConfigService
        // }),
    ],
    exports:[FileUploadService],
    providers:[FileUploadService,ResponseService,CommonService],
    controllers: [FileUploadController]
})
export class FileUploadModule {   
}
