import { request } from '@/shared/services/http';

// Endpoint público: no lleva JWT porque quien lo usa todavía no tiene cuenta.
export const enviarSolicitud = (datos) =>
  request('/public/solicitudes', { method: 'POST', body: JSON.stringify(datos) });
