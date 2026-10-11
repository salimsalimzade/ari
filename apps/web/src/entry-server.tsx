// @refresh reload
import { createHandler, StartServer } from '@solidjs/start/server';
import { languageFromCookie } from '~/i18n/i18n';

export default createHandler((event) => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang={languageFromCookie(event.request.headers.get('cookie'))}>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          {assets}
        </head>
        <body>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
));
