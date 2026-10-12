import {
  Accordion,
  Alert,
  Avatar,
  Button,
  Checkbox,
  ColorPicker,
  DatePicker,
  Dialog,
  Divider,
  dateFormat,
  type HighlightColor,
  HighlightMark,
  highlightColors,
  Logo,
  Menu,
  Popover,
  SegmentedControl,
  Select,
  Slider,
  SourceAvatar,
  Tag,
  TextField,
} from '@ari/ui-kit';
import { Title } from '@solidjs/meta';
import { format } from 'date-fns';
import { az as azDates } from 'date-fns/locale/az';
import { createSignal, For, type JSX } from 'solid-js';
import { az } from '~/i18n/az';
import { en } from '~/i18n/en';
import { languages } from '~/i18n/i18n';
import styles from '~/styles/preview.module.scss';

// /ui-kit: every @ari/ui-kit component and its states, each one on its own.

export default function UiKit() {
  return (
    <div class={styles.app}>
      <Title>Ari UI kit</Title>
      <main class={styles.page}>
        <header class={styles.header}>
          <Logo size={56} />
          <div>
            <h1 class={styles.title}>Ari UI kit</h1>
            <p class={styles.intro}>
              Every component in @ari/ui-kit with its states. Make the window narrower than 720px to
              see the phone layouts.
            </p>
          </div>
        </header>
        <ColorTokens />
        <TypeScale />
        <Buttons />
        <Tags />
        <TextFields />
        <DatePickers />
        <Checkboxes />
        <Selects />
        <AlertAndDivider />
        <Colors />
        <Marks />
        <Identity />
        <People />
        <Choices />
        <Overlays />
      </main>
    </div>
  );
}

function Section(props: { title: string; children: JSX.Element }) {
  return (
    <section class={styles.section}>
      <h2 class={styles['section-title']}>{props.title}</h2>
      {props.children}
    </section>
  );
}

function ColorTokens() {
  const ramps = ['neutral', 'terracotta', 'sage'];
  const steps = [100, 200, 300, 400, 500, 600, 700, 800, 900];
  const semantic = [
    'bg-canvas',
    'bg-surface',
    'bg-raised',
    'bg-sunken',
    'bg-page',
    'text-primary',
    'text-secondary',
    'text-muted',
    'text-link',
    'border',
    'action-primary',
    'action-primary-hover',
    'selected-nav-bg',
    'selected-row-bg',
    'inverse-bg',
    'inverse-action',
    'state-empty-bg',
    'state-error-bg',
    'source-avatar-bg',
    'scrim',
  ];
  return (
    <Section title="Color tokens">
      <For each={ramps}>
        {(ramp) => (
          <div class={styles.stack}>
            <span class={styles.label}>{ramp}</span>
            <div class={styles.ramp}>
              <For each={steps}>
                {(step) => (
                  <div class={styles.swatch}>
                    <span
                      class={styles.chip}
                      style={{ background: `var(--ari-${ramp}-${step})` }}
                    />
                    <span>{step}</span>
                  </div>
                )}
              </For>
            </div>
          </div>
        )}
      </For>
      <div class={styles.stack}>
        <span class={styles.label}>highlight</span>
        <div class={styles.ramp}>
          <For each={highlightColors}>
            {(color) => (
              <div class={styles.swatch}>
                <span class={styles.chip} style={{ background: `var(--ari-hl-${color})` }} />
                <span>{color}</span>
              </div>
            )}
          </For>
        </div>
      </div>
      <div class={styles.stack}>
        <span class={styles.label}>semantic</span>
        <div class={styles.tokens}>
          <For each={semantic}>
            {(name) => (
              <div class={styles.token}>
                <span class={styles.dot} style={{ background: `var(--ari-${name})` }} />
                <code>--ari-{name}</code>
              </div>
            )}
          </For>
        </div>
      </div>
    </Section>
  );
}

