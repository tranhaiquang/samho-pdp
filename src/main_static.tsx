import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { installStaticApi } from './lib/staticApiShim';
import { GeminiKeyManager } from './components/GeminiKeyManager_static';

// Install before App mounts so every syncService call is served locally.
installStaticApi();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <GeminiKeyManager />
  </StrictMode>
);