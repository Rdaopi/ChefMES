'use client';
import { useEffect, useState } from 'react';

interface MenuItem {
  id: string;
  dishName: string;
  category: string;
  productionCost: number;
  sellingPrice: number;
  profitMargin: number;
  status: string;
  trend: string;
}

export default function MenuEngineeringPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    fetch(`${API_URL}/api/menus`)
      .then((res) => res.json())
      .then((data) => {
        setMenuItems(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Connection error:", err);
        setIsLoading(false);
      });
  }, []);

  // Helper per i colori in base alla categoria del menu engineering
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Star': return 'bg-yellow-100 text-yellow-800 border-yellow-300'; // High Profit, High Popularity
      case 'Puzzle': return 'bg-blue-100 text-blue-800 border-blue-300';     // High Profit, Low Popularity
      case 'Plowhorse': return 'bg-purple-100 text-purple-800 border-purple-300'; // Low Profit, High Popularity
      case 'Dog': return 'bg-red-100 text-red-800 border-red-300';           // Low Profit, Low Popularity
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 p-8">
      <header className="mb-8">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Menu Engineering</h2>
        <p className="text-slate-500 text-sm mt-1">Real-time dish profitability based on live food cost</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Avg Food Cost</p>
          <p className="text-2xl font-black text-slate-800">28.4% <span className="text-emerald-500 text-sm ml-2"><i className="fas fa-arrow-down"></i> 1.2%</span></p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Items at Risk</p>
          <p className="text-2xl font-black text-red-600">3</p>
        </div>
      </div>
      
      <div className="bg-white shadow-sm rounded-2xl border border-slate-200 flex flex-col w-full overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">Dish Name</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">Selling Price</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">Live Food Cost</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">Gross Margin</th>
                <th className="px-6 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-wider">Matrix Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400 font-medium"><i className="fas fa-spinner fa-spin mr-2"></i>Calculating live margins...</td></tr>
              ) : menuItems.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-400 font-medium">No menu data available.</td></tr>
              ) : (
                menuItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-5 font-bold text-slate-800">{item.dishName}</td>
                    <td className="px-6 py-5 text-sm text-slate-500">{item.category}</td>
                    <td className="px-6 py-5 text-sm font-medium text-slate-700">€ {item.sellingPrice.toFixed(2)}</td>
                    <td className="px-6 py-5 text-sm font-black text-red-500">€ {item.productionCost.toFixed(2)}</td>
                    <td className="px-6 py-5 text-sm font-black text-emerald-600">€ {item.profitMargin.toFixed(2)}</td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${getStatusBadge(item.status)}`}>
                        {item.status === 'Star' && <i className="fas fa-star mr-1"></i>}
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}