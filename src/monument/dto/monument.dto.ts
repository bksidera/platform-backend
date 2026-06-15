import { IsDateString, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from 'class-validator';

// The constrained glyph set (spec L2) — keep in sync with the frontend.
export const GLYPHS = ['◆', '●', '▲', '✶', '♥', '⬟'];

export class CreateMonumentDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(140)
  title: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(140)
  venue: string;

  @IsDateString()
  eventDate: string;

  @IsUrl({ require_tld: false })
  imageUrl: string;
}

export class CreateInscriptionDto {
  @IsNotEmpty()
  @IsString()
  streamId: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  x: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  y: number;

  @IsIn(GLYPHS)
  glyph: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  observationText?: string;

  @IsOptional()
  @IsIn(['private', 'public'])
  visibility?: 'private' | 'public';
}
