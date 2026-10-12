// Contenido de las páginas públicas de contenido (guías y páginas de producto).
//
// ESTE ARCHIVO ES LA ÚNICA FUENTE, Y LO LEEN DOS CONSUMIDORES:
//   · los componentes de React, que lo pintan con el diseño de Bitemo;
//   · seo/contenido-html.js, que en el BUILD escribe cada página como HTML
//     estático en dist/, porque los rastreadores de los buscadores con IA no
//     ejecutan JavaScript y para ellos una SPA está en blanco.
//
// Es el mismo patrón que ya usaba contenido/preguntas.js con el FAQPage: un
// solo texto, dos formas de pintarlo. Si el contenido se duplicara, la versión
// que ve el buscador y la que ve el visitante divergirían, y eso —además de ser
// un lío de mantener— es exactamente lo que Google llama encubrimiento.
//
// FORMA DE UNA PÁGINA
//   slug          fragmento final de la URL
//   ruta          URL completa dentro del sitio (la canónica)
//   coleccion     'producto' | 'guia'  → decide dónde se lista y su breadcrumb
//   titulo        <title> — orientado a la intención de búsqueda, no a la marca
//   descripcion   meta description
//   h1            titular visible; NO tiene por qué ser igual al <title>
//   entradilla    párrafo de entrada, y lo primero que lee un modelo de lenguaje
//   actualizado   fecha ISO; alimenta <lastmod> del sitemap y "Actualizado el…"
//   secciones     [{ h2, parrafos, lista, pasos, comparativa }]
//   faq           [{ pregunta, respuesta }] → FAQPage, y responde a la búsqueda
//   relacionadas  slugs de otras páginas: de aquí sale el enlazado interno
//
// REGLA DE CONTENIDO: solo se afirma lo que Bitemo hace HOY. Un texto que
// promete de más se cae en la primera demo, y una guía que miente no se enlaza.

// Fecha de última revisión del contenido. Se toca a mano al editar un texto: es
// una afirmación sobre el contenido, y calcularla del archivo o del despliegue
// haría que cambiara sola sin que nadie revisara nada.
export const REVISADO = '2026-08-11';

