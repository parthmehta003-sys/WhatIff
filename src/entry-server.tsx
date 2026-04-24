import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import * as HelmetAsync from 'react-helmet-async';
import App from './App';
import './index.css';

// Shim for CommonJS modules that expect 'module' to be defined
if (typeof module === 'undefined') {
  // @ts-ignore
  globalThis.module = { exports: {} };
}

// Handle CommonJS named export issue in SSR
const HelmetProvider = (HelmetAsync as any).HelmetProvider || HelmetAsync.HelmetProvider;

export function render(url: string, helmetContext: any = {}) {
  return renderToString(
    React.createElement(React.StrictMode, null,
      React.createElement(HelmetProvider, { context: helmetContext },
        React.createElement(StaticRouter, { location: url },
          React.createElement(App, null)
        )
      )
    )
  );
}
