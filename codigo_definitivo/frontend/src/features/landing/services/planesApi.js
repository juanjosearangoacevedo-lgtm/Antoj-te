import { request } from '@/shared/services/http';

// Endpoint público: no lleva JWT porque quien mira los precios todavía no tiene
// cuenta. Es la ÚNICA fuente de la sección de precios — nada de listas en el
// código: si el superadmin cambia un precio en el panel, cambia aquí.
export const obtenerPlanes = () => request('/public/planes');
