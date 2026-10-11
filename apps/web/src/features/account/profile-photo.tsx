import { Avatar, Button } from '@ari/ui-kit';
import { createSignal, Show } from 'solid-js';
import { useI18n } from '~/i18n/i18n';
import styles from './account.module.scss';
import { AlertIcon, TrashIcon, UploadIcon } from './icons';
import { PhotoDialog } from './photo-dialog';

const photoTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxPhotoBytes = 5 * 1024 * 1024;

/**
 * The profile photo: upload or drop one, adjust it, remove it. The photo stays in the page until
 * ari-api can store it.
 */
export function ProfilePhoto(props: { initial: string }) {
  const { t } = useI18n();
  const [photo, setPhoto] = createSignal<string>();
  const [error, setError] = createSignal<'tooBig' | 'wrongType'>();
  // The picked file, while the dialog adjusts it.
  const [source, setSource] = createSignal<string>();
  const [dragging, setDragging] = createSignal(false);
  let input!: HTMLInputElement;

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (!photoTypes.includes(file.type)) return setError('wrongType');
    if (file.size > maxPhotoBytes) return setError('tooBig');
    setError(undefined);
    setSource(URL.createObjectURL(file));
  };
  const closeDialog = () => {
    const url = source();
    if (url) URL.revokeObjectURL(url);
    setSource(undefined);
  };

  return (
    <section class={styles.card}>
      <h2 class={styles.heading}>{t().account.photo.title}</h2>
      <div class={styles.photo}>
        <button
          type="button"
          class={styles.drop}
          data-dragging={dragging() ? '' : undefined}
          aria-label={photo() ? t().account.photo.change : t().account.photo.upload}
          onClick={() => input.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            pick(event.dataTransfer?.files[0]);
          }}
        >
          <Avatar initial={props.initial} src={photo()} size="xl" class={styles.avatar} />
        </button>
        <div class={styles['photo-side']}>
          <div class={styles.buttons}>
            <Show
              when={photo()}
              fallback={
                <Button variant="primary" icon={<UploadIcon />} onClick={() => input.click()}>
                  {t().account.photo.upload}
                </Button>
              }
            >
              <Button icon={<UploadIcon />} onClick={() => input.click()}>
                {t().account.photo.change}
              </Button>
              <Button variant="ghost" icon={<TrashIcon />} onClick={() => setPhoto(undefined)}>
                {t().account.photo.remove}
              </Button>
            </Show>
          </div>
          <Show
            when={error()}
            fallback={
              <span class={styles.hint}>
                {t().account.photo.hint}
                <Show when={!photo()}> {t().account.photo.dropHint}</Show>
              </span>
            }
          >
            {(key) => (
              <span role="alert" class={styles.error}>
                <AlertIcon />
                {t().account.photo[key()]}
              </span>
            )}
          </Show>
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept={photoTypes.join(',')}
        hidden
        onChange={(event) => {
          pick(event.currentTarget.files?.[0]);
          // Picking the same file again still opens the dialog.
          event.currentTarget.value = '';
        }}
      />
      <PhotoDialog
        source={source()}
        onClose={closeDialog}
        onSave={(url) => {
          setPhoto(url);
          closeDialog();
        }}
      />
    </section>
  );
}
