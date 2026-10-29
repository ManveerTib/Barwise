import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './fonts.css';
import './styles.css';

// Entrance animations only run when scripting is on.
document.documentElement.classList.add('js');

createRoot(document.getElementById('root')).render(<App />);