function TypeScale() {
  const samples = [
    ['display', 'Keep what you read'],
    ['h1', 'Library'],
    ['h2', 'Sources'],
    ['h3', 'Nothing saved yet'],
    ['h4', 'Clip to Ari'],
    ['button', 'Copy with citation'],
    ['body', 'Search looks in saved text, comments and sources.'],
    ['body-strong', 'Table 1. Sites the scouts reported'],
    ['label', 'Saved quotes'],
    ['caption', 'Meadow Quarterly · Oct 7'],
    ['overline', 'SAVED TEXT'],
    ['quote-reading', 'No single bee compares all of the options.'],
    ['quote-lg', 'The choice emerges from many scouts.'],
    ['quote', 'A scout reports a site with a waggle dance.'],
    ['quote-sm', 'Scouts prefer a cavity of about 40 litres.'],
    ['note', 'Honeybee swarms make careful group decisions.'],
  ];
  return (
    <Section title="Type">
      <div class={styles.panel}>
        <For each={samples}>
          {([name, sample]) => (
            <div class={styles['type-row']}>
              <code class={styles['type-name']}>--ari-type-{name}</code>
              <span style={{ font: `var(--ari-type-${name})` }}>{sample}</span>
            </div>
          )}
        </For>
      </div>
    </Section>
  );
}

function Buttons() {
  return (
    <Section title="Button">
      <div class={styles.panel}>
        <span class={styles.label}>primary / secondary / ghost / danger</span>
        <div class={styles.row}>
          <Button variant="primary" icon={<Icon name="copy" />}>
            Copy with citation
          </Button>
          <Button icon={<Icon name="plus" />}>Add to note</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="danger" icon={<Icon name="trash" />}>
            Delete
          </Button>
          <Button iconAfter={<Icon name="external" />}>Open in Ari</Button>
        </div>
        <span class={styles.label}>Disabled</span>
        <div class={styles.row}>
          <Button variant="primary" disabled>
            Copy with citation
          </Button>
          <Button disabled>Add to note</Button>
          <Button variant="ghost" disabled>
            Cancel
          </Button>
          <Button variant="danger" disabled>
            Delete
          </Button>
        </div>
        <span class={styles.label}>Icon only · large</span>
        <div class={styles.row}>
          <Button iconOnly aria-label="Close" icon={<Icon name="close" />} />
          <Button iconOnly aria-label="Previous" icon={<Icon name="previous" />} />
          <Button iconOnly aria-label="Next" icon={<Icon name="next" />} />
          <Button iconOnly variant="danger" aria-label="Delete" icon={<Icon name="trash" />} />
          <Button variant="primary" size="lg">
            Add to Chrome
          </Button>
          <Button size="lg">Add to Firefox</Button>
        </div>
        <span class={styles.label}>Block</span>
        <div class={styles.narrow}>
          <Button size="lg" block icon={<GoogleIcon />}>
            Continue with Google
          </Button>
        </div>
      </div>
    </Section>
  );
}

function Tags() {
  return (
    <Section title="Tag">
      <div class={styles.panel}>
        <span class={styles.label}>accent / sage / neutral / outline (a button)</span>
        <div class={styles.row}>
          <Tag tone="accent">Highlight</Tag>
          <Tag tone="accent">Clip</Tag>
          <Tag>nest site</Tag>
          <Tag tone="neutral">swarm</Tag>
          <Tag tone="outline" icon={<Icon name="plus" size={12} />} onClick={() => {}}>
            Add tag
          </Tag>
        </div>
      </div>
    </Section>
  );
}

