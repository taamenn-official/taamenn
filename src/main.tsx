import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { restoreSpaFallbackLocation } from './infrastructure/spaFallback';
import { applyTheme, readTheme } from './theme/theme';
import './styles/global.css';
import './styles/match-schedule.css';
import './styles/profile-entry.css';
import './styles/taamen-2.1.css';
import './styles/product-refinement.css';

applyTheme(readTheme());
restoreSpaFallbackLocation();
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
if('serviceWorker' in navigator && import.meta.env.PROD){
  window.addEventListener('load',async()=>{
    const registration=await navigator.serviceWorker.register('/sw.js');
    registration.addEventListener('updatefound',()=>{
      const worker=registration.installing;if(!worker)return;
      worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)window.dispatchEvent(new CustomEvent('taamen-sw-update',{detail:{registration}}));});
    });
  });
}
