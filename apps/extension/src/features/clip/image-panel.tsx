import { Button, TextField } from '@ari/ui-kit';
import { createSignal, For } from 'solid-js';
import { fill, plural, t } from '~/i18n/i18n';
import { CloseIcon, ImageIcon } from '~/icons';
import type { Source } from '../saves/store';
import styles from './clip.module.scss';
import { focusFirstField, PanelHead, panelKeys, SourceRow } from './clip-panel';
import { TagsField } from './tags-field';

export type ImageItem = { src: string; caption: string };

export type ImageDetails = { comments: string[]; tags: string[] };

/** The picked images' details, all optional: a comment for each, tags for all of them. */
export function ImagePanel(props: {
  items: ImageItem[];
  source: Source;
  suggestions: string[];
  onRemove: (index: number) => void;
  onSave: (details: ImageDetails) => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const [comments, setComments] = createSignal<Record<string, string>>({});
  const [tags, setTags] = createSignal<string[]>([]);
  const count = () => props.items.length;
  const tagsLabel = () =>
    count() === 1 ? t.clip.tagsOptional : count() === 2 ? t.clip.tagsBoth : t.clip.tagsAll;
  const save = () =>
    props.onSave({
      comments: props.items.map((item) => comments()[item.src] ?? ''),
      tags: tags(),
    });

  return (
    <section
      ref={focusFirstField}
      class={styles.panel}
      aria-labelledby="ari-images-title"
      onKeyDown={(event) => panelKeys(event, save, props.onClose)}
    >
      <PanelHead
        id="ari-images-title"
        title={plural(count(), t.clip.imagesTitle)}
        onClose={props.onClose}
      />
      <ul class={styles.images}>
        <For each={props.items}>
          {(item, index) => (
            <li class={styles.image}>
              <span class={styles.thumb}>
                <ImageIcon />
                <img src={item.src} alt="" />
              </span>
              <div class={styles['image-body']}>
                <span class={styles.caption}>{item.caption}</span>
                <TextField
                  label={fill(t.clip.commentOn, { caption: item.caption })}
                  hideLabel
                  placeholder={t.clip.addComment}
                  fill="surface"
                  value={comments()[item.src] ?? ''}
                  onChange={(text) => setComments((all) => ({ ...all, [item.src]: text }))}
                />
              </div>
              <Button
                variant="ghost"
                iconOnly
                icon={<CloseIcon />}
                aria-label={fill(t.clip.removeImage, { caption: item.caption })}
                class={styles['image-remove']}
                onClick={() => props.onRemove(index())}
              />
            </li>
          )}
        </For>
      </ul>
      <TagsField
        label={tagsLabel()}
        tags={tags()}
        suggestions={props.suggestions}
        onChange={setTags}
      />
      <SourceRow source={props.source} />
      <div class={styles['image-actions']}>
        <div class={styles.actions}>
          <Button variant="primary" class={styles.grow} onClick={save}>
            {plural(count(), t.clip.saveImagesToAri)}
          </Button>
          <Button onClick={() => props.onBack()}>{t.clip.back}</Button>
        </div>
        <span class={styles.note}>{t.clip.eachImage}</span>
      </div>
    </section>
  );
}
