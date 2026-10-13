import { ApiError } from '@ari/data-access';
import { Avatar, Button } from '@ari/ui-kit';
import { useAction } from '@solidjs/router';
import { createEffect, createSignal, on, onCleanup, Show } from 'solid-js';
import { useI18n } from '~/i18n/i18n';
import styles from './account.module.scss';
import { AlertIcon, TrashIcon, UploadIcon } from './icons';
import { PhotoDialog } from './photo-dialog';
import { changePhotoAction, removePhotoAction } from './queries';

const photoTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxPhotoBytes = 5 * 1024 * 1024;

type PhotoError = 'tooBig' | 'wrongType' | 'uploadFailed' | 'networkError';

const errorOf = (error: unknown): PhotoError => {
  if (error instanceof ApiError) {
    if (error.code === 'FILE_TOO_LARGE') return 'tooBig';
    if (error.code === 'INVALID_PHOTO') return 'wrongType';
    if (error.status === 0) return 'networkError';
  }
  return 'uploadFailed';
};

/**
 * The profile photo: upload or drop one, adjust it in the dialog, remove it. ari-api stores it and
 * `photoUrl` shows it; the cropped photo shows at once while it uploads.
 */
export function ProfilePhoto(props: { initial: string; photoUrl?: string }) {
  const { t } = useI18n();
  const upload = useAction(changePhotoAction);
  const remove = useAction(removePhotoAction);
  // The cropped photo while it uploads, until ari-api's link to it arrives.
  const [preview, setPreview] = createSignal<string>();
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<PhotoError>();
  // The picked file, while the dialog adjusts it.
  const [source, setSource] = createSignal<string>();
  const [dragging, setDragging] = createSignal(false);
  let input!: HTMLInputElement;

  const photo = () => preview() ?? props.photoUrl;
  const clearPreview = () => {
    const url = preview();
    if (url) URL.revokeObjectURL(url);
    setPreview(undefined);
  };
  // A new link from /me means the upload is in; the preview can go.
  createEffect(on(() => props.photoUrl, clearPreview, { defer: true }));
  onCleanup(clearPreview);

  const pick = (file: File | undefined) => {
    if (!file || busy()) return;
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
  // One request at a time; a failed one shows its reason and drops the preview.
  const run = async (request: () => Promise<unknown>) => {
    setBusy(true);
    setError(undefined);
    try {
      await request();
    } catch (failure) {
      setError(errorOf(failure));
      clearPreview();
    } finally {
      setBusy(false);
    }
  };
  const errorText = (key: PhotoError) =>
    key === 'networkError' ? t().auth.errors.networkError : t().account.photo[key];

  return (
    <section class={styles.card}>
      <h2 class={styles.heading}>{t().account.photo.title}</h2>
      <div class={styles.photo}>
        <button
          type="button"
          class={styles.drop}
          data-dragging={dragging() ? '' : undefined}
          aria-busy={busy()}
          aria-label={photo() ? t().account.photo.change : t().account.photo.upload}
          onClick={() => !busy() && input.click()}
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
                <Button
                  variant="primary"
                  icon={<UploadIcon />}
                  disabled={busy()}
                  onClick={() => input.click()}
                >
                  {t().account.photo.upload}
                </Button>
              }
            >
              <Button icon={<UploadIcon />} disabled={busy()} onClick={() => input.click()}>
                {t().account.photo.change}
              </Button>
              <Button
                variant="ghost"
                icon={<TrashIcon />}
                disabled={busy()}
                onClick={() => run(() => remove())}
              >
                {t().account.photo.remove}
              </Button>
            </Show>
          </div>
          <Show
            when={error()}
            fallback={
              <span class={styles.hint} role="status">
                <Show when={busy()} fallback={t().account.photo.hint}>
                  {t().account.photo.uploading}
                </Show>
                <Show when={!busy() && !photo()}> {t().account.photo.dropHint}</Show>
              </span>
            }
          >
            {(key) => (
              <span role="alert" class={styles.error}>
                <AlertIcon />
                {errorText(key())}
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
        onSave={(cropped) => {
          closeDialog();
          clearPreview();
          setPreview(URL.createObjectURL(cropped));
          run(() => upload(cropped));
        }}
      />
    </section>
  );
}
