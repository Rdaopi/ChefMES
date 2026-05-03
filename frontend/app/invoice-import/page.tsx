'use client';

import { useEffect, useState } from 'react';

import { ParsedInvoice, TradingItem, loadInvoiceState, saveInvoiceState, clearInvoiceState } from '@/lib/invoiceStorage';
import { parseInvoiceXml, deriveTradingItems, formatCurrency } from '@/lib/invoiceParser';
import { useInvoiceUpload } from '@/hooks/useInvoiceUpload';

export default function InvoiceImportPage() {
  const [parsedInvoice, setParsedInvoice] = useState<ParsedInvoice | null>(null);
  const [tradingItems, setTradingItems] = useState<TradingItem[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');

  // 1. Using the hook for uploading invoice to backend
  const { uploadToBackend, isUploading, uploadMessage } = useInvoiceUpload();

  useEffect(() => {
    const initData = async () => {
      const storedState = loadInvoiceState();
      if (storedState) {
        setParsedInvoice(storedState.parsedInvoice);
        setTradingItems(storedState.tradingItems);
        setFileName(storedState.fileName);
      }
    };

    initData();
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setError('Unable to read invoice file.');
        return;
      }

      try {
        // 2. Using the imported parser functions
        const invoice = parseInvoiceXml(reader.result);
        const derivedItems = deriveTradingItems(invoice.lines, invoice.supplier);
        
        setParsedInvoice(invoice);
        setTradingItems(derivedItems);
        
        saveInvoiceState({
          parsedInvoice: invoice,
          tradingItems: derivedItems,
          fileName: file.name,
          rawXml: reader.result,
        });
      } catch (err) {
        setParsedInvoice(null);
        setTradingItems([]);
        clearInvoiceState();
        setError('Unable to parse XML invoice. Please upload a valid XML file.');
      }
    };

    reader.onerror = () => {
      setError('Unable to read invoice file.');
    };

    reader.readAsText(file, 'UTF-8');
  };

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 bg-slate-50">
      <header className="h-20 bg-white border-b border-slate-200 flex items-center px-8 shrink-0">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Invoice Import</h2>
          <p className="text-slate-500 text-sm mt-1">Upload an XML restaurant invoice and preview parsed line items with simple trading signals.</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-8">
        <div className="grid gap-6">
          <div className="bg-white shadow-sm rounded-2xl border border-slate-200 p-6">
            <label className="block text-sm font-semibold text-slate-700 mb-3">Select an XML invoice file from your computer</label>
            <input
              type="file"
              accept=".xml,application/xml,text/xml"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800"
            />
            {fileName && <p className="mt-3 text-sm text-slate-500">Loaded file: <span className="font-medium text-slate-900">{fileName}</span></p>}
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </div>

          {!parsedInvoice && (
            <div className="bg-white shadow-sm rounded-2xl border border-slate-200 p-8 text-slate-500">
              <p className="text-sm">No invoice loaded yet. Choose an XML invoice file to display invoice details and trading signals.</p>
            </div>
          )}

          {parsedInvoice && (
            <>
              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <section className="bg-white shadow-sm rounded-2xl border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Invoice Summary</h3>
                  <div className="grid gap-3 text-sm text-slate-600">
                    <div className="flex justify-between border-b border-slate-100 py-3">
                      <span className="font-medium text-slate-700">Invoice number</span>
                      <span>{parsedInvoice.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 py-3">
                      <span className="font-medium text-slate-700">Date</span>
                      <span>{parsedInvoice.invoiceDate}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 py-3">
                      <span className="font-medium text-slate-700">Supplier</span>
                      <span>{parsedInvoice.supplier}</span>
                    </div>
                    <div className="flex justify-between py-3">
                      <span className="font-medium text-slate-700">Total amount</span>
                      <span className="font-semibold text-slate-900">{parsedInvoice.totalAmount}</span>
                    </div>
                  </div>

                  {/* 3. Using the hook's states and function here */}
                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <button
                      onClick={() => uploadToBackend(parsedInvoice, fileName)}
                      disabled={isUploading}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                    >
                      {isUploading ? 'Saving...' : 'Save Invoice to Database'}
                    </button>

                    {uploadMessage && (
                      <div className={`mt-3 p-3 rounded-lg text-sm font-medium ${
                        uploadMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {uploadMessage.text}
                      </div>
                    )}
                  </div>

                </section>

                <section className="bg-white shadow-sm rounded-2xl border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Trading from Invoice</h3>
                  <p className="text-sm text-slate-500">Ingredients are automatically extracted from invoice lines and mapped into a trading view.</p>
                  <div className="mt-6 grid gap-3">
                    <div className="rounded-3xl bg-slate-50 p-4 border border-slate-200">
                      <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Parsed ingredient count</p>
                      <p className="text-3xl font-black text-slate-900 mt-2">{parsedInvoice.lines.length}</p>
                    </div>
                    <div className="rounded-3xl bg-slate-50 p-4 border border-slate-200">
                      <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Market signals</p>
                      <p className="text-3xl font-black text-slate-900 mt-2">{tradingItems.filter((item) => item.status !== 'Hold').length} active</p>
                    </div>
                  </div>
                </section>
              </div>

              <section className="bg-white shadow-sm rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
                  <h3 className="text-lg font-bold text-slate-800">Invoice Line Items</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">#</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Qty</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Unit</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Unit price</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Total</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">VAT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {parsedInvoice.lines.map((line) => (
                        <tr key={line.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-slate-700 font-medium">{line.id}</td>
                          <td className="px-6 py-4 text-slate-600">{line.description}</td>
                          <td className="px-6 py-4 text-slate-600">{line.quantity}</td>
                          <td className="px-6 py-4 text-slate-600">{line.unit}</td>
                          <td className="px-6 py-4 text-slate-600">{formatCurrency(line.unitPrice)}</td>
                          <td className="px-6 py-4 text-slate-600">{formatCurrency(line.totalPrice)}</td>
                          <td className="px-6 py-4 text-slate-600">{line.vatRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="bg-white shadow-sm rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
                  <h3 className="text-lg font-bold text-slate-800">Trading view</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Ingredient</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Supplier</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Contract</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Live</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Trend</th>
                        <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {tradingItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-5 font-bold text-slate-800">{item.ingredient}</td>
                          <td className="px-6 py-5 text-sm text-slate-500">{item.supplier}</td>
                          <td className="px-6 py-5 text-sm text-slate-500">{formatCurrency(item.contractPrice)}</td>
                          <td className="px-6 py-5 text-sm font-black text-slate-800">{formatCurrency(item.livePrice)}</td>
                          <td className="px-6 py-5 text-sm text-slate-600">{item.trend}</td>
                          <td className="px-6 py-5 whitespace-nowrap">
                            <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${item.status === 'Opportunity' ? 'bg-emerald-100 text-emerald-800' : item.status === 'Warning' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600'}`}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}