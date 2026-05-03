'use client';
import { useState } from 'react';
import { useTranslations } from '@/components/LanguageProvider';
import { useInvoiceAuditor } from '@/hooks/useInvoiceAuditor';
import { InvoiceSummary, InvoiceDetailLine } from '@/lib/invoiceStorage';

export default function InvoiceAuditorPage() {
  const { t } = useTranslations();
  
  const { 
    invoices, 
    isLoading, 
    selectedInvoice, 
    details, 
    isDetailsLoading, 
    fetchInvoiceDetails, 
    closeDetails 
  } = useInvoiceAuditor();

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 bg-slate-50 relative overflow-hidden">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 shrink-0">
        <h2 className="text-lg font-bold text-slate-800">
          <i className="fas fa-file-invoice-dollar mr-2 text-indigo-500"></i>
          {t('invoiceAuditorTitle') || 'Auditor Fatture AI'}
        </h2>
      </header>
      
      <main className="flex-1 overflow-y-auto p-8">
        <InvoiceTable 
          invoices={invoices} 
          isLoading={isLoading} 
          onSelectInvoice={fetchInvoiceDetails} 
          t={t} 
        />
      </main>

      {/* Pannello Dettaglio Riga (Slide-out o Fullscreen) */}
      {selectedInvoice && (
        <InvoiceDetailModal 
          invoice={selectedInvoice}
          lines={details}
          isLoading={isDetailsLoading}
          onClose={closeDetails}
          t={t}
        />
      )}
    </div>
  );
}


