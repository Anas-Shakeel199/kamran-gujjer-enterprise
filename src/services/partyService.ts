import { invoke } from "@tauri-apps/api/core";
import type {
  CreatePaymentInput,
  Party,
  PartyLedgerResponse,
  PartySummary,
  PartyType,
  UpsertPartyInput,
} from "../types/party";

const partyService = {
  getParties: async (
    partyType: PartyType,
    factory: string
  ): Promise<PartySummary[]> => {
    return await invoke<PartySummary[]>("get_parties", { partyType, factory });
  },

  getPartyLedger: async (
    phoneNumber: string,
    partyType: PartyType,
    factory: string
  ): Promise<PartyLedgerResponse> => {
    return await invoke<PartyLedgerResponse>("get_party_ledger", {
      phoneNumber,
      partyType,
      factory,
    });
  },

  createPayment: async (payment: CreatePaymentInput): Promise<void> => {
    await invoke("create_payment", { payment });
  },

  saveParty: async (party: UpsertPartyInput): Promise<Party> => {
    return await invoke<Party>("save_party", { party });
  },

  deleteParty: async (
    phoneNumber: string,
    partyType: PartyType,
    factory: string
  ): Promise<void> => {
    await invoke("delete_party", { phoneNumber, partyType, factory });
  },
};

export default partyService;