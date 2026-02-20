import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateConverterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  brand: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  weight?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  pt?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  pd?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  rh?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  keywords?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  imageUrl?: string;
}
