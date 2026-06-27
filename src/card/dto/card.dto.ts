import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Max, MaxLength, Min } from 'class-validator';

export class CreateCardDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(80)
  displayName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  note?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  photoUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(200000)
  amountCents?: number;
}

export class ReportCardDto {
  @IsOptional()
  @IsString()
  @MaxLength(240)
  reason?: string;
}
