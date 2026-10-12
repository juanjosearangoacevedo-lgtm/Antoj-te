import React from 'react';
import ReactDOM from 'react-dom/client';

import App from '@/app/App';
import { aplicarTemaStaffGuardado } from '@/shared/hooks/useTemaStaff';

// Tipografías autoalojadas. Geist es la del panel y el menú; Poppins y Nunito
// son las de marca de la landing (LandingPage.css las asigna). De Poppins solo
// entran los dos grosores que usa el manual: cada peso extra son ~15 KB que
// nadie llega a ver.
import '@fontsource-variable/geist';
import '@fontsource-variable/nunito';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import '@/index.css';

// Antes del primer render, para que el panel no parpadee al cargar.
aplicarTemaStaffGuardado();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
