import { IsNotEmpty, IsNumber, IsString, Min } from "class-validator";

export class InitiateUploadDto {

    @IsString()
    @IsNotEmpty({ message: 'File type is required.' })
    fileType: string;

    @IsNumber()
    @IsNotEmpty({ message: 'File size is required.' })
    // @Min(6 * 1024 * 1024, { message: 'File size be at least 6MB.' })
    fileSize: number;  // Total size of the file in bytes (e.g., 10485760 for 10MB)
}