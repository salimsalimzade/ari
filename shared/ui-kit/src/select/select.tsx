import { Select as KobalteSelect } from '@kobalte/core/select';
import type { JSX } from 'solid-js';
import styles from './select.module.scss';

export type SelectOption = {
  value: string;
  label: string;
  /** Shown in the trigger on phones instead of the label, e.g. "EN" for "English". */
  shortLabel?: string;
};

export type SelectProps = {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  /** Names the trigger for screen readers, e.g. "Language". */
  label: string;
  /** Shown before the selected label. */
  icon?: JSX.Element;
  /** Fills its container: the label on the left, the arrow on the right. */
  block?: boolean;
  class?: string;
};

/** Pill trigger with a dropdown list of options. */
export function Select(props: SelectProps) {
  const selected = () => props.options.find((option) => option.value === props.value);

  return (
    <KobalteSelect<SelectOption>
      class={props.class}
      options={props.options}
      optionValue="value"
      optionTextValue="label"
      value={selected()}
      onChange={(option) => option && props.onChange(option.value)}
      disallowEmptySelection
      placement={props.block ? 'top-start' : 'bottom-end'}
      sameWidth={props.block}
      gutter={6}
      itemComponent={(item) => (
        <KobalteSelect.Item item={item.item} class={styles.item}>
          <KobalteSelect.ItemLabel>{item.item.rawValue.label}</KobalteSelect.ItemLabel>
          <KobalteSelect.ItemIndicator class={styles.indicator}>
            <svg class={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </KobalteSelect.ItemIndicator>
        </KobalteSelect.Item>
      )}
    >
      <KobalteSelect.Trigger
        class={styles.trigger}
        aria-label={props.label}
        data-block={props.block ? '' : undefined}
      >
        {props.icon}
        <KobalteSelect.Value<SelectOption> class={styles.value}>
          {(state) => (
            <>
              <span class={styles.long}>{state.selectedOption().label}</span>
              <span class={styles.short}>
                {state.selectedOption().shortLabel ?? state.selectedOption().label}
              </span>
            </>
          )}
        </KobalteSelect.Value>
        <KobalteSelect.Icon class={styles.chevron}>
          <svg class={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </KobalteSelect.Icon>
      </KobalteSelect.Trigger>
      <KobalteSelect.Portal>
        <KobalteSelect.Content class={styles.content}>
          <KobalteSelect.Listbox class={styles.listbox} />
        </KobalteSelect.Content>
      </KobalteSelect.Portal>
    </KobalteSelect>
  );
}
