import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// Handle unhandled errors and promise rejections gracefully without triggering sudden screen reload
const handleModuleError = (errorMsg: string) => {
  const normalized = errorMsg.toLowerCase();
  if (
    normalized.includes("importing a module script failed") ||
    normalized.includes("failed to fetch dynamically imported module") ||
    normalized.includes("chunkloaderror")
  ) {
    console.warn("Dynamic module/chunk loading warning (auto-reload disabled to protect user state):", errorMsg);
  }
};

window.onerror = function (message, source, lineno, colno, error) {
  const msgStr = String(message || "");
  handleModuleError(msgStr);
  if (error && error.message) {
    handleModuleError(error.message);
  }

  if (!error || msgStr === "Script error." || msgStr.toLowerCase().includes("script error")) {
    // Return true to prevent the browser from firing the default error handler
    // and stop the error from bubbling out of the iframe
    return true;
  }
  return false;
};

window.addEventListener('error', (event) => {
  const msgStr = String(event.message || event.filename || "");
  handleModuleError(msgStr);
  if (event.error && event.error.message) {
    handleModuleError(event.error.message);
  }
  
  // Also check if a script or link element failed to load (network asset loading error)
  if (event.target && (event.target instanceof HTMLScriptElement || event.target instanceof HTMLLinkElement)) {
    const src = (event.target as any).src || (event.target as any).href || "";
    if (src.includes(".js") || src.includes(".css")) {
      handleModuleError("Module script loading failed from target: " + src);
    }
  }

  if (!event.error || msgStr === 'Script error.' || msgStr.toLowerCase().includes('script error') || !event.filename) {
    event.preventDefault();
    if (event.stopImmediatePropagation) {
      event.stopImmediatePropagation();
    }
    return;
  }
  console.warn('Captured window error:', event.error || event.message);
}, true);

window.addEventListener('unhandledrejection', (event) => {
  const reasonStr = String(event.reason?.message || event.reason || "");
  handleModuleError(reasonStr);

  if (event.preventDefault) {
    event.preventDefault();
  }
  if (event.stopImmediatePropagation) {
    event.stopImmediatePropagation();
  }
  console.warn('Captured unhandled promise rejection:', event.reason);
});

// Register Service Worker for Offline-First PWA caching in remote ตชด. school areas
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (reg) => {
        console.log('Kopodot BPP Service Worker registered:', reg.scope);
      },
      (err) => {
        console.warn('Service Worker registration failed:', err);
      }
    );
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
