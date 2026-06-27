import { IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateFrameDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(140)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  context?: string;

  @IsUrl({ require_tld: false })
  imageUrl: string;
}
