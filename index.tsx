
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';

// Fix for Recharts support for defaultProps which will be removed in function components
// This warning is internal to Recharts and can be safely suppressed in the entry point
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

const suppressionFilter = (...args: any[]) => {
  if (typeof args[0] === 'string' && (args[0].includes('defaultProps') || args[0].includes('Support for defaultProps'))) {
    return true;
  }
  return false;
};

console.error = (...args: any[]) => {
  if (suppressionFilter(...args)) return;
  originalConsoleError(...args);
};

console.warn = (...args: any[]) => {
  if (suppressionFilter(...args)) return;
  originalConsoleWarn(...args);
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
