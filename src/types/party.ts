export type PartyType = "supplier" | "customer";

export interface Party {
  id: number;
  name: string;
  phoneNumber: string;
  partyType: PartyType;
  factory: string;
  address: string | null;
  openingBalance: number;
  createdAt: string;
}

export interface PartySummary {
  id: number;
  name: string;
  phoneNumber: string;
  partyType: PartyType;
  factory: string;
  address: string | null;
  openingBalance: number;
  totalBusiness: number;
  totalPayments: number;
  balance: number;
}

export interface LedgerEntry {
  date: string;
  detail: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface PartyLedgerResponse {
  party: PartySummary;
  entries: LedgerEntry[];
}

export interface CreatePaymentInput {
  phoneNumber: string;
  partyType: PartyType;
  factory: string;
  amount: number;
  paymentDate: string;
  paymentMethod?: string;
  reference?: string;
  notes?: string;
}

export interface UpsertPartyInput {
  name: string;
  phoneNumber: string;
  partyType: PartyType;
  factory: string;
  address?: string;
  openingBalance: number;
}