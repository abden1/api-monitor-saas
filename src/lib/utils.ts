import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatResponseTime(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "UP":
    case "OPERATIONAL":
    case "RESOLVED":
      return "text-green-600 dark:text-green-400";
    case "DOWN":
    case "MAJOR_OUTAGE":
    case "INVESTIGATING":
      return "text-red-600 dark:text-red-400";
    case "DEGRADED":
    case "PARTIAL_OUTAGE":
    case "DEGRADED_PERFORMANCE":
    case "IDENTIFIED":
    case "MONITORING":
      return "text-yellow-600 dark:text-yellow-400";
    case "PAUSED":
    case "MAINTENANCE":
      return "text-blue-600 dark:text-blue-400";
    case "PENDING":
      return "text-gray-600 dark:text-gray-400";
    default:
      return "text-gray-600 dark:text-gray-400";
  }
}

export function getStatusBg(status: string): string {
  switch (status) {
    case "UP":
    case "OPERATIONAL":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "DOWN":
    case "MAJOR_OUTAGE":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    case "DEGRADED":
    case "PARTIAL_OUTAGE":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    case "PAUSED":
    case "MAINTENANCE":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
  }
}

export function getStatusDot(status: string): string {
  switch (status) {
    case "UP": return "bg-green-500";
    case "DOWN": return "bg-red-500";
    case "DEGRADED": return "bg-yellow-500";
    case "PAUSED": return "bg-blue-400";
    default: return "bg-gray-400";
  }
}
