import React from 'react';
import ReactDOM from 'react-dom/client';

import App from '@/app/App';
import { aplicarTemaStaffGuardado } from '@/shared/hooks/useTemaStaff';

// Tipografías autoalojadas de Antojate: Baloo 2 en titulares y Nunito Sans en
// textos, para la landing, el panel y el menú. Del Baloo solo entran los dos
// pesos que se usan: cada peso extra son KB que nadie llega a ver.
import '@fontsource/baloo-2/600.css';
import '@fontsource/baloo-2/800.css';
import '@fontsource-variable/nunito-sans';
import '@/index.css';

// Antes del primer render, para que el panel no parpadee al cargar.
aplicarTemaStaffGuardado();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
