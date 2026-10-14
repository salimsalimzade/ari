import {
  Button,
  Checkbox,
  type HighlightColor,
  highlightColors,
  Tag,
  TextField,
} from '@ari/ui-kit';
import { Title } from '@solidjs/meta';
import { createAsync, revalidate, useAction, useNavigate } from '@solidjs/router';
import { createSignal, For, Match, Show, Switch, startTransition } from 'solid-js';
import { createStore } from 'solid-js/store';
import { BackIcon } from '~/features/shell/icons';
import { MobileHeader } from '~/features/shell/mobile-header';
import { fill, plural, useFormat } from '~/i18n/format';
import { useI18n } from '~/i18n/i18n';
import { CheckIcon, MessageIcon } from './icons';
import { useImportText } from './import-rows';
import type { ImportFile, ImportMark, MarkType } from './imports';
import styles from './imports.module.scss';
import { useLibrary } from './library-store';
import { discardImportAction, getImport, reviewImportAction } from './queries';

const markTypes: MarkType[] = ['highlight', 'underline', 'drawn', 'handwritten', 'strike', 'note'];

/** /imports/:id: the marks Ari found in a file, to tick and save, or a saved file's review. */
export function ImportReview(props: { id: string }) {
  const { t } = useI18n();
  const text = useImportText();
  const found = createAsync(() => getImport(props.id), { deferStream: true });
  const file = () => {
    const item = found();
    return item && item !== 'failed' ? item : undefined;
  };
  const reviewable = () => {
    const item = file();
    return item && (item.status === 'ready' || item.status === 'saved') ? item : undefined;
  };
  return (
    <div class={styles.page}>
      <MobileHeader back={{ href: '/imports', label: t().imports.backToImports }} />
      <Switch
        fallback={
          <div class={styles.missing}>
            <Title>{t().imports.pageTitle}</Title>
            <h1 class={styles['review-title']}>{t().imports.notFound}</h1>
            <Button href="/imports" icon={<BackIcon />}>
              {t().imports.backToImports}
            </Button>
          </div>
        }
      >
        <Match when={found() === 'failed'}>
          <div role="alert" class={styles.missing}>
            <Title>{t().imports.pageTitle}</Title>
            <h1 class={styles['review-title']}>{t().imports.loadFailed}</h1>
            <Button onClick={() => startTransition(() => revalidate(getImport.keyFor(props.id)))}>
              {t().library.retry}
            </Button>
          </div>
        </Match>
        <Match when={reviewable()} keyed>
          {(item) => <Review file={item} />}
        </Match>
        {/* Still being read, or failed: what it is doing. */}
        <Match when={file()}>
          {(item) => (
            <div class={styles.missing}>
              <Title>{t().imports.pageTitle}</Title>
              <h1 class={styles['review-title']}>{item().name}</h1>
              <p>{text.status(item())}</p>
              <Button href="/imports" icon={<BackIcon />}>
                {t().imports.backToImports}
              </Button>
            </div>
          )}
        </Match>
      </Switch>
    </div>
  );
}

