import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { LockProvider } from './context/LockContext';
import ScreenLock from './components/ScreenLock';
import PrivacyScreen from './components/PrivacyScreen';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <LockProvider>
        <AuthProvider>
          <SocketProvider>
            <HashRouter>
              <App />
            </HashRouter>
          </SocketProvider>
        </AuthProvider>
        <PrivacyScreen />
        <ScreenLock />
      </LockProvider>
    </ThemeProvider>
  </React.StrictMode>
);
