import type { AccountType } from "./types";

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  brokerage: "Brokerage",
  "401k": "401(k)",
  "roth-ira": "Roth IRA",
  "traditional-ira": "Traditional IRA",
  hsa: "HSA",
  savings: "Savings",
  other: "Other",
};

export const ACCOUNT_TYPES = Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[];
