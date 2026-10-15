import { Alert, Button, Checkbox } from '@ari/ui-kit';
import { createAsync } from '@solidjs/router';
import { For, Match, Show, Switch } from 'solid-js';
import { noFilter } from '~/features/library/library-store';
import { getSaveFacets } from '~/features/library/queries';
import { download } from '~/features/notes/note-text';
import { useNotes } from '~/features/notes/notes-store';
import { fill, useFormat } from '~/i18n/format';
import { useI18n } from '~/i18n/i18n';
import type { ExportFormat, ExportPart } from './export-file';
import { DownloadIcon, FileIcon } from './icons';
import styles from './sections.module.scss';
import { useSettings } from './settings-store';

const formats: ExportFormat[] = ['md', 'txt', 'csv', 'json'];
const parts: ExportPart[] = ['highlights', 'clips', 'notes'];

/**
 * Downloading a copy of everything saved, as Markdown, plain text, CSV or JSON. The page loads the
 * saves and notes picked from ari-api and makes the file itself.
 */
export function ExportData() {
  const { t } = useI18n();
  const format = useFormat();
  const settings = useSettings();
  const notesStore = useNotes();
  // The whole Library's counts, which the Library page shares when it has no filter.
  const facets = createAsync(() => getSaveFacets(noFilter), { deferStream: true });
  const counts = (): Record<ExportPart, number> | undefined => {
    const saves = facets()?.counts;
    if (!saves) return;
    return {
      // Imported highlights are highlights too.
      highlights: saves.highlight + saves.import,
      clips: saves.clip,
      notes: notesStore.list().filter((note) => !note.empty).length,
    };
  };
  const picked = (part: ExportPart) => (settings.exportParts[part] ? (counts()?.[part] ?? 0) : 0);
  const saves = () => picked('highlights') + picked('clips');
  const notes = () => picked('notes');
  const exportLabel = () => {
    const values = { saves: format.number(saves()), notes: format.number(notes()) };
    if (saves() && notes()) return fill(t().exportData.exportAll, values);
    if (saves()) return fill(t().exportData.exportSaves, values);
    if (notes()) return fill(t().exportData.exportNotes, values);
    return t().exportData.chooseParts;
  };
  const job = settings.exportJob;
  // Ari's counts may be a little behind, so the bar waits at 99% for the last of it.
  const percent = () => {
    const current = job();
    if (current?.status !== 'loading') return 0;
    return Math.min(99, Math.round((current.loaded / Math.max(1, saves() + notes())) * 100));
  };
  const ready = () => {
    const current = job();
    return current?.status === 'ready' ? current : undefined;
  };

  return (
    <section class={styles.card}>
      <h2 class={styles.heading}>{t().exportData.title}</h2>
      <p class={styles.text}>{t().exportData.intro}</p>
      <span class={styles.overline} id="export-format">
        {t().exportData.format}
      </span>
      <div
        class={styles.choices}
        data-columns="2"
        role="radiogroup"
        aria-labelledby="export-format"
      >
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
        <Checkbox
          class={styles.part}
          checked={parts.every((part) => settings.exportParts[part])}
          onChange={settings.toggleAllExportParts}
        >
          {t().exportData.all}
          <Show when={counts()}>
            {(count) => (
              <span class={styles['part-count']}>
                {format.number(parts.reduce((sum, part) => sum + count()[part], 0))}
              </span>
            )}
          </Show>
        </Checkbox>
        <For each={parts}>
          {(part) => (
            <Checkbox
              class={styles.part}
              checked={settings.exportParts[part]}
              onChange={() => settings.toggleExportPart(part)}
            >
              {t().exportData.parts[part]}
              <Show when={counts()}>
                {(count) => (
                  <span class={styles['part-count']}>{format.number(count()[part])}</span>
                )}
              </Show>
            </Checkbox>
          )}
        </For>
      </div>
      <Switch>
        <Match when={job()?.status === 'loading'}>
          <div class={styles.progress} role="status">
            <div class={styles['progress-head']}>
              <span>{t().exportData.preparing}</span>
              <span>{percent()}%</span>
            </div>
            <span class={styles.meter}>
              <span
                class={styles['meter-fill']}
                data-tone="accent"
                style={{ width: `${percent()}%` }}
              />
            </span>
            <span class={styles.caption}>{t().exportData.stay}</span>
          </div>
        </Match>
        <Match when={ready()}>
          {(file) => (
            <div class={styles.row} data-wrap="" data-tone="done">
              <span class={styles['row-icon']}>
                <FileIcon />
              </span>
              <div class={styles['row-text']}>
                <span class={styles['row-title']} data-truncate="">
                  {file().name}
                </span>
                <span class={styles['row-sub']}>
                  {fill(t().exportData.ready, {
                    size: format.fileSize(file().file.size / 1024 / 1024),
                  })}
                </span>
              </div>
              <Button
                variant="primary"
                icon={<DownloadIcon />}
                onClick={() => download(file().name, file().file)}
              >
                {t().exportData.download}
              </Button>
              <Button variant="ghost" onClick={settings.resetExport}>
                {t().exportData.startOver}
              </Button>
            </div>
          )}
        </Match>
        <Match when={true}>
          <Show when={job()?.status === 'failed'}>
            <Alert>{t().exportData.failed}</Alert>
          </Show>
          <div class={styles.buttons}>
            <Button
              variant="primary"
              icon={<DownloadIcon />}
              disabled={!saves() && !notes()}
              onClick={settings.startExport}
            >
              {job()?.status === 'failed' ? t().exportData.tryAgain : exportLabel()}
            </Button>
          </div>
        </Match>
      </Switch>
    </section>
  );
}
