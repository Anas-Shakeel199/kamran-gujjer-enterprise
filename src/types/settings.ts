export interface AppSettings {
  factoryName: string;
  factoryPhone: string;
  factoryAddress: string;
}

export interface MaalCategory {
  id: number;
  name: string;
  isActive: boolean;
}

export interface PaymentMethodRecord {
  id: number;
  name: string;
  isActive: boolean;
}

export interface Factory {
  id: number;
  name: string;
  isActive: boolean;
}