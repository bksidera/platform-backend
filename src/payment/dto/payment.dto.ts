import { IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateMomentIntentDto {
  @IsNotEmpty()
  @IsString()
  creatorSlug: string;

  // Cents. $1 floor keeps Stripe fees sane; $2,000 ceiling guards fat fingers.
  @IsInt()
  @Min(100)
  @Max(200000)
  amountCents: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  name: string;

  @IsEmail()
  email: string;

  // The QR's source parameter — resolves to a Monument and stamps the Stream.
  @IsOptional()
  @IsString()
  monumentSlug?: string;
}
