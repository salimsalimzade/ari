import '@ari/ui-kit/tokens.css';
import '@ari/ui-kit/base.css';
import { MetaProvider, Title } from '@solidjs/meta';
import { Router } from '@solidjs/router';
import { FileRoutes } from '@solidjs/start/router';
import { Suspense } from 'solid-js';
import { I18nProvider } from '~/i18n/i18n';

export default function App() {
  return (
    <Router
      root={(props) => (
        <I18nProvider>
          <MetaProvider>
            <Title>Ari</Title>
            <Suspense>{props.children}</Suspense>
          </MetaProvider>
        </I18nProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
