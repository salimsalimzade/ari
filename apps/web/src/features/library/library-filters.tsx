import { Button, Checkbox, Dialog, type HighlightColor, Popover } from '@ari/ui-kit';
import { createSignal, For, Show } from 'solid-js';
import { fill, useFormat } from '~/i18n/format';
import { useI18n } from '~/i18n/i18n';
import { ChevronDownIcon, CloseIcon, SearchIcon } from './icons';
import styles from './library.module.scss';
import { type Facet, type TypeFilter, useLibrary } from './library-store';

const types: TypeFilter[] = ['all', 'highlight', 'clip', 'import'];
const facets: Facet[] = ['tags', 'colors', 'sources'];

// A value as shown: colors in the current language, tags and sources as the user wrote them.
function useValueName() {
  const { t } = useI18n();
  return (facet: Facet, value: string) =>
    facet === 'colors' ? t().colors.names[value as HighlightColor] : value;
}

/**
 * The type tabs and the tag, color and source filters (a menu on wide screens, a sheet on phones),
 * then the filters in use as chips.
 */
export function LibraryFilters() {
  const { t } = useI18n();
  const format = useFormat();
  const library = useLibrary();
  const valueName = useValueName();
  const [sheet, setSheet] = createSignal<Facet>();

  // "Tag", "Tag: swarm" or "Tag: 2".
  const facetLabel = (facet: Facet) => {
    const values = library.filters[facet];
    if (!values.length) return t().library.facets[facet];
    return fill(t().library.facetValue, {
      facet: t().library.facets[facet],
      value: values.length === 1 ? valueName(facet, values[0]) : values.length,
    });
  };
  const chips = () =>
    facets.flatMap((facet) => library.filters[facet].map((value) => ({ facet, value })));

  return (
    <>
      <div class={styles.filters}>
        <div class={styles.types} role="radiogroup" aria-label={t().library.type}>
          <For each={types}>
            {(type) => (
              <label class={styles.type}>
                <input
                  type="radio"
                  name="library-type"
                  class={styles.radio}
                  checked={library.filters.type === type}
                  onChange={() => library.setType(type)}
                />
                {t().library.types[type]}
                <span class={styles['type-count']}>{format.number(library.counts()[type])}</span>
              </label>
            )}
          </For>
        </div>
        <div class={styles.facets}>
          <For each={facets}>
            {(facet) => (
              <Popover
                label={t().library.facetTitles[facet]}
                placement="bottom-end"
                triggerClass={styles.facet}
                active={library.filters[facet].length > 0}
                class={styles.menu}
                trigger={
                  <>
                    {facetLabel(facet)}
                    <ChevronDownIcon />
                  </>
                }
              >
                <FacetOptions facet={facet} />
              </Popover>
            )}
          </For>
        </div>
        <div class={styles['phone-facets']}>
          <For each={facets}>
            {(facet) => (
              <button
                type="button"
                class={styles.facet}
                data-active={library.filters[facet].length ? '' : undefined}
                aria-haspopup="dialog"
                onClick={() => setSheet(facet)}
              >
                {facetLabel(facet)}
                <ChevronDownIcon />
              </button>
            )}
          </For>
          <Show when={chips().length}>
            <button type="button" class={styles.clear} onClick={library.clearFacets}>
              {t().library.clear}
            </button>
          </Show>
        </div>
      </div>
      <Show when={chips().length}>
        <div class={styles.chips}>
          <For each={chips()}>
            {(chip) => (
              <button
                type="button"
                class={styles.chip}
                aria-label={fill(t().library.removeFilter, {
                  name: valueName(chip.facet, chip.value),
                })}
                onClick={() => library.toggleFacet(chip.facet, chip.value)}
              >
                <Show when={chip.facet === 'colors'}>
                  <span class={styles.swatch} data-color={chip.value} />
                </Show>
                {valueName(chip.facet, chip.value)}
                <CloseIcon />
              </button>
            )}
          </For>
          <button type="button" class={styles.clear} onClick={library.clearFacets}>
            {t().library.clearFilters}
          </button>
        </div>
      </Show>
      <Dialog
        open={sheet() !== undefined}
        onOpenChange={(open) => {
          if (!open) setSheet(undefined);
        }}
        sheet
        title={t().library.facetTitles[sheet() ?? 'tags']}
      >
        <Show when={sheet()}>
          {(facet) => (
            <div class={styles.sheet}>
              <FacetOptions facet={facet()} />
              <Button variant="primary" size="lg" block onClick={() => setSheet(undefined)}>
                {t().library.done}
              </Button>
            </div>
          )}
        </Show>
      </Dialog>
    </>
  );
}

// One facet's values to tick, with how many saves have each. Tags can be searched.
function FacetOptions(props: { facet: Facet }) {
  const { t } = useI18n();
  const format = useFormat();
  const library = useLibrary();
  const valueName = useValueName();
  const [query, setQuery] = createSignal('');
  const options = () => {
    const search = query().trim().toLowerCase();
    return library
      .facetOptions()
      [props.facet].filter(([value]) => !search || value.toLowerCase().includes(search));
  };

  return (
    <div class={styles.options}>
      <Show when={props.facet === 'tags'}>
        <label class={styles.find}>
          <SearchIcon />
          <input
            type="search"
            class={styles['find-input']}
            placeholder={t().library.findTag}
            aria-label={t().library.findTag}
            value={query()}
            onInput={(event) => setQuery(event.currentTarget.value)}
          />
        </label>
      </Show>
      <For each={options()}>
        {([value, count]) => (
          <Checkbox
            class={styles.option}
            checked={library.filters[props.facet].includes(value)}
            onChange={() => library.toggleFacet(props.facet, value)}
          >
            <Show when={props.facet === 'colors'}>
              <span class={styles.swatch} data-color={value} />
            </Show>
            <span class={styles['option-name']}>{valueName(props.facet, value)}</span>
            <span class={styles['option-count']}>{format.number(count)}</span>
          </Checkbox>
        )}
      </For>
    </div>
  );
}
