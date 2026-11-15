import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import "./app/i18n/config";
import ErrorBoundary from "./app/components/ErrorBoundary";

createRoot(document.getElementById('root')!).render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
)