export const PAGINAS = [
  // =========================================================================
  // PRODUCTO — intención comercial. Cada una defiende un término que la
  // portada NO puede defender sin canibalizarse a sí misma.
  // =========================================================================
  {
    slug: 'menu-digital-con-video',
    ruta: '/menu-digital-con-video',
    coleccion: 'producto',
    titulo: 'Menú digital con video para restaurantes | Bitemo',
    descripcion:
      'Cómo funciona un menú digital donde cada plato se ve en video: qué gana el restaurante, cómo se graban los videos y qué hace falta para montarlo.',
    h1: 'Menú digital con video: que el comensal vea el plato antes de pedirlo',
    entradilla:
      'Un menú digital con video sustituye la foto fija de cada plato por un clip vertical de unos segundos. El comensal escanea el QR de su mesa y recorre la carta como recorrería un feed: ve cómo se sirve el plato, de qué tamaño es y qué lleva, y decide mirando en vez de leyendo. Bitemo es la plataforma con la que se monta esa carta.',
    actualizado: REVISADO,
    secciones: [
      {
        h2: 'Qué cambia cuando el plato se ve en movimiento',
        parrafos: [
          'La carta impresa y el PDF piden un acto de imaginación: el comensal lee "lomo al trapo con papas criollas" y tiene que construir el plato en su cabeza. Si nunca lo ha probado, la duda se resuelve casi siempre por el lado seguro, y el lado seguro es el plato que ya conoce.',
          'El video quita esa duda. Un clip corto muestra el tamaño real de la porción, la textura, cómo llega a la mesa y si es para compartir. Esa información es exactamente la que un comensal le pregunta al mesero antes de arriesgarse con algo nuevo, y es la que decide si prueba el plato de mayor margen o repite el de siempre.',
          'Es la misma razón por la que las plataformas de video corto desplazaron a la foto en todo lo demás: para mostrar comida, unos segundos en movimiento cargan más información que cualquier fotografía, por buena que sea.',
        ],
      },
      {
        h2: 'Cómo es un buen video de plato',
        parrafos: [
          'No hace falta un equipo de producción. Los videos que funcionan en un menú digital son cortos y directos, y se graban con el celular del restaurante en el mismo pase de fotos que ya se hace para redes.',
        ],
        lista: [
          'Vertical, a pantalla completa: es como se sostiene el teléfono en una mesa.',
          'Entre 6 y 15 segundos. Más allá de eso el comensal pasa al siguiente plato.',
          'Sin sonido y sin depender de él: nadie sube el volumen en un restaurante lleno.',
          'Un solo plato por video, montado como se sirve de verdad, no una versión de fotografía.',
          'Movimiento real: el corte, el hilo del queso, la salsa cayendo. El movimiento es el contenido.',
        ],
      },
      {
        h2: 'Qué necesita el restaurante para montarlo',
        pasos: [
          {
            titulo: 'La carta ordenada en categorías',
            texto:
              'Entradas, fuertes, postres, bebidas. Es la misma estructura de la carta impresa, y se carga una sola vez desde el panel.',
          },
          {
            titulo: 'Un video por plato, empezando por los que importan',
            texto:
              'No hay que grabar la carta entera para arrancar. Con los diez o quince platos que más se venden —y los de mayor margen— la carta ya funciona; los platos sin video se muestran con su foto.',
          },
          {
            titulo: 'Los códigos QR de las mesas',
            texto:
              'Se generan desde el panel, uno por mesa, y se imprimen. Como cada código identifica su mesa, el pedido llega a cocina sabiendo dónde está sentado quien lo hizo.',
          },
        ],
      },
      {
        h2: 'Cómo se sirven los videos sin que el menú se quede cargando',
        parrafos: [
          'El problema real de un menú con video no es grabarlo, es entregarlo: un restaurante lleno son decenas de celulares pidiendo video a la vez, muchos con datos móviles y no con el wifi del local.',
          'En Bitemo los videos no salen del servidor del menú. Se sirven desde una red de distribución de contenido con calidad adaptativa: el reproductor mide la conexión de cada comensal y baja o sube la resolución solo. Con mala señal el video se ve con menos definición, pero se ve; que es la diferencia entre una carta que funciona y una rueda girando.',
        ],
      },
    ],
    faq: [
      {
        pregunta: '¿Necesito grabar todos los platos en video?',
        respuesta:
          'No. Los platos sin video se muestran con su foto y su descripción, así que la carta funciona completa desde el primer día. Lo habitual es empezar por los más vendidos y los de mayor margen, e ir sumando el resto.',
      },
      {
        pregunta: '¿Los videos consumen los datos del comensal?',
        respuesta:
          'Sí, como cualquier video en el celular, pero la calidad es adaptativa: con conexión lenta el reproductor baja la resolución en vez de quedarse cargando. Los clips son de pocos segundos, así que el consumo es comparable al de mirar unas cuantas historias.',
      },
      {
        pregunta: '¿Puedo usar los mismos videos en mis redes sociales?',
        respuesta:
          'Sí. Los videos son del restaurante y el formato es el mismo que piden las redes: vertical y de pocos segundos. Grabar para la carta y para redes es el mismo trabajo hecho una vez.',
      },
    ],
    relacionadas: ['como-grabar-videos-de-platos', 'menu-qr-para-restaurantes', 'que-es-un-menu-digital'],
  },

  {
    slug: 'menu-qr-para-restaurantes',
    ruta: '/menu-qr-para-restaurantes',
    coleccion: 'producto',
    titulo: 'Menú QR para restaurantes: cómo crearlo | Bitemo',
    descripcion:
      'Qué es un menú con código QR, en qué cambia tener un QR por mesa y no uno por local, y qué errores hacen que el comensal no llegue a escanearlo.',
    h1: 'Menú QR para restaurantes',
    entradilla:
      'Un menú QR es la carta del restaurante alojada en internet, a la que el comensal entra apuntando la cámara de su celular a un código impreso en la mesa. No hace falta descargar nada ni crear una cuenta. Esta página explica cómo funciona por dentro, qué decisiones hay que tomar al montarlo y cuáles son los errores que hacen que la gente no lo use.',
    actualizado: REVISADO,
    secciones: [
      {
        h2: 'Un QR para todo el local o un QR por mesa',
        parrafos: [
          'Es la decisión que más consecuencias tiene y casi nadie la toma a conciencia. Un código único para todo el restaurante es más fácil de imprimir: el mismo adhesivo sirve en todas las mesas. Pero ese código solo sabe abrir la carta.',
          'Un código por mesa lleva dentro la identidad de la mesa. Eso es lo que permite que el comensal pida desde su celular y que la comanda entre a cocina con el número de mesa puesto, sin que nadie lo teclee. Sin esa información, un menú QR se queda en carta de solo mirar y el pedido sigue pasando por el mesero.',
          'Bitemo genera un código por mesa desde el panel, precisamente para que el pedido pueda cerrarse. Si un código se filtra o el adhesivo se daña, se regenera y el anterior deja de servir de inmediato.',
        ],
      },
      {
        h2: 'Cómo se monta, paso a paso',
        pasos: [
          {
            titulo: 'Cargar la carta',
            texto:
              'Categorías, platos, descripciones y precios desde el panel del restaurante. Los precios se cambian cuando haga falta y el menú los refleja al instante, sin reimprimir nada.',
          },
          {
            titulo: 'Crear las mesas y generar sus códigos',
            texto:
              'Se declara cuántas mesas hay y el panel emite un código para cada una, listo para descargar e imprimir.',
          },
          {
            titulo: 'Imprimir y colocar',
            texto:
              'Un soporte de mesa o un adhesivo laminado. El código tiene que quedar a la vista sin que haya que mover platos, y sobrevivir a que lo limpien varias veces al día.',
          },
          {
            titulo: 'Probarlo como un comensal',
            texto:
              'Escanear desde un celular que no sea el del administrador, con datos móviles en vez de wifi, y recorrer la carta entera. Casi todos los problemas de un menú QR se ven en esa primera prueba.',
          },
        ],
      },
      {
        h2: 'Los errores que hacen que nadie lo escanee',
        lista: [
          'Un QR que abre un PDF. Obliga a hacer zoom, no se puede pedir desde ahí y en muchos celulares se descarga en vez de abrirse.',
          'El código impreso demasiado pequeño o pegado bajo un vidrio con reflejo: la cámara no engancha y el comensal se rinde a los pocos segundos.',
          'No indicar qué es. Un código suelto sin la palabra "Menú" al lado se confunde con publicidad o con un enlace de pago.',
          'Una carta que tarda en abrir. El comensal ya tiene el teléfono en la mano; si no ve nada en un par de segundos, vuelve a pedir la carta de papel.',
          'Dejar el menú en línea sin actualizar precios. Un precio distinto al de la cuenta es un problema con el cliente, no un detalle.',
        ],
      },
      {
        h2: 'Qué pasa con quien no quiere escanear',
        parrafos: [
          'Siempre hay comensales que prefieren papel, y el menú QR no los obliga. Lo razonable es conservar unas pocas cartas impresas para quien las pida y usar el menú digital como opción por defecto: es lo que hacen los restaurantes donde el QR funciona de verdad.',
          'La ventaja no es eliminar el papel, es que la carta que ve la mayoría esté siempre al día, muestre los platos y permita pedir sin esperar a que pase el mesero.',
        ],
      },
    ],
    faq: [
      {
        pregunta: '¿El comensal tiene que descargar una aplicación para escanear el QR?',
        respuesta:
          'No. La cámara de cualquier celular actual, iPhone o Android, lee códigos QR sin instalar nada, y el menú se abre en el navegador como cualquier página web. Tampoco se pide registro ni datos personales.',
      },
      {
        pregunta: '¿Qué pasa si alguien fotografía el código y lo usa desde fuera del restaurante?',
        respuesta:
          'El código puede regenerarse desde el panel en cualquier momento, y al hacerlo el anterior deja de funcionar. Como cada código pertenece a una mesa, un uso raro se localiza en una sola mesa y no compromete al resto.',
      },
      {
        pregunta: '¿Puedo cambiar la carta sin volver a imprimir los códigos?',
        respuesta:
          'Sí, y es la razón principal para tener un menú QR. El código apunta a la mesa, no a la carta: los platos, los precios y las fotos se cambian desde el panel y el código impreso sigue sirviendo igual.',
      },
    ],
    relacionadas: ['como-crear-un-menu-digital-para-restaurante', 'menu-digital-con-video', 'que-es-un-menu-digital'],
  },

  // =========================================================================
  // GUÍAS — intención informativa. Traen a quien todavía no sabe que existe
  // un producto como este, y son las páginas que otro sitio puede enlazar.
  // =========================================================================
  {
    slug: 'que-es-un-menu-digital',
    ruta: '/guias/que-es-un-menu-digital',
    coleccion: 'guia',
    titulo: 'Qué es un menú digital y qué tipos existen',
    descripcion:
      'Definición de menú digital, los cuatro formatos que se usan hoy en restaurantes —PDF, página web, aplicación y menú con video— y para qué sirve cada uno.',
    h1: 'Qué es un menú digital',
    entradilla:
      'Un menú digital es la carta de un restaurante publicada en un formato que se consulta desde una pantalla, casi siempre el celular del comensal. "Carta digital" y "menú digital" nombran lo mismo. Bajo ese nombre conviven cuatro formatos muy distintos, y confundirlos es el motivo por el que muchos restaurantes creen que ya tienen uno cuando en realidad tienen un PDF.',
    actualizado: REVISADO,
    secciones: [
      {
        h2: 'Los cuatro formatos, y qué resuelve cada uno',
        parrafos: [
          'Todos se abren desde el celular y todos se llaman menú digital, pero solo dos permiten hacer algo más que mirar.',
        ],
        lista: [
          'PDF. La carta impresa convertida en archivo. Se actualiza reimprimiendo el archivo entero, obliga a hacer zoom en el celular y no permite pedir. Es el formato más común y el que menos aporta.',
          'Página web. La carta como página, con sus categorías y sus platos. Se actualiza al instante, se lee bien en el celular y puede aparecer en buscadores.',
          'Aplicación descargable. Permite todo, pero pide al comensal instalar algo para una sola comida. Fuera de las grandes cadenas casi nadie la descarga.',
          'Menú con video. Una página web donde cada plato se muestra en video vertical. Es el formato más reciente y el único que resuelve la duda de "cómo se ve realmente este plato".',
        ],
      },
      {
        h2: 'Qué debería poder hacer un menú digital para llamarse así',
        lista: [
          'Actualizarse sin reimprimir: cambiar un precio o agotar un plato tiene que ser cuestión de segundos.',
          'Leerse sin zoom en la pantalla de un celular.',
          'Mostrar el plato, no solo nombrarlo.',
          'Identificar la mesa, si se quiere que el comensal pueda pedir desde ahí.',
          'Funcionar con datos móviles, no solo con el wifi del local.',
          'Tener una dirección web propia, para poder compartirla por WhatsApp o Instagram.',
        ],
      },
      {
        h2: 'Menú digital no es lo mismo que pedir por internet',
        parrafos: [
          'Un menú digital es la carta del salón: la usa quien ya está sentado en una mesa. Un domicilio o una plataforma de reparto es otra cosa, con otro cliente y otra comisión de por medio.',
          'Se confunden porque ambos se abren en el celular, pero las decisiones son distintas. En el salón importa la velocidad de la carta, la identificación de la mesa y que el pedido llegue a cocina; en domicilios importan la cobertura, el reparto y el cobro.',
        ],
      },
    ],
    faq: [
      {
        pregunta: '¿"Carta digital" y "menú digital" son lo mismo?',
        respuesta:
          'Sí. Son sinónimos: en España y parte de Latinoamérica se dice carta y en otros países menú, pero nombran la misma cosa. Lo que sí cambia es el formato: un PDF y un menú con video son ambos "cartas digitales" y no se parecen en nada.',
      },
      {
        pregunta: '¿Un menú digital reemplaza al mesero?',
        respuesta:
          'No. Reemplaza a la carta impresa. El mesero sigue recomendando, resolviendo dudas y atendiendo la mesa; lo que deja de hacer es cargar cartas, cantar los platos agotados y anotar en papel lo que el comensal ya eligió.',
      },
      {
        pregunta: '¿Sirve para un restaurante pequeño?',
        respuesta:
          'Sí, y a veces más: un restaurante pequeño cambia la carta con frecuencia y reimprimir le cuesta proporcionalmente más. Donde encaja mal es en negocios sin mesa, como un puesto de calle, porque buena parte del valor está en identificar dónde está sentado el comensal.',
      },
    ],
    relacionadas: [
      'como-crear-un-menu-digital-para-restaurante',
      'menu-digital-vs-carta-impresa',
      'menu-digital-con-video',
    ],
  },

  {
    slug: 'como-crear-un-menu-digital-para-restaurante',
    ruta: '/guias/como-crear-un-menu-digital-para-restaurante',
    coleccion: 'guia',
    titulo: 'Cómo crear un menú digital para tu restaurante, paso a paso',
    descripcion:
      'Guía práctica para montar la carta digital de un restaurante: ordenar las categorías, escribir los platos, revisar precios, grabar el material y publicarla con QR.',
    h1: 'Cómo crear un menú digital para tu restaurante',
    entradilla:
      'Montar un menú digital lleva una tarde de trabajo si se hace en orden, y varias semanas si se empieza por el final. El orden que sigue es el que evita rehacer las cosas: primero la estructura, después los textos, después el material visual y solo al final los códigos QR.',
    actualizado: REVISADO,
    secciones: [
      {
        h2: 'Los pasos, en el orden que ahorra trabajo',
        pasos: [
          {
            titulo: 'Ordena la carta antes de digitalizarla',
            texto:
              'Pasar la carta tal cual está es la oportunidad perdida más frecuente. Es el momento de quitar los platos que no se venden, agrupar lo que quedó suelto y decidir qué va primero: en una pantalla, el orden manda mucho más que en el papel, porque casi nadie llega al final de la lista.',
          },
          {
            titulo: 'Escribe nombres que se entiendan solos',
            texto:
              'El nombre de fantasía funciona en papel porque el mesero lo explica. En una carta digital, el nombre y una línea de descripción tienen que bastar. Di qué lleva, cómo está preparado y si es para compartir.',
          },
          {
            titulo: 'Revisa los precios uno por uno',
            texto:
              'Es la última vez que los vas a mirar todos juntos en mucho tiempo. Comprueba que coinciden con los del sistema de caja: un precio distinto en la carta y en la cuenta es una discusión con el cliente.',
          },
          {
            titulo: 'Graba o fotografía por tandas',
            texto:
              'Un solo pase para toda una categoría, con la misma luz y el mismo montaje, sale mejor y más rápido que ir plato por plato en días distintos. Empieza por los más vendidos y los de mayor margen.',
          },
          {
            titulo: 'Publica y pruébalo como comensal',
            texto:
              'Con un celular que no sea el tuyo y con datos móviles, no con el wifi del local. Recorre la carta entera buscando precios viejos, fotos que no corresponden y categorías vacías.',
          },
          {
            titulo: 'Genera los QR e imprímelos al final',
            texto:
              'Al final a propósito: si imprimes antes de tener la carta revisada, vas a reimprimir. Un código por mesa, en un soporte que aguante que lo limpien todos los días.',
          },
        ],
      },
      {
        h2: 'Qué revisar antes de ponerlo en las mesas',
        lista: [
          'Todas las categorías tienen al menos un plato: una categoría vacía parece un error del sistema.',
          'Ningún plato se quedó sin precio.',
          'Las fotos corresponden al plato que se sirve hoy, no a una versión anterior.',
          'La carta abre en menos de dos o tres segundos con datos móviles.',
          'Los platos que se agotan a menudo se pueden desactivar rápido desde el celular del encargado.',
          'Alguien del equipo sabe cómo cambiar un precio sin llamar a nadie.',
        ],
      },
      {
        h2: 'El error más caro: montarlo y no mantenerlo',
        parrafos: [
          'Un menú digital desactualizado es peor que una carta impresa desactualizada, porque el comensal supone que lo que está en pantalla es lo que hay. Si el plato no está disponible y sigue apareciendo, la promesa se rompe en la mesa.',
          'La forma de que se mantenga es que mantenerlo sea trivial y que no dependa de una sola persona. Antes de publicar, deja definido quién desactiva un plato agotado y quién cambia un precio, y comprueba que puede hacerlo desde el celular en menos de un minuto.',
        ],
      },
    ],
    faq: [
      {
        pregunta: '¿Cuánto se demora montar un menú digital?',
        respuesta:
          'Cargar la carta —categorías, platos, descripciones y precios— es una tarde para una carta normal. Lo que marca el tiempo total es el material visual: fotografiar o grabar la carta entera puede llevar varias sesiones, aunque se puede publicar antes e ir sumando.',
      },
      {
        pregunta: '¿Puedo empezar solo con fotos y sumar videos después?',
        respuesta:
          'Sí, y suele ser lo sensato. La carta funciona completa con fotos, y los videos se van sumando por tandas empezando por los platos que más se venden.',
      },
      {
        pregunta: '¿Hace falta que alguien del equipo sepa de tecnología?',
        respuesta:
          'No más de lo necesario para manejar el sistema de caja o publicar en Instagram. Lo que sí hace falta es que haya alguien encargado: un menú digital sin dueño deja de actualizarse a las pocas semanas.',
      },
    ],
    relacionadas: ['que-es-un-menu-digital', 'menu-qr-para-restaurantes', 'como-grabar-videos-de-platos'],
  },

  {
    slug: 'menu-digital-vs-carta-impresa',
    ruta: '/guias/menu-digital-vs-carta-impresa',
    coleccion: 'guia',
    titulo: 'Menú digital vs carta impresa: comparación honesta',
    descripcion:
      'En qué gana cada uno: costo real, velocidad de actualización y capacidad de mostrar los platos. Incluye lo que la carta de papel todavía hace mejor.',
    h1: 'Menú digital vs carta impresa',
    entradilla:
      'La comparación suele hacerse desde el bando de quien vende una de las dos. Esta intenta ser honesta, incluyendo lo que la carta impresa hace mejor y que no conviene ignorar al decidir.',
    actualizado: REVISADO,
    secciones: [
      {
        h2: 'Punto por punto',
        comparativa: {
          columnas: ['Carta impresa', 'Menú digital'],
          filas: [
            {
              aspecto: 'Cambiar un precio',
              a: 'Rediseñar y reimprimir toda la tirada',
              b: 'Segundos, desde el panel',
            },
            {
              aspecto: 'Costo',
              a: 'Un pago cada vez que cambia la carta, y se desgasta',
              b: 'Cuota mensual fija, sin reimpresiones',
            },
            {
              aspecto: 'Mostrar el plato',
              a: 'Rara vez lleva fotos; encarecen mucho la impresión',
              b: 'Foto o video de cada plato sin costo adicional',
            },
            {
              aspecto: 'Plato agotado',
              a: 'El mesero lo canta mesa por mesa',
              b: 'Se desactiva y desaparece de la carta',
            },
            {
              aspecto: 'Saber qué se mira',
              a: 'No hay forma de saberlo',
              b: 'Se puede medir qué platos se ven y cuáles no',
            },
            {
              aspecto: 'Pedir desde la mesa',
              a: 'No',
              b: 'Sí, si el código identifica la mesa',
            },
            {
              aspecto: 'Aparecer en buscadores',
              a: 'No existe fuera del local',
              b: 'Tiene dirección propia y puede indexarse',
            },
            {
              aspecto: 'Sin batería o sin señal',
              a: 'Funciona siempre',
              b: 'Depende del celular del comensal',
            },
            {
              aspecto: 'Objeto de marca',
              a: 'Se toca, pesa, transmite categoría',
              b: 'La marca se transmite en pantalla, no en la mano',
            },
          ],
        },
      },
      {
        h2: 'Lo que la carta impresa todavía hace mejor',
        parrafos: [
          'En restaurantes de mantel largo, la carta es parte de la experiencia: el peso del papel y la encuadernación comunican categoría antes de que el comensal lea nada. Una pantalla no reemplaza eso, y forzar el cambio ahí puede restar en vez de sumar.',
          'También gana con el comensal mayor, con quien llegó sin batería y en las mesas donde todo el mundo quiere leer a la vez. Por eso la recomendación práctica no es eliminar el papel, sino conservar unas pocas cartas para quien las pida.',
        ],
      },
      {
        h2: 'Cómo decidir para tu caso',
        lista: [
          'Si cambias la carta o los precios más de dos veces al año, el menú digital se paga solo en impresión.',
          'Si vendes platos que hay que ver para elegir, el video pesa más que cualquier otro argumento.',
          'Si tu ticket sube con recomendaciones del mesero, el menú digital ayuda; no las reemplaza.',
          'Si tu salón es de manteles y carta encuadernada, evalúa un formato mixto antes de cambiarlo todo.',
          'Si no tienes quién mantenga la carta al día, resuelve eso primero: el formato no arregla ese problema.',
        ],
      },
    ],
    faq: [
      {
        pregunta: '¿Sale más barato un menú digital que imprimir cartas?',
        respuesta:
          'Depende de cada cuánto cambia la carta. Un restaurante que reimprime dos o tres veces al año suele gastar más en impresión que en la cuota mensual de una plataforma; uno que imprime una vez cada varios años, no. La cuenta hay que hacerla con la frecuencia real de cambios, no con una sola impresión.',
      },
      {
        pregunta: '¿Puedo tener las dos cosas?',
        respuesta:
          'Sí, y es lo más común al empezar. El menú digital se usa como opción por defecto y se conservan unas pocas cartas impresas para quien las pida. Lo importante es que las dos digan lo mismo: dos cartas con precios distintos es peor que cualquiera de las dos sola.',
      },
    ],
    relacionadas: ['que-es-un-menu-digital', 'como-crear-un-menu-digital-para-restaurante', 'menu-digital-con-video'],
  },

  {
    slug: 'como-grabar-videos-de-platos',
    ruta: '/guias/como-grabar-videos-de-platos',
    coleccion: 'guia',
    titulo: 'Cómo grabar videos de platos con el celular, paso a paso',
    descripcion:
      'Luz, ángulos, duración y movimientos que funcionan al grabar platos con un celular, y los errores que arruinan la toma. Sirve para la carta y para redes.',
    h1: 'Cómo grabar videos de platos con el celular',
    entradilla:
      'Los videos de comida que funcionan no se graban con mejor cámara, se graban con mejor luz y con el plato recién montado. Esta guía es lo que hace falta saber para grabar la carta de un restaurante con el celular que ya hay en la cocina, y sirve igual para el menú digital y para las redes del local.',
    actualizado: REVISADO,
    secciones: [
      {
        h2: 'La luz decide el video, no el celular',
        parrafos: [
          'La comida se ve apetitosa cuando la luz llega de un lado y un poco por detrás: así el vapor se ve, la salsa brilla y la textura tiene relieve. La luz de frente aplana el plato y la luz cenital de la cocina lo pone gris.',
          'La mejor fuente gratis es una ventana. Pon el plato al lado, con la ventana a un costado, y usa una cartulina blanca del otro lado para devolver algo de luz a la sombra. Con eso solo, un celular normal graba mejor que una cámara cara bajo los fluorescentes de la cocina.',
          'Lo que hay que evitar siempre: mezclar la luz cálida de las bombillas con la luz fría de la ventana. El plato sale de dos colores y no hay forma de arreglarlo después.',
        ],
      },
      {
        h2: 'Los cuatro planos que resuelven cualquier plato',
        lista: [
          'Cenital, desde arriba: para pizzas, tablas, ensaladas y todo lo que sea plano.',
          'A 45 grados, la altura a la que uno ve su propio plato: el más natural, y el que mejor funciona para casi todo.',
          'Frontal y muy cerca: para hamburguesas, sánduches y capas apiladas, donde la altura es el argumento.',
          'Detalle en movimiento: el corte, la cuchara entrando, el queso estirándose, la salsa cayendo. Es el plano que hace que alguien pida el plato.',
        ],
      },
      {
        h2: 'Cómo grabar cada toma',
        pasos: [
          {
            titulo: 'Graba en vertical y no lo gires después',
            texto:
              'El menú y las redes son verticales. Un video horizontal recortado a vertical pierde la mitad del plato o queda con franjas negras.',
          },
          {
            titulo: 'Monta el plato como se sirve, y grábalo recién salido',
            texto:
              'El vapor dura menos de un minuto y la lechuga se cae poco después. Ten la cámara lista antes de que salga el plato, no al revés.',
          },
          {
            titulo: 'Mueve la cámara despacio, o no la muevas',
            texto:
              'Un desplazamiento lento y corto, apoyando los codos en la mesa. Si no puedes hacerlo estable, deja la cámara quieta y que se mueva el plato: la mano que corta, la cuchara que sirve.',
          },
          {
            titulo: 'Graba de más y corta después',
            texto:
              'Diez o quince segundos por toma para quedarte con seis. Es gratis y evita repetir el montaje del plato.',
          },
          {
            titulo: 'Encadena la sesión por tandas',
            texto:
              'Toda una categoría seguida, con el mismo sitio y la misma luz. La carta queda coherente y se hace en una fracción del tiempo.',
          },
        ],
      },
      {
        h2: 'Errores que se ven de inmediato',
        lista: [
          'Grabar bajo la luz de la cocina: todo sale verdoso o naranja.',
          'Usar el zoom digital en vez de acercar el celular: la imagen se deshace.',
          'Fondos con desorden: bandejas, manos, cables. Un mantel liso resuelve el 90 %.',
          'Videos largos. Pasados quince segundos, en una carta nadie los termina.',
          'Depender del sonido o de un texto en pantalla: el menú se ve en silencio y a veces en pantallas pequeñas.',
          'Grabar el plato de la foto y servir otro. Es la única falta que el comensal nota en la mesa.',
        ],
      },
    ],
    faq: [
      {
        pregunta: '¿Necesito un celular de gama alta?',
        respuesta:
          'No. Cualquier celular de los últimos años graba con calidad de sobra para una carta. La diferencia entre un video bueno y uno malo la marcan la luz, el montaje del plato y el encuadre, no el sensor.',
      },
      {
        pregunta: '¿Cuánto debe durar el video de un plato?',
        respuesta:
          'Entre seis y quince segundos. Lo suficiente para ver el plato completo y un detalle en movimiento, y lo bastante corto para que el comensal recorra la carta sin impacientarse.',
      },
      {
        pregunta: '¿Hace falta editar los videos?',
        respuesta:
          'Basta con recortar el principio y el final. Filtros fuertes o correcciones de color agresivas juegan en contra: si el plato en pantalla no se parece al que llega a la mesa, la expectativa se rompe donde más se nota.',
      },
    ],
    relacionadas: ['menu-digital-con-video', 'como-crear-un-menu-digital-para-restaurante', 'que-es-un-menu-digital'],
  },

  {
    slug: 'menu-digital-en-colombia',
    ruta: '/guias/menu-digital-en-colombia',
    coleccion: 'guia',
    titulo: 'Menú digital en Colombia: cuánto cuesta y qué tener en cuenta',
    descripcion:
      'Qué cuesta un menú digital para un restaurante en Colombia, cómo hacer la cuenta contra imprimir cartas y qué conviene resolver antes de montarlo.',
    h1: 'Menú digital en Colombia',
    entradilla:
      'Las guías de menú digital suelen estar escritas para otro mercado: hablan en euros, dan por hecha una conexión estable y no mencionan el efectivo. Esta está escrita para un restaurante en Colombia, con la cuenta en pesos y los problemas que aparecen de verdad en el salón.',
    actualizado: REVISADO,
    secciones: [
      {
        h2: 'La cuenta contra imprimir cartas',
        parrafos: [
          'La comparación útil no es "cuota mensual contra cero", sino cuota mensual contra lo que cuesta mantener la carta impresa al día durante un año. En esa cuenta entran la impresión, el diseño de cada versión nueva, las cartas que se manchan o se pierden, y las que quedan inservibles cada vez que sube un precio.',
          'Un restaurante que reajusta precios dos o tres veces al año y tiene entre veinte y cuarenta cartas en circulación suele descubrir que ya estaba gastando el equivalente a varias mensualidades solo en reimpresiones, sin contar el tiempo del administrador.',
          'Los planes de Bitemo se facturan en pesos colombianos y con pago anual equivalen a diez mensualidades. En la página principal está el precio vigente de cada uno: se leen de la base de datos, así que lo que aparece ahí es lo que se cobra.',
        ],
      },
      {
        h2: 'Lo que hay que resolver antes, y es local',
        lista: [
          'La conexión del comensal. Muchos van a abrir la carta con datos móviles, no con el wifi del local. Si el menú depende de descargar archivos pesados, en hora pico no abre.',
          'El wifi para invitados. Si lo tienes, que la clave esté visible en la mesa: es lo primero que pregunta quien va a escanear.',
          'Los platos por peso o por porción variable. Deja claro en la descripción qué incluye el precio; en carta impresa lo aclara el mesero.',
          'El efectivo. Un menú digital resuelve la carta y el pedido; el cobro sigue en caja como siempre.',
          'El impuesto al consumo y la propina. Van en la cuenta, no en la carta, y conviene que la carta no dé a entender otra cosa.',
        ],
      },
      {
        h2: 'Por qué el menú también es un canal de captación',
        parrafos: [
          'En Colombia, buena parte de la decisión de a dónde ir a comer pasa por Instagram y por buscar el nombre del restaurante en Google. Un menú digital con dirección web propia funciona en los dos sitios: se comparte como enlace en el perfil y puede aparecer cuando alguien busca el restaurante por su nombre.',
          'Esa es la diferencia entre un menú que solo sirve dentro del local y uno que también trabaja fuera. En Bitemo cada restaurante tiene una carta pública en su propia dirección, pensada para compartirse y para ser encontrada, aparte del menú con pedido que se abre desde el QR de la mesa.',
        ],
      },
    ],
    faq: [
      {
        pregunta: '¿Cuánto cuesta un menú digital para un restaurante en Colombia?',
        respuesta:
          'Depende de si es solo carta o incluye pedido desde la mesa y panel de cocina. Bitemo tiene tres planes en pesos colombianos, desde el que publica la carta con video hasta el que suma personalización de marca, carrito y pantalla de cocina; el precio vigente de cada uno está en la página principal.',
      },
      {
        pregunta: '¿Funciona si el restaurante no tiene buen wifi?',
        respuesta:
          'Sí, porque la mayoría de los comensales entra con sus propios datos. Lo que importa es que la carta sea liviana y que el video se sirva con calidad adaptativa, de modo que con señal débil baje la resolución en lugar de quedarse cargando.',
      },
      {
        pregunta: '¿Sirve para restaurantes fuera de las ciudades grandes?',
        respuesta:
          'Sí. No hace falta instalar equipos ni cambiar la caja: se necesita un celular para administrar la carta y los códigos QR impresos en las mesas. Donde encaja mal es en negocios sin mesa, porque una parte del valor está en identificar dónde está sentado el comensal.',
      },
    ],
    relacionadas: [
      'que-es-un-menu-digital',
      'menu-digital-vs-carta-impresa',
      'como-crear-un-menu-digital-para-restaurante',
    ],
  },
];

// Índice por slug. Las rutas se resuelven por slug y no por la ruta completa
// porque /guias/x y /x comparten espacio de nombres: un slug es único en todo
// el sitio, y así un enlace interno solo necesita el slug.
const PORSLUG = new Map(PAGINAS.map((p) => [p.slug, p]));

export const buscarPorSlug = (slug) => PORSLUG.get(slug) || null;
export const listarPorColeccion = (coleccion) => PAGINAS.filter((p) => p.coleccion === coleccion);
