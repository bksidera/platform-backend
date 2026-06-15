import { IsNotEmpty, IsNumber, IsString, Min } from "class-validator";

export class Part {
    @IsNumber()
    @Min(1, { message: 'Part number must be at least 1.' })
    partNumber: number;  // The part number of the chunk

    @IsString()
    @IsNotEmpty({ message: 'ETag is required for each part.' })
    etag: string;  // The ETag returned by S3 for the uploaded part
}