function Review(props: { file: ImportFile }) {
  const { t } = useI18n();
  const format = useFormat();
  const library = useLibrary();
  const navigate = useNavigate();
  const review = useAction(reviewImportAction);
  const discard = useAction(discardImportAction);
  const [title, setTitle] = createSignal(props.file.title);
  const [author, setAuthor] = createSignal(props.file.author);
  const [tag, setTag] = createSignal('');
  // Overrides every mark's color when set.
  const [color, setColor] = createSignal<HighlightColor>();
  const [filter, setFilter] = createSignal<'all' | MarkType>('all');
  // The ticks, which stay in the page until the review is saved.
  const [ticks, setTicks] = createStore<Record<string, boolean>>(
    Object.fromEntries((props.file.marks ?? []).map((mark) => [mark.id, mark.on])),
  );
  const [saving, setSaving] = createSignal(false);

  const edit = () => props.file.status === 'saved';
  const marks = () => props.file.marks ?? [];
  const isOn = (mark: ImportMark) => !!ticks[mark.id];
  const shown = () => marks().filter((mark) => filter() === 'all' || mark.type === filter());
  const allOn = () => shown().length > 0 && shown().every(isOn);
  const count = (on: (mark: ImportMark) => boolean) => marks().filter(on).length;
  const typeCount = (type: MarkType) => count((mark) => mark.type === type);
  const mixed = () => markTypes.filter((type) => typeCount(type) > 0).length > 1;
  const adding = () => count((mark) => isOn(mark) && !mark.saved);
  const removing = () => count((mark) => !isOn(mark) && mark.saved);
  const ticked = () => count(isOn);

  const heading = () => {
    const n = marks().length;
    const what = fill(plural(n, mixed() ? t().imports.marks : t().imports.highlights), { n });
    return fill(edit() ? t().imports.editHeading : t().imports.reviewHeading, { count: what });
  };
  const close = () => navigate('/imports');
  const save = async () => {
    setSaving(true);
    try {
      const result = await review(props.file.id, {
        title: title(),
        author: author(),
        tag: tag().trim() || undefined,
        color: color()?.toUpperCase() as Uppercase<HighlightColor> | undefined,
        selectedMarkIds: marks()
          .filter(isOn)
          .map((mark) => mark.id),
      });
      const added = result.added ?? 0;
      if (edit()) {
        library.showToast({
          text: fill(t().imports.updatedToast, { added, removed: result.removed ?? 0 }),
          source: result.sourceId,
        });
        navigate('/imports');
      } else {
        library.showToast({
          text: fill(plural(added, t().imports.savedToast), {
            n: added,
            source: title().trim() || props.file.name,
          }),
          source: result.sourceId,
        });
        navigate('/library');
      }
    } catch {
      library.showToast({ text: t().imports.reviewFailed });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div class={styles.review}>
      <Title>{`${heading()} · Ari`}</Title>
      <div class={styles['review-top']}>
        <Button icon={<BackIcon />} class={styles['wide-only']} onClick={close}>
          {t().imports.backToImports}
        </Button>
        <span class={styles['review-file']}>
          {props.file.name} · {format.fileSize(props.file.megabytes)}
        </span>
      </div>
      <h1 class={styles['review-title']}>{heading()}</h1>
      <Show when={edit()}>
        <div class={styles['review-tags']}>
          <Tag>{fill(t().imports.inLibrary, { n: count((mark) => mark.saved) })}</Tag>
          <Tag tone="neutral">{fill(t().imports.skipped, { n: count((mark) => !mark.saved) })}</Tag>
        </div>
      </Show>
      <div class={styles.fields}>
        <TextField label={t().imports.titleLabel} size="lg" value={title()} onChange={setTitle} />
        <TextField label={t().imports.author} size="lg" value={author()} onChange={setAuthor} />
        <TextField label={t().imports.tagForAll} size="lg" value={tag()} onChange={setTag} />
      </div>
      <Show when={mixed()}>
        <div class={styles['mark-filters']} role="radiogroup" aria-label={t().imports.markTypes}>
          <For each={['all' as const, ...markTypes.filter((type) => typeCount(type) > 0)]}>
            {(type) => (
              <label class={styles['mark-filter']}>
                <input
                  type="radio"
                  name="mark-filter"
                  class={styles.radio}
                  checked={filter() === type}
                  onChange={() => setFilter(type)}
                />
                {t().imports.markFilters[type]}
                <span class={styles['mark-filter-count']}>
                  {type === 'all' ? marks().length : typeCount(type)}
                </span>
              </label>
            )}
          </For>
        </div>
      </Show>
      <div class={styles['review-bar']}>
        <Checkbox
          class={styles['select-all']}
          checked={allOn()}
          onChange={() => {
            const on = !allOn();
            setTicks(Object.fromEntries(shown().map((mark) => [mark.id, on])));
          }}
        >
          {t().imports.selectAll[filter()]}
        </Checkbox>
        <fieldset class={styles['color-all']}>
          <legend class={styles['color-all-label']}>{t().imports.colorForAll}</legend>
          <For each={highlightColors}>
            {(item) => (
              <button
                type="button"
                class={styles['color-all-swatch']}
                data-color={item}
                aria-label={t().colors.names[item]}
                aria-pressed={color() === item}
                onClick={() => setColor(color() === item ? undefined : item)}
              />
            )}
          </For>
        </fieldset>
      </div>
      <div class={styles.marks}>
        <For each={shown()}>
          {(mark) => (
            <MarkRow
              mark={mark}
              on={isOn(mark)}
              color={color() ?? mark.color}
              edit={edit()}
              onToggle={() => setTicks(mark.id, !isOn(mark))}
            />
          )}
        </For>
      </div>
      <div class={styles['review-footer']}>
        <Show when={edit()}>
          <p class={styles['edit-note']}>{t().imports.editNote}</p>
        </Show>
        <span class={styles.selection}>
          {edit()
            ? fill(t().imports.changes, { added: adding(), removed: removing() })
            : fill(t().imports.selected, { n: ticked(), total: marks().length })}
        </span>
        <Show
          when={edit()}
          fallback={
            <Button
              variant="ghost"
              onClick={() => {
                navigate('/imports');
                void discard(props.file.id).catch(() =>
                  library.showToast({ text: t().imports.changeFailed }),
                );
              }}
            >
              {t().imports.discard}
            </Button>
          }
        >
          <Button variant="ghost" class={styles.cancel} onClick={close}>
            {t().imports.cancel}
          </Button>
        </Show>
        <Button
          variant="primary"
          disabled={saving() || (edit() ? adding() + removing() === 0 : ticked() === 0)}
          onClick={save}
        >
          {edit()
            ? t().imports.saveChanges
            : fill(plural(ticked(), t().imports.save), { n: ticked() })}
        </Button>
      </div>
    </div>
  );
}

// One mark to tick: its color, its text as the file showed it, a picture of the spot for a drawn
// or handwritten mark, and its page.
function MarkRow(props: {
  mark: ImportMark;
  on: boolean;
  color: HighlightColor;
  edit: boolean;
  onToggle: () => void;
}) {
  const { t } = useI18n();
  const colored = () => ['highlight', 'underline', 'drawn'].includes(props.mark.type);
  const label = () =>
    props.mark.type === 'highlight' && props.mark.fromColor
      ? fill(t().imports.colorChange, {
          from: t().imports.fileColors[props.mark.fromColor],
          to: t().colors.names[props.color],
        })
      : t().imports.markLabels[props.mark.type];
  const tone = () =>
    props.mark.type === 'drawn' || props.mark.type === 'handwritten'
      ? 'accent'
      : props.mark.type === 'strike' || props.mark.type === 'note'
        ? 'neutral'
        : 'sage';

  return (
    <label class={styles.mark} data-off={props.on ? undefined : ''}>
      <input
        type="checkbox"
        class={styles.radio}
        checked={props.on}
        onChange={() => props.onToggle()}
      />
      <span class={styles.box}>
        <CheckIcon />
      </span>
      <span class={styles.dot} data-color={colored() ? props.color : undefined} />
      <span class={styles['mark-body']}>
        <span class={styles['mark-text']} data-type={props.mark.type}>
          {props.mark.text || t().imports.markLabels[props.mark.type]}
        </span>
        <Show when={props.mark.comment}>
          <span class={styles['mark-comment']}>
            <MessageIcon />
            {props.mark.comment}
          </span>
        </Show>
        <span>
          <Tag tone={tone()}>{label()}</Tag>
        </span>
      </span>
      <Show when={props.mark.imageUrl}>
        {(src) => <img class={styles.picture} src={src()} alt="" loading="lazy" />}
      </Show>
      <Show when={props.edit && props.on !== props.mark.saved}>
        <Tag tone={props.on ? 'sage' : 'accent'}>
          {props.on ? t().imports.adding : t().imports.removing}
        </Tag>
      </Show>
      <Show when={props.mark.page}>
        {(page) => <Tag tone="neutral">{fill(t().library.page, { n: page() })}</Tag>}
      </Show>
    </label>
  );
}
