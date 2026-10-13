import '@ari/ui-kit/tokens.css';
import '@ari/ui-kit/base.css';
import { render } from 'solid-js/web';
import { SidePanel } from '~/features/side-panel/side-panel';
import { language } from '~/i18n/i18n';

document.documentElement.lang = language;
render(() => <SidePanel />, document.getElementById('app') as HTMLElement);
