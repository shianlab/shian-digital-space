import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

// Live accessible navigation mirrors the static crawler fallback after startup.
document.getElementById('seo-content')?.setAttribute('aria-hidden', 'true');
createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
