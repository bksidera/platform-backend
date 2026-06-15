import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestCreatorLinkDto {
  @IsEmail()
  email: string;

  // Required only the first time, to create the Creator record.
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}

export class RequestClaimLinkDto {
  @IsEmail()
  email: string;
}

export class VerifyMagicLinkDto {
  @IsNotEmpty()
  @IsString()
  token: string;
}
