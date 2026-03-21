import { Plan } from "@prisma/client";

export interface PlanConfig {
  name: string;
  price: number;
  monitors: number;
  statusPages: number;
  checkInterval: number; // seconds
  sms: boolean;
  multiRegion: boolean;
  teamMembers: number;
  apiAccess: boolean;
  whiteLabel: boolean;
  dataRetentionDays: number;
}

export const PLANS: Record<Plan, PlanConfig> = {
  FREE: {
    name: "Free",
    price: 0,
    monitors: 5,
    statusPages: 1,
    checkInterval: 60,
    sms: false,
    multiRegion: false,
    teamMembers: 1,
    apiAccess: false,
    whiteLabel: false,
    dataRetentionDays: 30,
  },
  STARTER: {
    name: "Starter",
    price: 19,
    monitors: 20,
    statusPages: 3,
    checkInterval: 30,
    sms: false,
    multiRegion: false,
    teamMembers: 5,
    apiAccess: true,
    whiteLabel: false,
    dataRetentionDays: 60,
  },
  PRO: {
    name: "Pro",
    price: 49,
    monitors: 100,
    statusPages: 10,
    checkInterval: 10,
    sms: true,
    multiRegion: true,
    teamMembers: 20,
    apiAccess: true,
    whiteLabel: false,
    dataRetentionDays: 90,
  },
  ENTERPRISE: {
    name: "Enterprise",
    price: 149,
    monitors: -1, // unlimited
    statusPages: -1,
    checkInterval: 10,
    sms: true,
    multiRegion: true,
    teamMembers: -1,
    apiAccess: true,
    whiteLabel: true,
    dataRetentionDays: 365,
  },
};

export function getPlanConfig(plan: Plan): PlanConfig {
  return PLANS[plan];
}

export function isUnlimited(value: number): boolean {
  return value === -1;
}

export function canAddMonitor(plan: Plan, currentCount: number): boolean {
  const config = PLANS[plan];
  return isUnlimited(config.monitors) || currentCount < config.monitors;
}

export function canAddStatusPage(plan: Plan, currentCount: number): boolean {
  const config = PLANS[plan];
  return isUnlimited(config.statusPages) || currentCount < config.statusPages;
}

export function canAddTeamMember(plan: Plan, currentCount: number): boolean {
  const config = PLANS[plan];
  return isUnlimited(config.teamMembers) || currentCount < config.teamMembers;
}

export function getMinCheckInterval(plan: Plan): number {
  return PLANS[plan].checkInterval;
}

export const STRIPE_PRICE_IDS: Partial<Record<Plan, string | undefined>> = {
  STARTER: process.env.STRIPE_STARTER_PRICE_ID,
  PRO: process.env.STRIPE_PRO_PRICE_ID,
  ENTERPRISE: process.env.STRIPE_ENTERPRISE_PRICE_ID,
};
