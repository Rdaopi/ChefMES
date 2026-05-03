'use client';

export interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  vatRate: number;
}

export interface ParsedInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  supplier: string;
  totalAmount: string;
  lines: InvoiceLine[];
}

export interface TradingItem {
  id: string;
  ingredient: string;
  supplier: string;
  contractPrice: number;
  livePrice: number;
  trend: string;
  trendDirection: 'up' | 'down' | 'stable';
  status: string;
}

export interface StoredInvoiceState {
  parsedInvoice: ParsedInvoice;
  tradingItems: TradingItem[];
  fileName: string;
  rawXml: string;
}

export interface InvoiceSummary {
  id: string;
  invoiceNumber: string;
  supplier: string;
  amount: number;
  date: string;
  fileName: string;
}

export interface InvoiceDetailLine {
  id: string;
  raw_description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  calculated_unit_price: number;
  standard_uom: string;
  standard_ingredients: { name: string } | null;
}

const STORAGE_KEY = 'chefmes.invoiceImport';

export function loadInvoiceState(): StoredInvoiceState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredInvoiceState;
  } catch (error) {
    console.warn('Unable to load persisted invoice state', error);
    return null;
  }
}

export function saveInvoiceState(state: StoredInvoiceState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Unable to persist invoice state', error);
  }
}

export function clearInvoiceState() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Unable to clear persisted invoice state', error);
  }
}