function InvoiceTable({ invoices, isLoading, onSelectInvoice, t }: any) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Quante fatture mostrare per pagina

  // Calcoli per la paginazione
  const totalPages = Math.max(1, Math.ceil(invoices.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInvoices = invoices.slice(startIndex, startIndex + itemsPerPage);

  const handlePrevPage = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNextPage = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  return (
    <div className="bg-white shadow-sm rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">{t('date') || 'Data'}</th>
              <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">{t('supplier')}</th>
              <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">{t('documentNumber') || 'N. Documento'}</th>
              <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">{t('billedAmount')}</th>
              <th className="px-6 py-4 text-right text-xs font-black text-slate-500 uppercase tracking-wider">{t('actions') || 'Azioni'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-slate-400 font-bold uppercase tracking-widest text-xs">
                  <i className="fas fa-spinner fa-spin mr-2"></i> {t('scanningXmlInvoices') || 'Scansione Database...'}
                </td>
              </tr>
            ) : paginatedInvoices.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-slate-400 font-medium">{t('noInvoicesFound') || 'Nessuna fattura trovata.'}</td>
              </tr>
            ) : (
              paginatedInvoices.map((invoice: InvoiceSummary) => (
                <tr key={invoice.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 text-sm font-medium text-slate-600">
                    {new Date(invoice.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900 font-bold group-hover:text-indigo-600 transition-colors">
                    {invoice.supplier}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 font-mono">
                    {invoice.invoiceNumber || invoice.fileName}
                  </td>
                  <td className="px-6 py-4 text-slate-900 font-black">
                    € {invoice.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => onSelectInvoice(invoice)}
                      className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                    >
                      <i className="fas fa-search mr-1"></i> {t('viewAiAudit') || 'Vedi Dettagli'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER DI PAGINAZIONE */}
      {!isLoading && invoices.length > itemsPerPage && (
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between">
          <p className="text-xs font-medium text-slate-500">
            {t('showing') || 'Mostrando'} <span className="font-bold">{startIndex + 1}</span> {t('to') || 'a'} <span className="font-bold">{Math.min(startIndex + itemsPerPage, invoices.length)}</span> {t('of') || 'di'} <span className="font-bold">{invoices.length}</span> {t('results') || 'risultati'}
          </p>
          <div className="flex gap-2">
            <button 
              onClick={handlePrevPage} 
              disabled={currentPage === 1}
              className="px-3 py-1 border border-slate-200 rounded-md bg-white text-slate-600 text-sm font-medium hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <div className="px-3 py-1 bg-slate-200 rounded-md text-slate-700 text-sm font-bold">
              {currentPage} / {totalPages}
            </div>
            <button 
              onClick={handleNextPage} 
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-slate-200 rounded-md bg-white text-slate-600 text-sm font-medium hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- COMPONENTE: MODAL DETTAGLI CON SCHERMO INTERO ---

function InvoiceDetailModal({ invoice, lines, isLoading, onClose, t }: any) {
  // Stato per gestire la larghezza del pannello (Sidebar vs Fullscreen)
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-end z-50">
      <div 
        className={`bg-white h-full flex flex-col shadow-2xl transition-all duration-300 ease-in-out ${
          isFullscreen ? 'w-full' : 'w-full max-w-3xl' // <-- Magia dell'estensione
        } animate-in slide-in-from-right`}
      >
        
        {/* Intestazione Modal */}
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <span className="text-[10px] font-black bg-emerald-100 text-emerald-600 px-2 py-1 rounded uppercase mb-2 inline-block">
              <i className="fas fa-robot mr-1"></i> {t('aiVerified') || 'AI Verified'}
            </span>
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{invoice.supplier}</h3>
            <p className="text-sm font-bold text-slate-400">Doc n° {invoice.invoiceNumber || invoice.fileName}</p>
          </div>
          
          {/* Controlli Header */}
          <div className="flex items-center gap-3">
            {/* Toggle Button Fullscreen */}
            <button 
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-500 font-bold text-xs rounded-xl hover:bg-slate-100 hover:text-indigo-600 transition-all flex items-center gap-2"
              title={isFullscreen ? t('minimizePanel') : t('expandFullscreen')}
            >
              <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
              <span className="hidden sm:inline">{isFullscreen ? t('minimize') : t('fullscreen')}</span>
            </button>

            {/* Pulsante Chiudi */}
            <button 
              onClick={onClose} 
              className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-500 bg-white shadow-sm border border-slate-200 rounded-full transition-all"
            >
              <i className="fas fa-times text-lg"></i>
            </button>
          </div>
        </div>

        {/* Corpo Modal con le righe */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
              <i className="fas fa-circle-notch fa-spin text-4xl text-indigo-300"></i>
              <p className="font-bold uppercase tracking-widest text-xs">{t('extractingDetails') || 'Estrazione dettagli dal database...'}</p>
            </div>
          ) : (
            <div className={`grid gap-4 ${isFullscreen ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {lines.map((line: InvoiceDetailLine) => (
                <div key={line.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 pr-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">{t('originalText') || 'Testo Originale Fornitore'}</p>
                      <p className="text-sm text-slate-700 font-medium">"{line.raw_description}"</p>
                    </div>
                    <div className="text-right pl-4 border-l border-slate-100">
                      <p className="text-[10px] font-bold text-indigo-400 uppercase leading-none mb-1">{t('standardIngredient') || 'Match Database'}</p>
                      <p className="text-sm font-black text-indigo-600 uppercase tracking-tight">{line.standard_ingredients?.name || t('unknown') || 'Sconosciuto'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{t('billed') || 'Quantità & Prezzo'}</p>
                      <p className="text-xs font-bold text-slate-700">{line.quantity} {line.unit} @ €{line.unit_price}</p>
                    </div>
                    <div className="text-right bg-emerald-50/50 rounded-xl p-2 border border-emerald-100/50 group-hover:bg-emerald-50 transition-colors">
                      <p className="text-[10px] font-black text-emerald-600 uppercase mb-0.5">{t('calculatedFoodCost') || 'Costo Pulito Calcolato'}</p>
                      <p className="text-base font-black text-emerald-700">€ {line.calculated_unit_price.toFixed(3)} <span className="text-xs text-emerald-500 font-bold">/ {line.standard_uom}</span></p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer Dettagli */}
        <div className="p-6 bg-white border-t border-slate-200 shrink-0">
          <div className="flex justify-between items-center text-sm">
            <span className="font-bold text-slate-400 uppercase text-xs tracking-widest">{t('totalAudited') || 'Valore Totale Verificato'}</span>
            <span className="text-3xl font-black text-slate-900">€ {invoice.amount.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}