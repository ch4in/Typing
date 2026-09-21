import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

import { BRAND } from './brand';

// 浏览器标签页标题跟随品牌名，避免 index.html 里再写死一份
document.title = `${BRAND.emoji} ${BRAND.name} - ${BRAND.slogan.replace(/\s*·\s*/, '')}`;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
