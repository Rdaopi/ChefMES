import Link from 'next/link';

export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col transition-all shrink-0 h-screen">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
            <h1 className="text-2xl font-black text-white tracking-tighter">ChefMes<span className="text-blue-500">.com</span></h1>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-2">
            <Link href="/terminal" className="flex items-center px-4 py-3 hover:bg-slate-800 hover:text-white rounded-xl transition-colors">
                <i className="fas fa-chart-line w-6"></i>
                <span className="font-medium">Trading Terminal</span>
            </Link>
            <Link href="/orders" className="flex items-center px-4 py-3 hover:bg-slate-800 hover:text-white rounded-xl transition-colors">
                <i className="fas fa-shopping-basket w-6"></i>
                <span className="font-medium">Live Orders</span>
            </Link>
            <Link href="/menus" className="flex items-center px-4 py-3 hover:bg-slate-800 hover:text-white rounded-xl transition-colors">
                <i className="fas fa-utensils w-6"></i>
                <span className="font-medium">Menu Engineering</span>
            </Link>
            <Link href="/auditor" className="flex items-center px-4 py-3 hover:bg-slate-800 hover:text-white rounded-xl transition-colors">
                <i className="fas fa-file-invoice-dollar w-6"></i>
                <span className="font-medium">Invoice Auditor</span>
            </Link>
            <Link href="/suppliers" className="flex items-center px-4 py-3 hover:bg-slate-800 hover:text-white rounded-xl transition-colors">
                <i className="fas fa-users w-6"></i>
                <span className="font-medium">Suppliers</span>
            </Link>
        </nav>

        <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3">
                <img src="https://ui-avatars.com/api/?name=F&B+Manager&background=0D8ABC&color=fff" alt="Profile" className="w-10 h-10 rounded-full border-2 border-slate-700" />
                <div className="text-sm">
                    <p className="font-bold text-white">F&B Manager</p>
                    <p className="text-slate-500 text-xs">Hotel Roma (Trento)</p>
                </div>
            </div>
        </div>
    </aside>
  );
}