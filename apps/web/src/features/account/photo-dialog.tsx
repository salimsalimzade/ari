import { Button, Dialog, Slider } from '@ari/ui-kit';
import { createEffect, createSignal, on } from 'solid-js';
import { useI18n } from '~/i18n/i18n';
import styles from './account.module.scss';
import { MinusIcon, PlusIcon } from './icons';

// The circle's share of the square stage, as in the design (a 32px inset on 404px).
const circle = 340 / 404;
const minZoom = 1;
const maxZoom = 3;
// Pixels of the saved square photo.
const outputSize = 512;

type Offset = { x: number; y: number };

export type PhotoDialogProps = {
  /** The picked image (an object URL); the dialog is open while it is set. */
  source?: string;
  onClose: () => void;
  /** Gets the cropped square photo as a data URL. */
  onSave: (url: string) => void;
};

/**
 * "Adjust your photo": the picked image under a round mask. Drag (or the arrow keys) moves it and
 * the slider zooms it; the image always covers the circle.
 */
export function PhotoDialog(props: PhotoDialogProps) {
  const { t } = useI18n();
  const [size, setSize] = createSignal<{ width: number; height: number }>();
  const [zoom, setZoom] = createSignal(minZoom);
  // Where the image's center is, from the stage's center, as a share of the stage's width.
  const [offset, setOffset] = createSignal<Offset>({ x: 0, y: 0 });
  let image!: HTMLImageElement;
  let drag: { x: number; y: number; from: Offset; width: number } | undefined;

  createEffect(
    on(
      () => props.source,
      () => {
        setSize(undefined);
        setZoom(minZoom);
        setOffset({ x: 0, y: 0 });
      },
    ),
  );

  // The image's width and height as shares of the stage: at zoom 1 its short side fills the circle.
  const scaled = () => {
    const natural = size();
    if (!natural) return { width: 0, height: 0 };
    const scale = (circle * zoom()) / Math.min(natural.width, natural.height);
    return { width: natural.width * scale, height: natural.height * scale };
  };
  const clamp = (next: Offset): Offset => {
    const { width, height } = scaled();
    const maxX = Math.max(0, (width - circle) / 2);
    const maxY = Math.max(0, (height - circle) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  };
  const changeZoom = (next: number) => {
    setZoom(Math.min(maxZoom, Math.max(minZoom, next)));
    setOffset(clamp(offset()));
  };

  const save = () => {
    const natural = size();
    if (!natural) return;
    // Stage share per image pixel, then the circle's square in image pixels.
    const scale = scaled().width / natural.width;
    const side = circle / scale;
    const centerX = natural.width / 2 - offset().x / scale;
    const centerY = natural.height / 2 - offset().y / scale;
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    canvas
      .getContext('2d')
      ?.drawImage(
        image,
        centerX - side / 2,
        centerY - side / 2,
        side,
        side,
        0,
        0,
        outputSize,
        outputSize,
      );
    props.onSave(canvas.toDataURL('image/jpeg', 0.9));
  };

  return (
    <Dialog
      open={!!props.source}
      onOpenChange={(open) => !open && props.onClose()}
      title={t().account.photo.adjust}
    >
      <div class={styles.crop}>
        <div
          class={styles.stage}
          tabindex="0"
          role="img"
          aria-label={t().account.photo.dragHint}
          onPointerDown={(event) => {
            drag = {
              x: event.clientX,
              y: event.clientY,
              from: offset(),
              width: event.currentTarget.clientWidth,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!drag) return;
            setOffset(
              clamp({
                x: drag.from.x + (event.clientX - drag.x) / drag.width,
                y: drag.from.y + (event.clientY - drag.y) / drag.width,
              }),
            );
          }}
          onPointerUp={() => {
            drag = undefined;
          }}
          onKeyDown={(event) => {
            const step = 0.02;
            const moves: Record<string, Offset> = {
              ArrowLeft: { x: -step, y: 0 },
              ArrowRight: { x: step, y: 0 },
              ArrowUp: { x: 0, y: -step },
              ArrowDown: { x: 0, y: step },
            };
            const move = moves[event.key];
            if (!move) return;
            event.preventDefault();
            setOffset(clamp({ x: offset().x + move.x, y: offset().y + move.y }));
          }}
        >
          <img
            ref={image}
            class={styles['crop-image']}
            src={props.source}
            alt=""
            draggable={false}
            onLoad={(event) =>
              setSize({
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
              })
            }
            style={{
              width: `${scaled().width * 100}%`,
              height: `${scaled().height * 100}%`,
              left: `${50 + offset().x * 100}%`,
              top: `${50 + offset().y * 100}%`,
            }}
          />
          <span class={styles.mask} />
        </div>
        <Slider
          label={t().account.photo.zoom}
          value={zoom()}
          onChange={changeZoom}
          min={minZoom}
          max={maxZoom}
          step={0.01}
          valueLabel={(value) => `${Math.round(value * 100)}%`}
          start={
            <button
              type="button"
              class={styles['zoom-button']}
              aria-label={t().account.photo.zoomOut}
              onClick={() => changeZoom(zoom() - 0.25)}
            >
              <MinusIcon />
            </button>
          }
          end={
            <button
              type="button"
              class={styles['zoom-button']}
              aria-label={t().account.photo.zoomIn}
              onClick={() => changeZoom(zoom() + 0.25)}
            >
              <PlusIcon />
            </button>
          }
        />
        <p class={styles.hint}>{t().account.photo.dragHint}</p>
        <div class={styles['dialog-actions']}>
          <Button variant="ghost" onClick={() => props.onClose()}>
            {t().account.photo.cancel}
          </Button>
          <Button variant="primary" disabled={!size()} onClick={save}>
            {t().account.photo.save}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
