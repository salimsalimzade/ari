import { Button, Checkbox } from '@ari/ui-kit';
import { format as formatDate } from 'date-fns';
import { For, Match, Switch } from 'solid-js';
import { fill, useFormat } from '~/i18n/format';
import { useI18n } from '~/i18n/i18n';
import { DownloadIcon, FileIcon } from './icons';
import styles from './sections.module.scss';
import { type ExportFormat, type ExportPart, sample, useSettings } from './settings-store';

const formats: ExportFormat[] = ['md', 'csv', 'json'];
const parts: ExportPart[] = ['highlights', 'clips', 'imports', 'notes'];
const extensions: Record<ExportFormat, string> = { md: '.zip', csv: '.csv', json: '.json' };

/**
 * Downloading a copy of everything saved, as Markdown, CSV or JSON. Until ari-api can build the
 * file, the export only shows its progress and the file it would make.
 */
export function ExportData() {
  const { t } = useI18n();
  const format = useFormat();
  const settings = useSettings();
  const saves = () =>
    parts
      .filter((part) => part !== 'notes' && settings.exportParts[part])
      .reduce((total, part) => total + sample.counts[part], 0);
  const notes = () => (settings.exportParts.notes ? sample.counts.notes : 0);
  const exportLabel = () => {
    const values = { saves: format.number(saves()), notes: format.number(notes()) };
    if (saves() && notes()) return fill(t().exportData.exportAll, values);
    if (saves()) return fill(t().exportData.exportSaves, values);
    if (notes()) return fill(t().exportData.exportNotes, values);
    return t().exportData.chooseParts;
  };

  return (
    <section class={styles.card}>
      <h2 class={styles.heading}>{t().exportData.title}</h2>
      <p class={styles.text}>{t().exportData.intro}</p>
      <span class={styles.overline} id="export-format">
        {t().exportData.format}
      </span>
      <div class={styles.choices} role="radiogroup" aria-labelledby="export-format">
        <For each={formats}>
          {(id) => (
            <label class={styles.choice}>
              <input
                type="radio"
                name="export-format"
                class={styles.radio}
                checked={settings.exportFormat() === id}
                onChange={() => settings.setExportFormat(id)}
              />
              <span class={styles.dot} />
              <span class={styles['choice-text']}>
                <span class={styles['choice-label']}>{t().exportData.formats[id].label}</span>
                <span class={styles['choice-description']}>{t().exportData.formats[id].text}</span>
              </span>
            </label>
          )}
        </For>
      </div>
      <span class={styles.overline}>{t().exportData.include}</span>
      <div class={styles.parts}>
        <For each={parts}>
          {(part) => (
            <Checkbox
              class={styles.part}
              checked={settings.exportParts[part]}
              onChange={() => settings.toggleExportPart(part)}
            >
              {t().exportData.parts[part]}
              <span class={styles['part-count']}>{format.number(sample.counts[part])}</span>
            </Checkbox>
          )}
        </For>
      </div>
      <Switch>
        <Match when={settings.exportProgress() === undefined}>
          <div class={styles.buttons}>
            <Button
              variant="primary"
              icon={<DownloadIcon />}
              disabled={!saves() && !notes()}
              onClick={settings.startExport}
            >
              {exportLabel()}
            </Button>
          </div>
        </Match>
        <Match when={(settings.exportProgress() ?? 0) < 100}>
          <div class={styles.progress} role="status">
            <div class={styles['progress-head']}>
              <span>{t().exportData.preparing}</span>
              <span>{Math.round(settings.exportProgress() ?? 0)}%</span>
            </div>
            <span class={styles.meter}>
              <span
                class={styles['meter-fill']}
                data-tone="accent"
                style={{ width: `${settings.exportProgress()}%` }}
              />
            </span>
            <span class={styles.caption}>{t().exportData.leave}</span>
          </div>
        </Match>
        <Match when={settings.exportProgress() === 100}>
          <div class={styles.row} data-wrap="" data-tone="done">
            <span class={styles['row-icon']}>
              <FileIcon />
            </span>
            <div class={styles['row-text']}>
              <span class={styles['row-title']} data-truncate="">
                ari-export-{formatDate(new Date(), 'yyyy-MM-dd')}
                {extensions[settings.exportFormat()]}
              </span>
              <span class={styles['row-sub']}>
                {fill(t().exportData.ready, {
                  size: format.size(sample.exportMegabytes[settings.exportFormat()]),
                })}
              </span>
            </div>
            {/* Downloading the file comes with ari-api's export endpoint. */}
            <Button variant="primary" icon={<DownloadIcon />}>
              {t().exportData.download}
            </Button>
            <Button variant="ghost" onClick={settings.resetExport}>
              {t().exportData.startOver}
            </Button>
          </div>
        </Match>
      </Switch>
    </section>
  );
}
