import { Type } from "class-transformer";
import { IsArray, IsNotEmpty, IsString, ValidateNested } from "class-validator";
import { Part } from "./Part";

export class CompleteUploadDto {

    @IsString()
    @IsNotEmpty({ message: 'File Name is required.' })
    fileName: string;

    @IsString()
    @IsNotEmpty({ message: 'Upload ID is required.' })
    uploadId: string;  // The unique ID for the multipart upload session

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => Part)  // Transform each item in the array to a `Part` class instance
    @IsNotEmpty({ message: 'Parts data is required.' })
    parts: Part[];  // Array of parts, each with partNumber and etag
}