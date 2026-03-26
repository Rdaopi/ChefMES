'use client';
import { useEffect, useState } from 'react';

// TypeScript interfaces
interface Invoice {
  id: string;
  supplier: string;
  amount: number;
  aiVerification: string;
  verificationStatus: 'error' | 'success';
  actionTaken: string;
  actionStatus: 'blocked' | 'cleared';
}

export default function InvoiceAuditorPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch data from the backend API
  useEffect(() => {
    fetch('http://localhost:8000/api/invoices')
      .then((res) => res.json())
      .then((data) => {
        setInvoices(data);
        setIsLoading(false);
      })
      .catch((error) => console.error("Connection error:", error));
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 bg-slate-50">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 shrink-0">
        <h2 className="text-lg font-bold text-slate-800">XML Invoice Auditor (Clawback Engine)</h2>
      </header>
      
      <main className="flex-1 overflow-y-auto p-8">
        <div className="bg-white shadow-sm rounded-2xl border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Invoice ID</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Billed Amount</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">AI Verification</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase tracking-wider">Action Taken</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400 font-medium">Scanning XML invoices...</td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800">
                      <i className="fas fa-file-code text-slate-400 mr-2"></i>{invoice.id}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{invoice.supplier}</td>
                    <td className="px-6 py-4 text-slate-800 font-bold">€ {invoice.amount.toFixed(2)}</td>
                    
                    {/* Dynamic AI Verification Column */}
                    <td className="px-6 py-4">
                      <span className={`font-bold text-sm ${invoice.verificationStatus === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
                        <i className={`fas ${invoice.verificationStatus === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'} mr-1`}></i>
                        {invoice.aiVerification}
                      </span>
                    </td>
                    
                    {/* Dynamic Action Taken Column */}
                    <td className="px-6 py-4">
                      {invoice.actionStatus === 'blocked' ? (
                        <span className="bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg font-medium shadow-sm">
                          <i className="fas fa-ban mr-1"></i>{invoice.actionTaken}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-sm font-medium">
                          <i className="fas fa-check mr-1 text-emerald-500"></i>{invoice.actionTaken}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}