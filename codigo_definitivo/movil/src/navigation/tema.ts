import { DarkTheme, type Theme } from '@react-navigation/native';
import { colores } from '@/shared/theme';

// Colores de la navegación (cabeceras, barra inferior, fondo entre pantallas)
// tomados del tema: sin esto, al cambiar de pantalla asoma el gris por defecto.
export const temaNavegacion: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colores.marcaClara,
    background: colores.fondo,
    card: colores.fondo,
    text: colores.texto,
    border: colores.linea,
    notification: colores.marca,
  },
};
