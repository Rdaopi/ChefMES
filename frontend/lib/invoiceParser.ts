import { ParsedInvoice, TradingItem, InvoiceLine } from './invoiceStorage';

// Helpers
export const randomBetween = (min: number, max: number) => Math.random() * (max - min) + min;
export const formatCurrency = (value: number) => `€ ${value.toFixed(2)}`;

const getElementText = (parent: Element | null, tagName: string) => {
  const element = parent?.getElementsByTagName(tagName)[0] ?? null;
  return element?.textContent?.trim() ?? '';
};

const findElements = (doc: Document, localName: string) => {
  const found = Array.from(doc.getElementsByTagNameNS('*', localName));
  if (found.length > 0) return found;
  return Array.from(doc.getElementsByTagName(localName));
};

// Business Logic
export const deriveTradingItems = (lines: InvoiceLine[], supplierName: string): TradingItem[] => {
  return lines.map((line) => {
    const contractPrice = parseFloat((line.unitPrice * randomBetween(0.9, 1.2)).toFixed(2));
    const livePrice = parseFloat((contractPrice * randomBetween(0.85, 1.15)).toFixed(2));
    const diff = livePrice - contractPrice;
    const trendDirection = diff > 0.2 ? 'up' : diff < -0.2 ? 'down' : 'stable';
    const status = trendDirection === 'up' ? 'Warning' : trendDirection === 'down' ? 'Opportunity' : 'Hold';

    return {
      id: line.id,
      ingredient: line.description,
      supplier: supplierName || 'Inferred Supplier',
      contractPrice: contractPrice || line.unitPrice || 1.0,
      livePrice: livePrice || contractPrice || line.unitPrice || 1.0,
      trend: trendDirection === 'up' ? 'Rising cost' : trendDirection === 'down' ? 'Price dip' : 'Stable',
      trendDirection,
      status,
    };
  });
};

export const parseInvoiceXml = (xmlText: string): ParsedInvoice => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const parseError = doc.querySelector('parsererror');
  
  if (parseError) throw new Error('Invalid XML format');

  const invoiceNumber = getElementText(doc.documentElement, 'Numero') || getElementText(doc.documentElement, 'IdCodice') || 'Unknown';
  const invoiceDate = getElementText(doc.documentElement, 'Data') || 'Unknown';
  const totalAmount = getElementText(doc.documentElement, 'ImportoTotaleDocumento') || 'Unknown';

  const supplierName = getElementText(doc.documentElement, 'Denominazione') ||
    getElementText(doc.documentElement, 'CedentePrestatore') ||
    getElementText(doc.documentElement, 'CessionarioCommittente') ||
    'Unknown Supplier';

  const lineElements = findElements(doc, 'DettaglioLinee');

  const lines = lineElements.map((lineElement, index) => {
    return {
      id: `${index + 1}`,
      description: getElementText(lineElement, 'Descrizione') || 'Unknown item',
      quantity: Number(getElementText(lineElement, 'Quantita')) || Number(getElementText(lineElement, 'QuantitaOraria')) || 1,
      unit: getElementText(lineElement, 'UnitaMisura') || 'ea',
      unitPrice: Number(getElementText(lineElement, 'PrezzoUnitario')) || 0,
      totalPrice: Number(getElementText(lineElement, 'PrezzoTotale')) || 0,
      vatRate: Number(getElementText(lineElement, 'AliquotaIVA')) || 0,
    };
  });

  return { invoiceNumber, invoiceDate, supplier: supplierName, totalAmount, lines };
};