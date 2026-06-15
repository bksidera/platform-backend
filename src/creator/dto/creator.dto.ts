import { IsArray, IsIn, IsOptional, IsString, IsUrl, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class MediaLinkDto {
  @IsIn(['spotify', 'bandcamp', 'youtube', 'link'])
  kind: 'spotify' | 'bandcamp' | 'youtube' | 'link';

  @IsUrl()
  url: string;
}

export class UpdateArchiveDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @IsOptional()
  @IsString()
  heroImageUrl?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaLinkDto)
  mediaLinks?: MediaLinkDto[];

  @IsOptional()
  @IsIn(['aggregate_only', 'show_opted_in'])
  archiveVisibility?: 'aggregate_only' | 'show_opted_in';
}