function TextFields() {
  const [title, setTitle] = createSignal('Table 1. Sites the scouts reported');
  return (
    <Section title="TextField">
      <div class={styles.grid}>
        <div class={styles.panel}>
          <span class={styles.label}>md · in panels</span>
          <TextField label="Title" value={title()} onChange={setTitle} />
          <TextField label="Comment" multiline />
          <TextField label="Comment" multiline defaultValue="Key quote for the argument" />
          <TextField label="Title" defaultValue="Can't edit this" disabled />
        </div>
        <div class={styles.panel}>
          <span class={styles.label}>lg · log in and sign up, on surface</span>
          <TextField
            label="Email"
            type="email"
            size="lg"
            fill="surface"
            placeholder="you@example.com"
          />
          <TextField
            label="Password"
            type="password"
            size="lg"
            fill="surface"
            labelAction={<a href="#forgot">Forgot password?</a>}
          />
          <TextField
            label="Password"
            type="password"
            size="lg"
            fill="surface"
            description="At least 8 characters"
          />
        </div>
        <div class={styles.panel}>
          <span class={styles.label}>xl · phones · errors</span>
          <TextField
            label="Username"
            size="xl"
            fill="surface"
            defaultValue="salim"
            error="That username is taken."
          />
          <TextField label="Age" type="number" size="xl" fill="surface" error="Enter your age." />
        </div>
      </div>
    </Section>
  );
}

function DatePickers() {
  const [date, setDate] = createSignal('');
  const [birthDate, setBirthDate] = createSignal('12.05.1995');
  return (
    <Section title="DatePicker">
      <div class={styles.grid}>
        <div class={styles.panel}>
          <span class={styles.label}>md · empty / chosen</span>
          <DatePicker
            label="Date"
            labels={en.datePicker}
            placeholder="DD.MM.YYYY"
            value={date()}
            onChange={setDate}
          />
          <DatePicker
            label="Date of birth"
            labels={en.datePicker}
            max={format(new Date(), dateFormat)}
            value={birthDate()}
            onChange={setBirthDate}
          />
        </div>
        <div class={styles.panel}>
          <span class={styles.label}>lg · Azerbaijani · error · disabled</span>
          <DatePicker
            label="Doğum tarixi"
            size="lg"
            fill="surface"
            locale={azDates}
            labels={az.datePicker}
            value={birthDate()}
            onChange={setBirthDate}
          />
          <DatePicker
            label="Date of birth"
            labels={en.datePicker}
            size="lg"
            fill="surface"
            placeholder="DD.MM.YYYY"
            value=""
            onChange={() => {}}
            error="Choose your date of birth."
          />
          <DatePicker
            label="Date"
            labels={en.datePicker}
            size="lg"
            fill="surface"
            value="08.10.2026"
            onChange={() => {}}
            disabled
          />
        </div>
      </div>
    </Section>
  );
}

function Checkboxes() {
  return (
    <Section title="Checkbox">
      <div class={styles.panel}>
        <span class={styles.label}>default / checked / error / disabled</span>
        <Checkbox>
          I agree to Ari’s <a href="#terms">Terms of Service</a> and{' '}
          <a href="#privacy">Privacy Policy</a>.
        </Checkbox>
        <Checkbox defaultChecked>Remember me</Checkbox>
        <Checkbox error="Agree to the terms to create an account.">
          I agree to Ari’s <a href="#terms">Terms of Service</a>.
        </Checkbox>
        <Checkbox disabled>Disabled</Checkbox>
      </div>
    </Section>
  );
}

function Selects() {
  const [language, setLanguage] = createSignal('en');

  return (
    <Section title="Select">
      <div class={styles.panel}>
        <span class={styles.label}>label / short label on phones</span>
        <div class={styles.row}>
          <Select
            label="Language"
            icon={<Icon name="globe" />}
            options={languages}
            value={language()}
            onChange={setLanguage}
          />
        </div>
      </div>
    </Section>
  );
}

function AlertAndDivider() {
  return (
    <Section title="Alert · Divider">
      <div class={styles.grid}>
        <div class={styles.panel}>
          <span class={styles.label}>Alert · form-level error</span>
          <Alert>
            That email and password don’t match. Try again or{' '}
            <a href="#forgot">reset your password</a>.
          </Alert>
        </div>
        <div class={styles.panel}>
          <span class={styles.label}>Divider · with text / plain</span>
          <Divider>or</Divider>
          <Divider />
        </div>
      </div>
    </Section>
  );
}

