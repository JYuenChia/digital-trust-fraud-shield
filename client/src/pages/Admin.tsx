import React from 'react';
import { Building2, PiggyBank, ShieldAlert, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFraudEvents } from '@/contexts/FraudEventsContext';

type HeatCell = {
  count: number;
  blockedAmount: number;
};

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_BUCKETS = [
  { label: '00-06', start: 0, end: 6 },
  { label: '06-12', start: 6, end: 12 },
  { label: '12-18', start: 12, end: 18 },
  { label: '18-24', start: 18, end: 24 },
];

const BLOCKED_LOSS_RECOVERY_RATE = 0.82;
const MANUAL_REVIEW_COST_PER_CASE = 18;

const getWeekdayIndexMondayFirst = (date: Date) => {
  const jsDay = date.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
};

const getTimeBucketIndex = (hour: number) => {
  const idx = TIME_BUCKETS.findIndex((bucket) => hour >= bucket.start && hour < bucket.end);
  return idx === -1 ? TIME_BUCKETS.length - 1 : idx;
};

const getHeatCellTone = (count: number, maxCount: number) => {
  if (maxCount === 0 || count === 0) return 'bg-[#1E293B] border-[#334155]';
  const ratio = count / maxCount;
  if (ratio >= 0.75) return 'bg-[#FF3B30] border-[#FF7F78]';
  if (ratio >= 0.5) return 'bg-[#FF7A1A] border-[#FFA560]';
  if (ratio >= 0.25) return 'bg-[#FFB84D] border-[#FFD284]';
  return 'bg-[#2A3A4A] border-[#455A72]';
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function Admin() {
  const { events } = useFraudEvents();
  const { t } = useLanguage();

  const blockedEvents = events.filter((evt) => evt.status === 'BLOCKED');
  const flaggedEvents = events.filter((evt) => evt.status === 'FLAGGED');

  const preventedLoss = blockedEvents.reduce((sum, evt) => sum + evt.amount, 0) * BLOCKED_LOSS_RECOVERY_RATE;
  const savedOpsCost = (blockedEvents.length + flaggedEvents.length) * MANUAL_REVIEW_COST_PER_CASE;
  const estimatedAgencySavings = preventedLoss + savedOpsCost;

  const heatmap: HeatCell[][] = Array.from({ length: TIME_BUCKETS.length }, () =>
    Array.from({ length: WEEKDAY_LABELS.length }, () => ({ count: 0, blockedAmount: 0 })),
  );

  events.forEach((evt) => {
    if (evt.status === 'APPROVED') return;
    const eventDate = new Date(evt.timestamp);
    const dayIndex = getWeekdayIndexMondayFirst(eventDate);
    const timeIndex = getTimeBucketIndex(eventDate.getHours());
    heatmap[timeIndex][dayIndex].count += 1;
    if (evt.status === 'BLOCKED') {
      heatmap[timeIndex][dayIndex].blockedAmount += evt.amount;
    }
  });

  const maxHeatCount = Math.max(
    0,
    ...heatmap.flat().map((cell) => cell.count),
  );

  const last6Months = Array.from({ length: 6 }, (_, idx) => {
    const dt = new Date();
    dt.setMonth(dt.getMonth() - (5 - idx));
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    const label = dt.toLocaleString('en-MY', { month: 'short' });
    return { key, label, savings: 0 };
  });

  const savingsByMonth = new Map(last6Months.map((m) => [m.key, 0]));

  blockedEvents.forEach((evt) => {
    const dt = new Date(evt.timestamp);
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    if (!savingsByMonth.has(key)) return;
    const next = (savingsByMonth.get(key) ?? 0) + (evt.amount * BLOCKED_LOSS_RECOVERY_RATE) + MANUAL_REVIEW_COST_PER_CASE;
    savingsByMonth.set(key, next);
  });

  const monthlySavings = last6Months.map((m) => ({ ...m, savings: savingsByMonth.get(m.key) ?? 0 }));
  const maxSavings = Math.max(1, ...monthlySavings.map((m) => m.savings));

  return (
    <div className="min-h-screen bg-background text-foreground font-['Inter'] flex flex-col items-center pt-16">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[8%] w-[540px] h-[540px] rounded-full bg-[#F77F00] opacity-10 blur-[140px]" />
        <div className="absolute bottom-[-14%] right-[10%] w-[620px] h-[620px] rounded-full bg-[#0EA5E9] opacity-10 blur-[160px]" />
      </div>

      <div className="w-full max-w-[1444px] relative z-10 px-10 py-10 flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-muted-foreground text-xs tracking-[0.18em] uppercase font-bold shadow-sm">
            <Building2 size={14} />
            {t('admin.badge')}
          </div>
          <h1 className="text-foreground font-['Sora'] text-[34px] leading-tight font-bold">{t('admin.title')}</h1>
          <p className="text-muted-foreground text-base">{t('admin.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="rounded-2xl border border-border bg-card/90 backdrop-blur-md p-5 flex flex-col gap-3 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs uppercase tracking-[0.14em] font-semibold">{t('admin.kpiSavings')}</p>
              <PiggyBank size={18} className="text-[#22C55E]" />
            </div>
            <p className="text-foreground font-['Sora'] text-3xl font-bold">{formatCurrency(estimatedAgencySavings)}</p>
            <p className="text-muted-foreground text-sm leading-6">{t('admin.kpiSavingsDesc')}</p>
          </div>

          <div className="rounded-2xl border border-border bg-card/90 backdrop-blur-md p-5 flex flex-col gap-3 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs uppercase tracking-[0.14em] font-semibold">{t('admin.kpiBlocked')}</p>
              <ShieldAlert size={18} className="text-[#FF7A1A]" />
            </div>
            <p className="text-foreground font-['Sora'] text-3xl font-bold">{blockedEvents.length}</p>
            <p className="text-muted-foreground text-sm leading-6">{t('admin.kpiBlockedDesc')}</p>
          </div>

          <div className="rounded-2xl border border-border bg-card/90 backdrop-blur-md p-5 flex flex-col gap-3 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs uppercase tracking-[0.14em] font-semibold">{t('admin.kpiFlagged')}</p>
              <TrendingUp size={18} className="text-[#38BDF8]" />
            </div>
            <p className="text-foreground font-['Sora'] text-3xl font-bold">{flaggedEvents.length}</p>
            <p className="text-muted-foreground text-sm leading-6">{t('admin.kpiFlaggedDesc')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6">
          <section className="rounded-2xl border border-border bg-card/90 backdrop-blur-md p-6 flex flex-col gap-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-foreground font-['Sora'] text-xl font-semibold">{t('admin.heatmapTitle')}</h2>
              <p className="text-muted-foreground text-sm">{t('admin.heatmapSubtitle')}</p>
            </div>

            <div className="grid grid-cols-[90px_repeat(7,minmax(0,1fr))] gap-2 text-xs">
              <div />
              {WEEKDAY_LABELS.map((day) => (
                <div key={day} className="text-muted-foreground text-center font-semibold">{day}</div>
              ))}

              {TIME_BUCKETS.map((bucket, row) => (
                <React.Fragment key={bucket.label}>
                  <div className="text-muted-foreground flex items-center justify-start font-semibold">{bucket.label}</div>
                  {WEEKDAY_LABELS.map((_, col) => {
                    const cell = heatmap[row][col];
                    const tone = getHeatCellTone(cell.count, maxHeatCount);
                    return (
                      <div
                        key={`${bucket.label}-${col}`}
                        className={`h-16 rounded-lg border p-2 ${tone} flex flex-col justify-between`}
                        title={`${cell.count} incident(s), ${formatCurrency(cell.blockedAmount)} blocked amount`}
                      >
                        <span className="text-white text-sm font-bold leading-none">{cell.count}</span>
                        <span className="text-white/80 text-[10px] leading-tight">{formatCurrency(cell.blockedAmount)}</span>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-semibold">{t('admin.intensity')}</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#2A3A4A]" /> {t('admin.intensityLow')}</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#FFB84D]" /> {t('admin.intensityMedium')}</span>
              <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#FF3B30]" /> {t('admin.intensityHigh')}</span>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-card/90 backdrop-blur-md p-6 flex flex-col gap-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-foreground font-['Sora'] text-xl font-semibold">{t('admin.savingsChartTitle')}</h2>
              <p className="text-muted-foreground text-sm">{t('admin.savingsChartSubtitle')}</p>
            </div>

            <div className="h-[280px] rounded-xl border border-border bg-muted/40 p-4 flex items-end gap-3">
              {monthlySavings.map((month) => (
                <div key={month.key} className="flex-1 min-w-0 h-full flex flex-col items-center justify-end gap-2">
                  <div className="text-[11px] text-muted-foreground">{month.savings > 0 ? formatCurrency(month.savings) : '-'}</div>
                  <div className="w-full h-[180px] flex items-end">
                    <div
                      className="w-full rounded-md bg-gradient-to-t from-[#22C55E] to-[#86EFAC]"
                      style={{ height: `${Math.max(6, (month.savings / maxSavings) * 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground font-semibold">{month.label}</div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground leading-6">
              {t('admin.savingsFormula')}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
