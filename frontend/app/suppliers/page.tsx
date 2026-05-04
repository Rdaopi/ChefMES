'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from '@/components/LanguageProvider';
import { supabase } from '@/lib/supabase';

// 1. Interfacce
interface Supplier {
  id: string;
  name: string;
  totalSpent: number;
  invoiceCount: number;
  lastOrderDate: string | null;
}

interface SupplierInvoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  file_name: string;
  invoice_date: string;
}

// Interfaccia per le righe della fattura (uguale all'Auditor)
interface InvoiceDetailLine {
  id: string;
  raw_description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  calculated_unit_price: number;
  standard_uom: string;
  standard_ingredients?: { name: string };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function SuppliersPage() {
  const { t } = useTranslations();
  
  // Stati di navigazione
  const [view, setView] = useState<'suppliers' | 'invoices' | 'detail'>('suppliers');
  
  // Dati
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<SupplierInvoice | null>(null);
  
  // NUOVO STATO: Dettagli della singola fattura (le righe)
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetailLine[]>([]);
  
  // Stati di caricamento
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingInvoices, setIsFetchingInvoices] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  // Fetch Iniziale Fornitori
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(`${API_URL}/api/suppliers`, {
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();
        setSuppliers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Connection error:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSuppliers();
  }, []);

