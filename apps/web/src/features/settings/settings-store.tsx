import { ApiError } from '@ari/data-access';
import { createContext, createSignal, type JSX, onCleanup, useContext } from 'solid-js';
import { createStore } from 'solid-js/store';
import { usePageLabel } from '~/features/library/saves';
import { useI18n } from '~/i18n/i18n';
import { type ExportFormat, type ExportPart, exportFile, exportName } from './export-file';
import { loadExport } from './queries';

/** Where the Hive plan stands; a canceled trial or plan lasts until its end date. */
export type PlanState = 'trial' | 'active' | 'failed' | 'trialCanceled' | 'canceled';
export type BillingPeriod = 'monthly' | 'yearly';

/**
 * The design's example account, until ari-api has billing and upload endpoints. Dates are local
 * midnight, so the server and the browser show the same day.
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
};

/** An export: being loaded (how many saves and notes so far), ready to download, or failed. */
export type ExportJob =
  | { status: 'loading'; loaded: number }
  | { status: 'ready'; file: Blob; name: string }
  | { status: 'failed' };

/**
 * The settings sections' state, in the settings layout, so the list of sections on phones can sum
 * each one up. The plan and billing live in the page until ari-api has their endpoints; the export
 * is made in the browser from ari-api's saves and notes.
 */
function createSettings() {
  const [plan, setPlan] = createSignal<PlanState>('trial');
  const [period, setPeriod] = createSignal<BillingPeriod>('monthly');
  const [exportFormat, setExportFormat] = createSignal<ExportFormat>('md');
  const [exportParts, setExportParts] = createStore<Record<ExportPart, boolean>>({
    highlights: true,
    clips: true,
    notes: true,
  });
  const [exportJob, setExportJob] = createSignal<ExportJob>();
  // Each export's number: a reset, a new export or leaving the page leaves the one running behind.
  let exportRun = 0;
  const resetExport = () => {
    exportRun++;
    setExportJob(undefined);
  };
  onCleanup(() => exportRun++);
  const { t } = useI18n();
  const pageLabel = usePageLabel();

  const startExport = async () => {
    const run = ++exportRun;
    const stopped = () => run !== exportRun;
    const exporting = exportFormat();
    setExportJob({ status: 'loading', loaded: 0 });
    try {
      const data = await loadExport(
        { ...exportParts },
        (count) => {
          const job = exportJob();
          if (job?.status === 'loading') setExportJob({ ...job, loaded: job.loaded + count });
        },
        stopped,
      );
      if (!data || stopped()) return;
      const words = {
        ...t().exportData.file,
        untitledNote: t().notes.untitledNote,
        page: pageLabel,
      };
      setExportJob({
        status: 'ready',
        file: exportFile(exporting, data, words),
        name: exportName(exporting),
      });
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      if (!stopped()) setExportJob({ status: 'failed' });
    }
  };

  return {
    plan,
    cancelPlan: () => setPlan(plan() === 'trial' ? 'trialCanceled' : 'canceled'),
    resumePlan: () => setPlan(plan() === 'trialCanceled' ? 'trial' : 'active'),
    period,
    setPeriod,
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
    /** Everything, or nothing when everything was in. */
    toggleAllExportParts: () => {
      resetExport();
      const all = Object.values(exportParts).every(Boolean);
      setExportParts({ highlights: !all, clips: !all, notes: !all });
    },
    exportJob,
    startExport,
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
