import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LangProvider } from './LangContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <LangProvider>
      <App />
    </LangProvider>
  </React.StrictMode>
);
