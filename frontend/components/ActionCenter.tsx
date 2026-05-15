'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useTranslations } from '@/components/LanguageProvider';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Alert {
  id: string;
  type: 'margin' | 'foodcost' | 'price_spike';
  severity: 'critical' | 'warning';
  dishId?: string;
  dishName?: string;
  sellingPrice?: number;
  productionCost?: number;
  currentMetric: number;
  targetMetric: number;
  suggestedPrice?: number;
  mainCostDriver?: string;
  affectedIngredient?: string;
  priceChangePercent?: number;
  affectedDishes?: string[];
}

interface ActionCenterProps {
  onPriceApplied?: () => void;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return { 'Authorization': `Bearer ${session?.access_token}` };
}

function AlertCard({
  alert,
  onApply,
  onDismiss,
  onViewDish,
  applying,
  dismissing,
}: {
  alert: Alert;
  onApply: (alert: Alert) => void;
  onDismiss: (alertId: string) => void;
  onViewDish: (dishId: string) => void;
  applying: boolean;
  dismissing: boolean;
}) {
  const { t } = useTranslations();
  const isCritical = alert.severity === 'critical';

  const borderClass = isCritical
    ? 'border-red-400 bg-red-50'
    : 'border-amber-400 bg-amber-50';

  const icon = isCritical ? 'fa-circle-exclamation' : 'fa-triangle-exclamation';

  return (
    <div className={`border-l-4 rounded-lg p-4 ${borderClass} transition-all duration-300`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <i className={`fas ${icon} mt-0.5 shrink-0 ${isCritical ? 'text-red-500' : 'text-amber-500'}`}></i>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 text-sm">
              {alert.type === 'price_spike' ? alert.affectedIngredient : alert.dishName}
            </p>

            {alert.type === 'margin' && (
              <p className="text-xs text-slate-600 mt-0.5">
                {t('acMarginLabel')} <span className="font-bold text-red-600">{alert.currentMetric}%</span>
                {' '}— {t('acTargetLabel')} <span className="font-semibold">{alert.targetMetric}%</span>
                {' '}| {t('acProductionCost')} <span className="font-mono">€{alert.productionCost?.toFixed(2)}</span>
                {' '}| {t('acCurrentPrice')} <span className="font-mono">€{alert.sellingPrice?.toFixed(2)}</span>
              </p>
            )}

            {alert.type === 'foodcost' && (
              <p className="text-xs text-slate-600 mt-0.5">
                {t('acFoodCostLabel')} <span className="font-bold text-amber-700">{alert.currentMetric}%</span>
                {' '}— {t('acTargetMaxLabel')} <span className="font-semibold">{alert.targetMetric}%</span>
                {alert.mainCostDriver && (
                  <> | {t('acMainDriver')} <span className="font-semibold">{alert.mainCostDriver}</span></>
                )}
              </p>
            )}

            {alert.type === 'price_spike' && (
              <p className="text-xs text-slate-600 mt-0.5">
                {t('acPriceUp')} <span className="font-bold text-amber-700">+{alert.priceChangePercent}%</span>
                {' '}{t('acSinceFirstInvoice')}
                {alert.affectedDishes && alert.affectedDishes.length > 0 && (
                  <> | {t('acAffects')} <span className="font-semibold">{alert.affectedDishes.join(', ')}</span></>
                )}
              </p>
            )}

            {alert.suggestedPrice != null && (
              <p className="text-xs text-slate-500 mt-1">
                {t('acSuggestedPrice')} <span className="font-mono font-bold text-indigo-600">€{alert.suggestedPrice.toFixed(2)}</span>
                <span className="text-slate-400 ml-1">{t('acRoundedNote')}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {alert.suggestedPrice != null && alert.dishId && (
            <button
              type="button"
              onClick={() => onApply(alert)}
              disabled={applying}
              className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {applying ? (
                <><i className="fas fa-spinner fa-spin mr-1"></i>{t('acApplying')}</>
              ) : (
                <>{t('acApplyPrice')} €{alert.suggestedPrice.toFixed(2)}</>
              )}
            </button>
          )}

          {alert.dishId && alert.type !== 'price_spike' && (
            <button
              type="button"
              onClick={() => onViewDish(alert.dishId!)}
              className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              {t('acViewDish')}
            </button>
          )}

          {alert.type === 'price_spike' && (
            <button
              type="button"
              onClick={() => onViewDish(alert.dishId || '')}
              className="px-3 py-1.5 text-xs font-bold bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              {t('acReviewDishes')}
            </button>
          )}

          <button
            type="button"
            onClick={() => onDismiss(alert.id)}
            disabled={dismissing}
            className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
            title="Dismiss"
          >
            <i className="fas fa-xmark text-sm"></i>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ActionCenter({ onPriceApplied }: ActionCenterProps) {
  const router = useRouter();
  const { t } = useTranslations();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const fetchAlerts = async () => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_URL}/api/alerts`, { headers });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data: Alert[] = await res.json();
      setAlerts(data);
      setIsOpen(data.length > 0);
    } catch (err) {
      console.error('Alerts fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, []);

  const handleApply = async (alert: Alert) => {
    if (!alert.dishId || alert.suggestedPrice == null) return;
    setApplyingId(alert.id);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_URL}/api/alerts/apply-price`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ dishId: alert.dishId, newPrice: alert.suggestedPrice }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      // Optimistic: remove both alerts for this dish (margin + foodcost both resolve)
      setAlerts(prev => prev.filter(a => a.dishId !== alert.dishId));
      onPriceApplied?.();
    } catch (err) {
      console.error('Apply price error:', err);
    } finally {
      setApplyingId(null);
    }
  };

  const handleDismiss = async (alertId: string) => {
    setDismissingId(alertId);
    // Optimistic update
    setAlerts(prev => prev.filter(a => a.id !== alertId));
    try {
      const headers = await authHeaders();
      await fetch(`${API_URL}/api/alerts/dismiss`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId }),
      });
    } catch (err) {
      console.error('Dismiss alert error:', err);
    } finally {
      setDismissingId(null);
    }
  };

  const handleViewDish = (dishId: string) => {
    if (dishId) router.push(`/menus/${dishId}`);
    else router.push('/menus');
  };

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const totalCount = alerts.length;

  if (isLoading) {
    return (
      <div className="mb-6 bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-400 italic">
        <i className="fas fa-spinner fa-spin mr-2"></i>{t('checkingAlerts')}
      </div>
    );
  }

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border font-bold text-sm transition-colors ${
          criticalCount > 0
            ? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100'
            : totalCount > 0
            ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
            : 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
        }`}
      >
        <div className="flex items-center gap-2">
          {totalCount === 0 ? (
            <i className="fas fa-circle-check"></i>
          ) : criticalCount > 0 ? (
            <i className="fas fa-circle-exclamation animate-pulse"></i>
          ) : (
            <i className="fas fa-triangle-exclamation"></i>
          )}
          <span>
            {t('actionCenter')}
            {totalCount > 0 && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs border ${
                criticalCount > 0
                  ? 'bg-red-100 text-red-700 border-red-300'
                  : 'bg-amber-100 text-amber-700 border-amber-300'
              }`}>
                {totalCount} {totalCount !== 1 ? t('alertsCount') : t('alertCount')}
                {criticalCount > 0 && ` — ${criticalCount} ${t('criticalSuffix')}`}
              </span>
            )}
          </span>
        </div>
        <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-xs opacity-60`}></i>
      </button>

      {isOpen && (
        <div className="mt-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
          {totalCount === 0 ? (
            <div className="px-5 py-6 flex items-center gap-3 text-emerald-600">
              <i className="fas fa-circle-check text-lg"></i>
              <span className="text-sm font-semibold">{t('allMetricsOk')}</span>
            </div>
          ) : (
            <div className="p-4 flex flex-col gap-3">
              {alerts.map(alert => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onApply={handleApply}
                  onDismiss={handleDismiss}
                  onViewDish={handleViewDish}
                  applying={applyingId === alert.id}
                  dismissing={dismissingId === alert.id}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
