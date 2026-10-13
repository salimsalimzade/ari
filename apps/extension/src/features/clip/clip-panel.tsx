import { Button, Logo, SourceAvatar, TextField } from '@ari/ui-kit';
import { createSignal, For, Index, Match, Show, Switch } from 'solid-js';
import { plural, t } from '~/i18n/i18n';
import { CloseIcon } from '~/icons';
import { domainOf } from '../saves/page-url';
import type { Source } from '../saves/store';
import styles from './clip.module.scss';
import { TagsField } from './tags-field';

/** A clip waiting for its details: a table's rows, or a screenshot of a block or a dragged box. */
export type Draft =
  | { kind: 'table'; rows: string[][]; title: string; section?: string }
  | { kind: 'shot'; image: string; title: string; section?: string };

export type ClipDetails = { title: string; comment: string; tags: string[] };

const previewRows = 6;

/** "Clip to Ari", beside the page: what will be saved, its title, comment and tags. */
export function ClipPanel(props: {
  draft: Draft;
  source: Source;
  suggestions: string[];
  onSave: (details: ClipDetails) => void;
  onReselect: () => void;
  onClose: () => void;
}) {
  const [title, setTitle] = createSignal(props.draft.title);
  const [comment, setComment] = createSignal('');
  const [tags, setTags] = createSignal<string[]>([]);
  const save = () => props.onSave({ title: title(), comment: comment(), tags: tags() });

  return (
    <section
      ref={focusFirstField}
      class={styles.panel}
      aria-labelledby="ari-clip-title"
      onKeyDown={(event) => panelKeys(event, save, props.onClose)}
    >
      <PanelHead id="ari-clip-title" title={t.clip.panelTitle} onClose={props.onClose} />
      <Switch>
        <Match when={props.draft.kind === 'table' ? props.draft : undefined}>
          {(table) => <TablePreview rows={table().rows} />}
        </Match>
        <Match when={props.draft.kind === 'shot' ? props.draft : undefined}>
          {(shot) => <img class={styles.shot} src={shot().image} alt="" />}
        </Match>
      </Switch>
      <TextField label={t.clip.title} fill="surface" value={title()} onChange={setTitle} />
      <SourceRow source={props.source} />
      <TextField
        label={t.clip.comment}
        multiline
        fill="surface"
        value={comment()}
        onChange={setComment}
      />
      <TagsField
        label={t.clip.tags}
        tags={tags()}
        suggestions={props.suggestions}
        onChange={setTags}
      />
      <div class={styles.actions}>
        <Button variant="primary" class={styles.grow} onClick={save}>
          {t.clip.saveToAri}
        </Button>
        <Button onClick={() => props.onReselect()}>{t.clip.reselect}</Button>
        <Button variant="ghost" onClick={() => props.onClose()}>
          {t.clip.cancel}
        </Button>
      </div>
    </section>
  );
}

/** The bee, the panel's title and its close button. */
export function PanelHead(props: { id: string; title: string; onClose: () => void }) {
  return (
    <div class={styles['panel-head']}>
      <Logo size={20} />
      <h2 id={props.id} class={styles['panel-title']}>
        {props.title}
      </h2>
      <Button
        iconOnly
        icon={<CloseIcon />}
        aria-label={t.clip.close}
        class={styles.close}
        onClick={() => props.onClose()}
      />
    </div>
  );
}

/** Where the clip comes from: the site's initial, its name and its domain. */
export function SourceRow(props: { source: Source }) {
  return (
    <div class={styles.field}>
      <span class={styles['field-label']}>{t.clip.source}</span>
      <div class={styles.source}>
        <SourceAvatar initial={props.source.siteName.charAt(0).toUpperCase()} />
        <span>
          {props.source.siteName} · {domainOf(props.source.url)}
        </span>
      </div>
    </div>
  );
}

/** Puts the cursor in a panel's first field as it opens, so Enter and Esc reach the panel. */
export function focusFirstField(panel: HTMLElement) {
  requestAnimationFrame(() => panel.querySelector('input')?.focus());
}

/** Enter saves (except in a comment or the new-tag input) and Esc closes, in either panel. */
export function panelKeys(event: KeyboardEvent, save: () => void, close: () => void) {
  if (event.key === 'Escape') {
    close();
  } else if (
    event.key === 'Enter' &&
    !event.shiftKey &&
    !(event.target as Element).closest('textarea, [data-tag-input], button')
  ) {
    event.preventDefault();
    save();
  }
}

function TablePreview(props: { rows: string[][] }) {
  const columns = () => Math.max(1, ...props.rows.map((row) => row.length));
  const grid = () => `minmax(0, 1.7fr) repeat(${columns() - 1}, minmax(0, 1fr))`;
  const hidden = () => props.rows.length - previewRows;
  return (
    <div class={styles.preview}>
      <For each={props.rows.slice(0, previewRows)}>
        {(row, index) => (
          <div
            class={styles['preview-row']}
            data-head={index() === 0 ? '' : undefined}
            style={{ 'grid-template-columns': grid() }}
          >
            <Index each={Array.from({ length: columns() }, (_, i) => row[i] ?? '')}>
              {(cell) => <span>{cell()}</span>}
            </Index>
          </div>
        )}
      </For>
      <Show when={hidden() > 0}>
        <span class={styles['preview-more']}>{plural(hidden(), t.clip.moreRows)}</span>
      </Show>
    </div>
  );
}
