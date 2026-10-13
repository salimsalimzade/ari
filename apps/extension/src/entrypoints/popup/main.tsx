import '@ari/ui-kit/tokens.css';
import '@ari/ui-kit/base.css';
import { render } from 'solid-js/web';
import { Popup } from '~/features/popup/popup';
import { language } from '~/i18n/i18n';

document.documentElement.lang = language;
render(() => <Popup />, document.getElementById('app') as HTMLElement);