function Colors() {
  const [color, setColor] = createSignal<HighlightColor>('pink');
  return (
    <Section title="ColorPicker">
      <div class={styles.panel}>
        <span class={styles.label}>md / sm (arrow keys move)</span>
        <ColorPicker value={color()} onChange={setColor} />
        <ColorPicker size="sm" value={color()} onChange={setColor} />
      </div>
    </Section>
  );
}

function Marks() {
  return (
    <Section title="HighlightMark">
      <div class={styles.panel}>
        <span class={styles.label}>fill / marker</span>
        <For each={highlightColors}>
          {(color) => (
            <p class={styles.quote}>
              <HighlightMark color={color}>A scout reports a site</HighlightMark>{' '}
              <HighlightMark color={color} markStyle="marker">
                with a waggle dance.
              </HighlightMark>
            </p>
          )}
        </For>
      </div>
    </Section>
  );
}

function Choices() {
  const [period, setPeriod] = createSignal('monthly');
  const [keyboard, setKeyboard] = createSignal('mac');
  return (
    <Section title="SegmentedControl · Accordion">
      <div class={styles.grid}>
        <div class={styles.panel}>
          <span class={styles.label}>SegmentedControl · arrow keys move · badge · sm</span>
          <SegmentedControl
            label="Billing period"
            value={period()}
            onChange={setPeriod}
            options={[
              { value: 'monthly', label: 'Monthly' },
              { value: 'yearly', label: 'Yearly', badge: 'Save 20%' },
            ]}
          />
          <SegmentedControl
            label="Keyboard"
            size="sm"
            value={keyboard()}
            onChange={setKeyboard}
            options={[
              { value: 'mac', label: 'Mac' },
              { value: 'windows', label: 'Windows' },
            ]}
          />
        </div>
        <div class={styles.panel}>
          <span class={styles.label}>Accordion · “+” wide, arrow on phones</span>
          <Accordion
            defaultValue="cancel"
            items={[
              {
                value: 'cancel',
                title: 'How do I cancel?',
                content: 'From Settings › Plan and billing.',
              },
              {
                value: 'free',
                title: 'Is there a free plan?',
                content: 'There’s a 14-day free trial.',
              },
            ]}
          />
        </div>
      </div>
    </Section>
  );
}

function People() {
  const [zoom, setZoom] = createSignal(1.4);
  return (
    <Section title="Avatar · Slider">
      <div class={styles.grid}>
        <div class={styles.panel}>
          <span class={styles.label}>Avatar · sm / md / lg / xl, letter or photo</span>
          <div class={styles.row}>
            <Avatar initial="S" />
            <Avatar initial="S" size="md" />
            <Avatar initial="S" size="lg" />
            <Avatar initial="S" size="xl" />
            <Avatar initial="S" size="xl" src="/favicon.svg" />
          </div>
        </div>
        <div class={styles.panel}>
          <span class={styles.label}>Slider · arrow keys move it</span>
          <Slider
            label="Zoom"
            value={zoom()}
            onChange={setZoom}
            min={1}
            max={3}
            step={0.01}
            valueLabel={(value) => `${Math.round(value * 100)}%`}
          />
        </div>
      </div>
    </Section>
  );
}

function Identity() {
  return (
    <Section title="SourceAvatar · Logo">
      <div class={styles.grid}>
        <div class={styles.panel}>
          <span class={styles.label}>SourceAvatar · sm / md / lg / xl</span>
          <div class={styles.row}>
            <SourceAvatar initial="M" size="sm" />
            <SourceAvatar initial="M" />
            <SourceAvatar initial="P" size="lg" />
            <SourceAvatar initial="M" size="xl" />
          </div>
        </div>
        <div class={styles.panel}>
          <span class={styles.label}>Logo · mark / md / lg</span>
          <div class={styles.row}>
            <Logo size={20} />
            <Logo wordmark="md" />
            <Logo wordmark="lg" />
          </div>
        </div>
      </div>
    </Section>
  );
}

