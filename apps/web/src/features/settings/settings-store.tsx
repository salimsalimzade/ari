import type { HighlightColor } from '@ari/ui-kit';
import { createContext, createSignal, type JSX, onCleanup, useContext } from 'solid-js';
import { createStore } from 'solid-js/store';

/** Where the Hive plan stands; a canceled trial or plan lasts until its end date. */
export type PlanState = 'trial' | 'active' | 'failed' | 'trialCanceled' | 'canceled';
export type BillingPeriod = 'monthly' | 'yearly';
export type ExportFormat = 'md' | 'csv' | 'json';
export type ExportPart = 'highlights' | 'clips' | 'imports' | 'notes';

/**
 * The design's example account, until ari-api has billing, upload and export endpoints. Dates are
 * local midnight, so the server and the browser show the same day.
 */
export const sample = {
  trialDays: 14,
  trialDay: 5,
  trialEnds: new Date(2026, 9, 17),
  nextPayment: new Date(2026, 10, 8),
  failedPayment: new Date(2026, 9, 8),
  updateCardBy: new Date(2026, 9, 15),
  card: { last4: '4242', expires: '08/28' },
  invoices: [new Date(2026, 9, 8), new Date(2026, 8, 8)],
  invoiceDollars: 5,
  uploadedMegabytes: 18.4,
  counts: { highlights: 1920, clips: 388, imports: 123, notes: 2 } satisfies Record<
    ExportPart,
    number
  >,
  exportMegabytes: { md: 3.8, csv: 1.2, json: 2.6 } satisfies Record<ExportFormat, number>,
};

/**
 * The settings sections' state. It lives in the page until ari-api has the endpoints, and in the
 * settings layout, so the list of sections on phones can sum each one up.
 */
function createSettings() {
  const [plan, setPlan] = createSignal<PlanState>('trial');
  const [period, setPeriod] = createSignal<BillingPeriod>('monthly');
  const [defaultColor, setDefaultColor] = createSignal<HighlightColor>('yellow');
  const [colorNames, setColorNames] = createStore<Record<HighlightColor, string>>({
    yellow: '',
    green: '',
    blue: '',
    pink: '',
    purple: '',
  });
  const [exportFormat, setExportFormat] = createSignal<ExportFormat>('md');
  const [exportParts, setExportParts] = createStore<Record<ExportPart, boolean>>({
    highlights: true,
    clips: true,
    imports: true,
    notes: true,
  });
  // Percent done; undefined until an export starts.
  const [exportProgress, setExportProgress] = createSignal<number>();
  let exportTimer: ReturnType<typeof setInterval> | undefined;
  const resetExport = () => {
    clearInterval(exportTimer);
    setExportProgress(undefined);
  };
  onCleanup(() => clearInterval(exportTimer));

  return {
    plan,
    cancelPlan: () => setPlan(plan() === 'trial' ? 'trialCanceled' : 'canceled'),
    resumePlan: () => setPlan(plan() === 'trialCanceled' ? 'trial' : 'active'),
    period,
    setPeriod,
    defaultColor,
    setDefaultColor,
    colorNames,
    setColorName: (color: HighlightColor, name: string) => setColorNames(color, name),
    exportFormat,
    setExportFormat: (format: ExportFormat) => {
      resetExport();
      setExportFormat(format);
    },
    exportParts,
    toggleExportPart: (part: ExportPart) => {
      resetExport();
      setExportParts(part, (included) => !included);
    },
    exportProgress,
    // Stands in for ari-api's export: the bar fills in about three seconds.
    startExport: () => {
      resetExport();
      setExportProgress(0);
      exportTimer = setInterval(() => {
        const progress = Math.min((exportProgress() ?? 0) + 8, 100);
        setExportProgress(progress);
        if (progress === 100) clearInterval(exportTimer);
      }, 200);
    },
    resetExport,
  };
}

type Settings = ReturnType<typeof createSettings>;

const SettingsContext = createContext<Settings>();

export function SettingsProvider(props: { children: JSX.Element }) {
  return (
    <SettingsContext.Provider value={createSettings()}>{props.children}</SettingsContext.Provider>
  );
}

export function useSettings() {
  const settings = useContext(SettingsContext);
  if (!settings) throw new Error('useSettings needs a SettingsProvider above it');
  return settings;
}
