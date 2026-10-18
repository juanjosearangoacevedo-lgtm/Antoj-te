// Tokens de diseño de la app. Son los mismos del comensal en la web
// (frontend/src/index.css, bloque :root): una marca, dos superficies que se ven
// igual. Si cambia allá, cambia aquí.
//
// Reglas que vienen del sistema de diseño de Antojate y no se negocian:
//   - Un solo acento, el verde cilantro de marca. Nada de naranja.
//   - Rellenos (botones, casillas) en #1B7D52 con texto BLANCO: 5,1:1, pasa AA.
//     El #1F8A5B puro con blanco da 4,3:1 y no pasa.
//   - Texto e íconos verdes sobre el fondo oscuro van en `marcaClara`: el verde
//     de relleno se apaga sobre negro.
//   - Radios 12 / 16 / 24 / 32; movimiento de 150 / 200 / 250 ms.

export const colores = {
  fondo: '#0e1210',
  superficie: '#161c19',
  superficieAlta: '#1f2722',
  linea: '#2c3631',
  texto: '#fffaf2',
  textoSuave: '#a9b5ad',
  marca: '#1b7d52',
  marcaHonda: '#145c3c',
  marcaClara: '#7fd1a8',
  textoSobreMarca: '#ffffff',
  marcaTenue: 'rgba(58, 168, 118, 0.16)',
  // La paleta completa de la marca, para las piezas de marca (portada del
  // acceso, banner, mascota). La interfaz de todos los días usa los de arriba.
  verde: '#1f8a5b',
  verdeClaro: '#3aa876',
  verdeHondo: '#145c3c',
  mazorca: '#f6b931',
  arepa: '#fff6e6',
  tinto: '#2b1b12',
  exito: '#4ade80',
  exitoTenue: 'rgba(74, 222, 128, 0.12)',
  peligro: '#f87171',
  peligroTenue: 'rgba(248, 113, 113, 0.14)',
  velo: 'rgba(0, 0, 0, 0.6)',
} as const;

// Las tipografías de la web: Nunito Sans en pesos estáticos para los textos y
// Baloo 2 para los titulares. Los nombres son los que registra `useFonts` en
// App.tsx.
export const fuentes = {
  regular: 'NunitoSans_400Regular',
  media: 'NunitoSans_500Medium',
  seminegrita: 'NunitoSans_600SemiBold',
  negrita: 'NunitoSans_700Bold',
  titular: 'Baloo2_800ExtraBold',
} as const;

export const tamanos = {
  pequeno: 13,
  cuerpo: 15,
  destacado: 17,
  subtitulo: 20,
  titulo: 26,
  portada: 32,
} as const;

export const espacio = {
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radios = {
  boton: 12,
  tarjeta: 16,
  grande: 24,
  // Las piezas grandes y redondeadas: portada del acceso, banner, barra flotante.
  enorme: 32,
  pildora: 999,
} as const;

export const movimiento = {
  rapido: 150,
  base: 200,
  lento: 250,
} as const;

// Alto mínimo de todo lo que se toca: 48 px, por encima de los 44 que piden las
// guías de accesibilidad de iOS y Android.
export const TOQUE_MINIMO = 48;
