import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
// Inter, self-hosted and bundled rather than fetched from Google Fonts. Three
// reasons: it stops every page load handing the visitor's IP and User-Agent to
// a third party, it removes an outside origin that could serve arbitrary CSS
// into the page, and it lets the Content-Security-Policy in index.html forbid
// external styles and fonts outright instead of carving out an exception.
// `wght` is the upright variable-weight axis — one file covers 400-700, and
// the browser downloads only the unicode subsets it actually needs.
import '@fontsource-variable/inter/wght.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);

// Register the service worker so the app is installable and works offline.
// Production only — a worker aggressively caching in dev would serve stale
// modules and fight HMR. The path/scope carry the deploy base (`/seans-raw-
// editor/`), so the worker controls exactly the app's own subdirectory.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch(() => {
        // A failed registration just means no offline/install support — the app
        // still runs normally, so there's nothing to surface to the user.
      });
  });
}
