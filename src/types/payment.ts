import type { PartyType } from "./party";

export interface PaymentRecord {
  id: number;
  phoneNumber: string;
  partyType: PartyType;
  factory: string;
  partyName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string | null;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}