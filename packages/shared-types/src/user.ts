import type { Subscription, CreditBalance } from './subscription';

export enum UserRole {
  ADMIN = 'ROLE_ADMIN',
  MODERATOR = 'ROLE_MODERATOR',
  USER = 'ROLE_USER',
}

export enum UserStatus {
  ACTIVE = 1,
  INACTIVE = 2,
}

export interface User {
  id: number;
  email: string;
  username: string;
  name?: string;
  phone?: string;
  statusId?: number;
  createdAt?: Date;
  lastAccess?: Date;
  roles: UserRole[];
}

export interface UserProfile extends User {
  settings?: UserSettings;
  subscription?: Subscription;
  creditBalance?: CreditBalance;
}

export interface UserSettings {
  id: number;
  discount: number;
  restDiscount: boolean;
  currencyId?: number;
  currency?: Currency;
}

export interface Currency {
  id: number;
  code: string;
  descEn: string;
  descAr?: string;
  symbol: string;
}
