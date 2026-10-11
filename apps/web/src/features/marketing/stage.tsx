import { createSignal, type JSX, onCleanup, onMount } from 'solid-js';
import styles from './stage.module.scss';

export type StageProps = {
  /** The demo's size in the design; it is drawn at this size and scaled down to fit. */
  width: number;
  height: number;
  class?: string;
  children: JSX.Element;
};

/**
 * Holds a demo whose parts sit at fixed positions (they animate between them), and shrinks it as a
 * whole when its column is narrower than the design.
 */
export function Stage(props: StageProps) {
  const [scale, setScale] = createSignal(1);
  let box!: HTMLDivElement;

  onMount(() => {
    const observer = new ResizeObserver(([entry]) =>
      setScale(Math.min(1, entry.contentRect.width / props.width)),
    );
    observer.observe(box);
    onCleanup(() => observer.disconnect());
  });

  return (
    <div
      ref={box}
      class={props.class ? `${styles.stage} ${props.class}` : styles.stage}
      style={{ 'max-width': `${props.width}px`, height: `${props.height * scale()}px` }}
    >
      <div
        class={styles.inner}
        style={{
          width: `${props.width}px`,
          height: `${props.height}px`,
          transform: `scale(${scale()})`,
        }}
      >
        {props.children}
      </div>
    </div>
  );
}
