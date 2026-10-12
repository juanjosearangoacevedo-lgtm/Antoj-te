// Preguntas frecuentes de la landing.
//
// Este archivo es la ÚNICA fuente: lo consume el componente Preguntas.jsx para
// pintarlas y vite.config.js para generar el JSON-LD de tipo FAQPage en
// index.html. Google exige que el dato estructurado coincida con lo que se ve
// en la página, y teniéndolo en un solo sitio no pueden separarse.
//
// Solo se afirma lo que la plataforma ya hace hoy: cada respuesta corresponde a
// una función real del panel o del menú del comensal.

export const PREGUNTAS = [
  {
    pregunta: '¿Qué es un menú digital con QR?',
    respuesta:
      'Es la carta de tu restaurante alojada en internet, a la que el comensal entra escaneando un código QR desde la cámara de su celular. No reemplaza al mesero: reemplaza la carta impresa, y a diferencia de esta se actualiza al instante y muestra cada plato en video.',
  },
  {
    pregunta: '¿Mis comensales tienen que descargar una aplicación?',
    respuesta:
      'No. El menú se abre en el navegador del celular, igual que cualquier página web. Tampoco crean una cuenta ni dejan datos personales: la sesión es temporal y queda identificada por la mesa desde la que escanearon.',
  },
  {
    pregunta: '¿En qué se diferencia de una carta digital en PDF?',
    respuesta:
      'Un PDF obliga a hacer zoom, no se puede pedir desde él y muestra fotos fijas. Aquí cada plato tiene su video vertical, el comensal arma el pedido con sus notas y modificaciones, y la comanda entra directo a cocina.',
  },
  {
    pregunta: '¿Cómo llegan los pedidos a la cocina?',
    respuesta:
      'Cuando el comensal confirma, la comanda aparece en tiempo real en el panel de cocina y avanza por estados hasta salir a la mesa. El comensal ve ese mismo estado desde su celular, sin tener que preguntar.',
  },
  {
    pregunta: '¿Puedo cambiar platos y precios cuando quiera?',
    respuesta:
      'Sí. Categorías, platos, precios y videos se administran desde el panel del restaurante y el cambio se refleja de inmediato en el menú. No hay que reimprimir nada ni esperar a nadie.',
  },
  {
    pregunta: '¿El menú digital lleva la marca de mi restaurante?',
    respuesta:
      'Sí. Colores, tipografía, forma de las tarjetas y modo claro u oscuro se configuran por restaurante. Tus comensales ven tu marca, no la nuestra.',
  },
  {
    pregunta: '¿Los videos se ven bien con la señal del restaurante?',
    respuesta:
      'Los videos se sirven desde un CDN con calidad adaptativa: la resolución baja sola si la conexión del comensal es lenta, en lugar de quedarse cargando.',
  },
  {
    pregunta: '¿Cómo obtengo los códigos QR de cada mesa?',
    respuesta:
      'Se generan desde el panel, uno por mesa, y se descargan para imprimir. Si un código se filtra o se daña, lo regeneras y el anterior deja de servir. Cada pedido llega identificado con su mesa.',
  },
];