function Overlays() {
  const [open, setOpen] = createSignal(false);
  const [confirmOpen, setConfirmOpen] = createSignal(false);
  const [sheetOpen, setSheetOpen] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);
  // Stands in for a real request: the dialog closes once the action finishes.
  const deleteHighlight = () => {
    setDeleting(true);
    setTimeout(() => {
      setDeleting(false);
      setConfirmOpen(false);
    }, 1000);
  };
  return (
    <Section title="Dialog · Popover · Menu">
      <div class={styles.row}>
        <Popover
          label="Tags"
          triggerClass={styles['popover-trigger']}
          trigger={<>Tag ▾</>}
          class={styles.popover}
        >
          <Checkbox defaultChecked>swarm</Checkbox>
          <Checkbox>scouts</Checkbox>
        </Popover>
        <Menu
          placement="bottom-start"
          trigger={(triggerProps: object) => (
            <Button {...triggerProps} icon={<Icon name="plus" />}>
              Note actions ▾
            </Button>
          )}
          groups={[
            [{ label: 'Add quote', icon: <Icon name="notes" />, hint: '/', onSelect: () => {} }],
            [{ label: 'Copy as text', icon: <Icon name="copy" />, onSelect: () => {} }],
            [
              {
                label: 'Delete note',
                icon: <Icon name="trash" />,
                danger: true,
                onSelect: () => {},
              },
            ],
          ]}
        />
        <Button onClick={() => setOpen(true)}>Dismissible</Button>
        <Button onClick={() => setSheetOpen(true)}>Sheet on phones</Button>
        <Button variant="danger" icon={<Icon name="trash" />} onClick={() => setConfirmOpen(true)}>
          Delete highlight
        </Button>
      </div>
      <Dialog
        open={open()}
        onOpenChange={setOpen}
        title="Highlight saved"
        description="Close it with the X, Escape or a click outside."
      />
      <Dialog
        open={sheetOpen()}
        onOpenChange={setSheetOpen}
        sheet
        title="Cancel your trial?"
        description="On phones it rises from the bottom edge; wider, it sits in the middle."
      />
      <Dialog
        open={confirmOpen()}
        onOpenChange={setConfirmOpen}
        dismissible={false}
        title="Delete this highlight?"
        description="It's removed from your library and from any note that quotes it. Only these buttons close it."
      >
        <div class={styles['dialog-actions']}>
          <Button variant="ghost" disabled={deleting()} onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" disabled={deleting()} onClick={deleteHighlight}>
            {deleting() ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </Dialog>
    </Section>
  );
}

// Lucide icons for this preview, as path data (24px grid, drawn with strokes).
const icons = {
  library: 'm16 6 4 14M12 6v14M8 8v12M4 4v16',
  notes:
    'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7ZM14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8',
  globe:
    'M2 12a10 10 0 1 0 20 0a10 10 0 1 0-20 0M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20',
  settings: 'M20 7h-9M14 17H5M14 17a3 3 0 1 0 6 0a3 3 0 1 0-6 0M4 7a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
  plus: 'M5 12h14M12 5v14',
  copy: 'M10 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2zM4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2',
  trash: 'M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2',
  external: 'M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
  close: 'M18 6 6 18M6 6l12 12',
  undo: 'M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  previous: 'm15 18-6-6 6-6',
  next: 'm9 18 6-6-6-6',
};

function Icon(props: { name: keyof typeof icons; size?: number }) {
  return (
    <svg
      width={props.size ?? 15}
      height={props.size ?? 15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d={icons[props.name]} />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"
      />
    </svg>
  );
}
