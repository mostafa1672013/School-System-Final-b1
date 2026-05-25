import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import App from './App';
import './index.css';

// Auto-heal corrupted localStorage data for all stores
try {
  const storesToCheck = [
    { key: 'school-students', arrayProp: 'students' },
    { key: 'school-payments', arrayProp: 'payments' },
    { key: 'school-accounting', arrayProp: 'expenses' },
    { key: 'school-inventory', arrayProp: 'items' },
    { key: 'school-bus', arrayProp: 'buses' }
  ];
  storesToCheck.forEach(({ key, arrayProp }) => {
    const data = localStorage.getItem(key);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed.state && parsed.state[arrayProp] && !Array.isArray(parsed.state[arrayProp])) {
        console.warn(`Corrupted ${key} data detected. Clearing cache...`);
        localStorage.removeItem(key);
      }
    }
  });
} catch (e) {
  // Ignore
}

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <div className="max-w-md w-full bg-card border rounded-2xl p-8 shadow-xl text-center">
        <h2 className="text-2xl font-bold text-destructive mb-4 font-[Noto_Kufi_Arabic]">عذراً، حدث خطأ غير متوقع</h2>
        <div className="bg-muted p-4 rounded-lg mb-6 overflow-auto text-left dir-ltr">
          <code className="text-xs text-muted-foreground">{error.message}</code>
        </div>
        <button
          onClick={resetErrorBoundary}
          className="w-full bg-primary text-primary-foreground h-12 rounded-xl font-bold hover:bg-primary/90 transition-all"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.replace('/')}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
