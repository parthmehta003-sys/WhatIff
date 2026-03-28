import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { StaticRouter } from 'react-router';
import * as HelmetAsync from 'react-helmet-async';
import App from './App';

// Handle CommonJS named export issue in SSR
const HelmetProvider = (HelmetAsync as any).HelmetProvider || HelmetAsync.HelmetProvider;

export function render(url: string, helmetContext: any = {}) {
  return ReactDOMServer.renderToString(
    <React.StrictMode>
      <HelmetProvider context={helmetContext}>
        <StaticRouter location={url}>
          <App />
        </StaticRouter>
      </HelmetProvider>
    </React.StrictMode>
  );
}
