import { Transform } from "class-transformer";
import { IsNotEmpty, IsNumber, IsString, Min } from "class-validator";

export class UploadChunkDto {
    @IsString()
    @IsNotEmpty({ message: 'File Name is required.' })
    fileName: string;

    @IsString()
    @IsNotEmpty({ message: 'Upload ID is required.' })
    uploadId: string;  // The unique ID for the multipart upload session

    @Transform(({ value }) => parseInt(value, 10)) // Transform to integer
    @IsNumber()
    @Min(1, { message: 'Part number must be at least 1.' })
    partNumber: number; // The part number of the chunk being uploaded
}