import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { SimulationProvider } from './context/SimulationContext';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <SimulationProvider>
        <App />
      </SimulationProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
