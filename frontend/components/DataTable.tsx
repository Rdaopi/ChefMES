'use client';
import React from 'react';


interface Column<T> {
  key: keyof T | string;
  header: string;
  align?: 'left' | 'right' | 'center';
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyIcon?: string;
  onRowClick?: (row: T) => void;
  keyExtractor: (row: T) => string;
  expandedId?: string | null;
  renderExpanded?: (row: T) => React.ReactNode;
}

export default function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'Nessun dato disponibile.',
  emptyIcon = 'fa-table',
  onRowClick,
  keyExtractor,
  expandedId,
  renderExpanded
}: DataTableProps<T>) {

  return (
    <div className="bg-white shadow-sm rounded-2xl border border-slate-200 overflow-hidden flex flex-col min-h-0">
    <div className="overflow-x-auto overflow-y-auto flex-1">
      <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {columns.map(col => (
                <th
                  key={String(col.key)}
                  className={`px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-wider ${
                    col.align === 'right' ? 'text-right' :
                    col.align === 'center' ? 'text-center' :
                    'text-left'
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-slate-400">
                  <i className="fas fa-spinner fa-spin mr-2"></i> Caricamento...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-16">
                  <i className={`fas ${emptyIcon} text-4xl text-slate-300 mb-3 block`}></i>
                  <p className="text-slate-500 font-medium">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              data.map(row => {
  const rowKey = keyExtractor(row);
  const isExpanded = expandedId === rowKey;
  return (
    <React.Fragment key={rowKey}>
      <tr
        onClick={() => onRowClick?.(row)}
        className={`transition-colors ${
          onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''
        } ${isExpanded ? 'bg-indigo-50/40' : ''} group`}
      >
        {columns.map(col => (
          <td
            key={String(col.key)}
            className={`px-6 py-4 text-sm ${
              col.align === 'right' ? 'text-right' :
              col.align === 'center' ? 'text-center' :
              'text-left'
            }`}
          >
            {col.render
              ? col.render(row)
              : String((row as any)[col.key] ?? '')}
          </td>
        ))}
      </tr>
      {isExpanded && renderExpanded && (
        <tr>
          <td colSpan={columns.length} className="p-0">
            {renderExpanded(row)}
          </td>
        </tr>
      )}
    </React.Fragment>
  );
})
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}