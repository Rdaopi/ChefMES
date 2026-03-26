'use client';
import { useEffect, useState } from 'react';

// TypeScript interfaces
interface Supplier {
  id: string;
  name: string;
  category: string;
  score: number;
  status: 'excellent' | 'warning';
  icon: string;
  insightTitle: string;
  insightDescription: string;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch supplier data from the backend API
  useEffect(() => {
    fetch('http://localhost:8000/api/suppliers')
      .then((res) => res.json())
      .then((data) => {
        setSuppliers(data);
        setIsLoading(false);
      })
      .catch((error) => console.error("Connection error:", error));
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full min-w-0 bg-slate-50">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 shrink-0">
        <h2 className="text-lg font-bold text-slate-800">AI Vendor Management</h2>
      </header>
      
      <main className="flex-1 overflow-y-auto p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {isLoading ? (
            <p className="text-slate-400 font-medium">Loading vendor scores...</p>
          ) : (
            suppliers.map((supplier) => (
              <div 
                key={supplier.id} 
                className={`bg-white p-6 rounded-2xl border shadow-sm relative overflow-hidden transition-transform hover:-translate-y-1 ${
                  supplier.status === 'excellent' ? 'border-slate-200' : 'border-red-200'
                }`}
              >
                {/* Score Badge */}
                <div className={`absolute top-0 right-0 text-white px-3 py-1 rounded-bl-lg font-bold text-sm ${
                  supplier.status === 'excellent' ? 'bg-emerald-500' : 'bg-red-500'
                }`}>
                  Score: {supplier.score}/100
                </div>
                
                {/* Icon */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl mb-4 ${
                  supplier.status === 'excellent' ? 'bg-slate-100 text-slate-600' : 'bg-red-50 text-red-500'
                }`}>
                  <i className={`fas ${supplier.icon}`}></i>
                </div>
                
                {/* Header info */}
                <h3 className="font-bold text-lg text-slate-800">{supplier.name}</h3>
                <p className="text-slate-500 text-sm mb-4">{supplier.category}</p>
                
                {/* AI Insight Box */}
                <div className={`p-3 rounded-lg text-sm ${
                  supplier.status === 'excellent' ? 'bg-slate-50 text-slate-600' : 'bg-red-50 text-red-700'
                }`}>
                  <i className={`fas mr-2 ${
                    supplier.status === 'excellent' ? 'fa-chart-pie text-emerald-500' : 'fa-exclamation-triangle'
                  }`}></i>
                  <strong>{supplier.insightTitle}:</strong> {supplier.insightDescription}
                </div>
              </div>
            ))
          )}

        </div>
      </main>
    </div>
  );
}