  // Fetch Fatture del fornitore
  const handleSupplierClick = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setView('invoices');
    setIsFetchingInvoices(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_URL}/api/suppliers/${supplier.id}/invoices`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const data = await response.json();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setIsFetchingInvoices(false);
    }
  };

  // NUOVO: Fetch dei dettagli usando l'ID della fattura
  const handleInvoiceClick = async (invoice: SupplierInvoice) => {
    setSelectedInvoice(invoice);
    setView('detail');
    setIsFetchingDetails(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      // RIUTILIZZIAMO L'ENDPOINT DELL'AUDITOR!
      const response = await fetch(`${API_URL}/api/invoices/${invoice.id}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      const data = await response.json();
      setInvoiceDetails(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching invoice details:", error);
    } finally {
      setIsFetchingDetails(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 bg-slate-50">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 shrink-0 justify-between">
        <div className="flex items-center">
          {view !== 'suppliers' && (
            <button 
              onClick={() => view === 'detail' ? setView('invoices') : setView('suppliers')}
              className="mr-4 text-slate-400 hover:text-indigo-600 transition-colors"
            >
              <i className="fas fa-arrow-left text-xl"></i>
            </button>
          )}
          <h2 className="text-lg font-bold text-slate-800 flex items-center">
            {view === 'suppliers' && <><i className="fas fa-truck-loading mr-2 text-indigo-500"></i>{t('aiVendorManagement') || 'Gestione Fornitori'}</>}
            {view === 'invoices' && <><i className="fas fa-file-invoice mr-2 text-indigo-500"></i>{t('invoices') || 'Fatture'} {t('di') || 'di'} {selectedSupplier?.name}</>}
            {view === 'detail' && <><i className="fas fa-search mr-2 text-indigo-500"></i>{t('detail') || 'Dettaglio'} {t('invoice') || 'Fattura'}: {selectedInvoice?.invoice_number}</>}
          </h2>
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto p-8">
        
        {/* VISTA 1: FORNITORI */}
        {view === 'suppliers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {isLoading ? (
              <p className="col-span-full text-center text-slate-400 py-10 font-medium">{t('loadingSuppliers') || 'Caricamento fornitori...'}</p>
            ) : suppliers.map((supplier) => (
              <div 
                key={supplier.id} 
                onClick={() => handleSupplierClick(supplier)}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-400 transition-all flex flex-col overflow-hidden cursor-pointer transform hover:-translate-y-1"
              >
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                  <div>
                    <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight line-clamp-1">{supplier.name}</h3>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">ID: {supplier.id.split('-')[0]}</p>
                  </div>
                  <div className="bg-indigo-100 text-indigo-700 w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                    <i className="fas fa-building text-sm"></i>
                  </div>
                </div>
                <div className="p-5 flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('totalSpent') || 'Spesa Totale'}</p>
                    <p className="text-xl font-black text-slate-900">€ {supplier.totalSpent.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('invoices') || 'Fatture'}</p>
                    <p className="text-xl font-bold text-indigo-600">{supplier.invoiceCount} <span className="text-sm font-medium text-slate-400">doc</span></p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VISTA 2: LISTA FATTURE */}
        {view === 'invoices' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {isFetchingInvoices ? (
              <p className="p-10 text-center text-slate-400">{t('loadingInvoices') || 'Caricamento fatture in corso...'}</p>
            ) : invoices.map((inv) => (
              <div 
                key={inv.id} 
                onClick={() => handleInvoiceClick(inv)} // Chiama la nuova funzione
                className="px-6 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer flex justify-between items-center"
              >
                <div>
                  <p className="text-sm font-bold text-indigo-600">{inv.invoice_number}</p>
                  <p className="text-xs text-slate-400">{new Date(inv.invoice_date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-800">€ {Number(inv.total_amount).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VISTA 3: DETTAGLIO RIGHE FATTURA (Sfruttiamo l'API dell'Auditor!) */}
        {view === 'detail' && selectedInvoice && (
          <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-8 border-b border-slate-100 pb-6">
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">{t('registeredInvoice') || 'Fattura Registrata'}</p>
                <h1 className="text-3xl font-black text-slate-800">{selectedInvoice.invoice_number}</h1>
                <p className="text-indigo-600 font-medium mt-2">{selectedSupplier?.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">{t('totalAmount') || 'Importo Totale'}</p>
                <p className="text-3xl font-black text-emerald-600">€ {Number(selectedInvoice.total_amount).toFixed(2)}</p>
              </div>
            </div>

            {/* RIGHE FATTURA (Ingredienti) */}
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">{t('invoicedItems') || 'Articoli Fatturati'}</h3>
              
              {isFetchingDetails ? (
                <div className="py-10 text-center text-slate-400 flex flex-col items-center">
                   <i className="fas fa-circle-notch fa-spin text-3xl text-indigo-300 mb-3"></i>
                   <p className="font-bold text-xs uppercase tracking-widest">{t('extractingLines') || 'Estrazione righe dal database...'}</p>
                </div>
              ) : invoiceDetails.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {invoiceDetails.map((line) => (
                    <div key={line.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-between items-center hover:border-indigo-300 transition-colors group">
                      
                      {/* Info Articolo */}
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">{t('originalSupplier') || 'Original Name'}</p>
                        <p className="text-sm text-slate-700 font-medium">{line.raw_description}</p>
                        
                        <div className="mt-2 flex items-center">
                          <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold uppercase mr-2">
                            Match AI
                          </span>
                          <span className="text-sm font-black text-indigo-600 uppercase tracking-tight">
                            {line.standard_ingredients?.name || 'Sconosciuto'}
                          </span>
                        </div>
                      </div>

                      {/* Info Prezzo/Quantità */}
                      <div className="text-right pl-4 border-l border-slate-200 ml-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">{t('quantityPurchased') || 'Quantità Acquistata'}</p>
                        <p className="text-sm font-bold text-slate-700 mb-2">{line.quantity} {line.unit} @ €{line.unit_price}</p>
                        
                        <div className="bg-emerald-50 rounded px-2 py-1 border border-emerald-100 inline-block">
                          <p className="text-[10px] font-black text-emerald-600 uppercase">{t('calculatedCleanCost') || 'Costo Pulito Calcolato'}</p>
                          <p className="text-base font-black text-emerald-700">€ {line.calculated_unit_price?.toFixed(3)} <span className="text-xs font-bold text-emerald-500">/ {line.standard_uom}</span></p>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-slate-500">{t('noInvoiceDetails') || 'Nessun dettaglio riga trovato per questa fattura.'}</p>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}