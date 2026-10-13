import { Tag } from '@ari/ui-kit';
import { createSignal, For, Show } from 'solid-js';
import { t } from '~/i18n/i18n';
import { CloseIcon, PlusIcon } from '~/icons';
import styles from './clip.module.scss';

// ari-api's limits for a save's tags.
const maxTags = 10;
const maxLength = 50;

const sameTag = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** A clip's tags: the added ones (click to remove), a few used lately (click to add), and + Tag. */
export function TagsField(props: {
  label: string;
  tags: string[];
  suggestions: string[];
  onChange: (tags: string[]) => void;
}) {
  const [adding, setAdding] = createSignal(false);
  const offered = () =>
    props.suggestions.filter((tag) => !props.tags.some((own) => sameTag(own, tag))).slice(0, 3);
  const full = () => props.tags.length >= maxTags;

  const add = (name: string) => {
    const tag = name.trim().slice(0, maxLength);
    if (tag && !full() && !props.tags.some((own) => sameTag(own, tag))) {
      props.onChange([...props.tags, tag]);
    }
  };
  const remove = (tag: string) => props.onChange(props.tags.filter((own) => own !== tag));

  return (
    <fieldset class={styles.fieldset}>
      <legend class={styles['field-label']}>{props.label}</legend>
      <div class={styles.tags}>
        <For each={props.tags}>
          {(tag) => (
            <Tag tone="sage" icon={<CloseIcon />} onClick={() => remove(tag)}>
              <span class={styles.hidden}>{t.tags.remove} </span>
              {tag}
            </Tag>
          )}
        </For>
        <Show when={!full()}>
          <For each={offered()}>
            {(tag) => (
              <Tag tone="outline" onClick={() => add(tag)}>
                <span class={styles.hidden}>{t.tags.add} </span>
                {tag}
              </Tag>
            )}
          </For>
          <Show
            when={adding()}
            fallback={
              <Tag tone="outline" icon={<PlusIcon />} onClick={() => setAdding(true)}>
                {t.tags.tag}
              </Tag>
            }
          >
            <input
              ref={(input) => requestAnimationFrame(() => input.focus())}
              class={styles['tag-input']}
              data-tag-input=""
              aria-label={t.tags.newTag}
              maxLength={maxLength}
              onKeyDown={(event) => {
                const input = event.currentTarget;
                if (event.key === 'Enter') {
                  event.preventDefault();
                  add(input.value);
                  input.value = '';
                } else if (event.key === 'Escape') {
                  event.stopPropagation();
                  setAdding(false);
                } else if (event.key === 'Backspace' && !input.value && props.tags.length) {
                  remove(props.tags[props.tags.length - 1]);
                }
              }}
              onBlur={(event) => {
                add(event.currentTarget.value);
                setAdding(false);
              }}
            />
          </Show>
        </Show>
      </div>
    </fieldset>
  );
}
