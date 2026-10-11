import { createSignal, onCleanup, onMount } from 'solid-js';

export type TickerOptions = {
  /** Milliseconds between frames. */
  every: number;
  /** How many frames before it starts over. */
  frames: number;
  /** The frame shown when the visitor prefers reduced motion. */
  still: number;
  /** Runs only while this element is at least 30% on screen, from frame 0 each time it comes back. */
  target?: () => Element | undefined;
};

/**
 * The frame number of a looping demo animation. It starts in the browser only, so the server
 * renders frame 0 (or `still`); returns the frame and a setter for buttons that jump to a frame.
 */
export function createTicker(options: TickerOptions) {
  const [frame, setFrame] = createSignal(0);

  onMount(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setFrame(options.still);
      return;
    }
    let timer: ReturnType<typeof setInterval> | undefined;
    const stop = () => clearInterval(timer);
    const start = () => {
      stop();
      timer = setInterval(() => setFrame((f) => (f + 1) % options.frames), options.every);
    };
    onCleanup(stop);

    const element = options.target?.();
    if (!element) return start();
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return stop();
        setFrame(0);
        start();
      },
      { threshold: 0.3 },
    );
    observer.observe(element);
    onCleanup(() => observer.disconnect());
  });

  return [frame, setFrame] as const;
}
