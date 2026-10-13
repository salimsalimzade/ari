import '@ari/ui-kit/tokens.css';
import '@ari/ui-kit/base.css';
import { render } from 'solid-js/web';
import { Welcome } from '~/features/welcome/welcome';
import { language, t } from '~/i18n/i18n';

document.documentElement.lang = language;
document.title = t.welcome.pageTitle;
render(() => <Welcome />, document.getElementById('app') as HTMLElement);
