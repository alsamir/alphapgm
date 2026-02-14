import { SetMetadata } from '@nestjs/common';

export const CREDIT_COST_KEY = 'creditCost';
export const CreditCost = (cost: number) => SetMetadata(CREDIT_COST_KEY, cost);
