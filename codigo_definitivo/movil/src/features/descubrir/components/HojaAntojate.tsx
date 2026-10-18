import { X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useConteoAntojos } from '@/features/feed/hooks/useFeed';
import { Boton, Chip, HojaInferior, MascotaAntojate, Texto } from '@/shared/components/ui';
import { colores, espacio, radios } from '@/shared/theme';
import type { Grupo } from '../logica/antojos';

// La hoja que abre el botón ANTOJATE. La persona marca lo que se le antoja y,
// mientras elige, el botón de abajo le dice cuántos platos reales coinciden (lo
// cuenta el backend, con la misma regla con la que filtra el feed); al
// confirmar, el inicio se ajusta. Nada cambia hasta confirmar: cerrar la hoja
// descarta lo que se marcó.
//
// Las opciones sin datos detrás (ocasiones, dietas, intenciones) van al final,
// marcadas como "Pronto": se ven, para que se sepa que vienen, pero no se tocan.
export function HojaAntojate({
  visible,
  grupos,
  seleccion,
  onAplicar,
  onCerrar,
}: {
  visible: boolean;
  grupos: Grupo[];
  seleccion: string[];
  onAplicar: (seleccion: string[]) => void;
  onCerrar: () => void;
}) {
  const [borrador, setBorrador] = useState(seleccion);

  // Cada vez que se abre, parte de lo que ya estaba elegido.
  useEffect(() => {
    if (visible) setBorrador(seleccion);
  }, [visible, seleccion]);

  const { total, alDia } = useConteoAntojos(borrador, visible);
  const alternar = (id: string) => setBorrador((b) => (b.includes(id) ? b.filter((x) => x !== id) : [...b, id]));

  const disponibles = grupos.filter((g) => !g.pronto);
  const pronto = grupos.filter((g) => g.pronto);
  // Mientras llega la cifra nueva se enseña la anterior; sin ninguna, un texto neutro.
  const tituloAccion =
    total === null
      ? 'Ver platos'
      : !borrador.length
        ? `Ver todos los platos (${total})`
        : total
          ? `Ver ${total} ${total === 1 ? 'plato' : 'platos'}`
          : 'Ningún plato coincide';

  return (
    <HojaInferior visible={visible} onCerrar={onCerrar} etiquetaCerrar="Cerrar sin cambiar" altoMaximo="88%">
      <View style={estilos.cabecera}>
        <MascotaAntojate expresion="curioso" tamano={60} />
        <View style={estilos.titulos}>
          <Texto variante="titulo" style={estilos.titulo}>
            ¿Qué se te antoja?
          </Texto>
          <Texto variante="pequeno" color="textoSuave">
            Elige lo que quieras y ajustamos tu inicio.
          </Texto>
        </View>
        <Pressable onPress={onCerrar} accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={10} style={estilos.cerrar}>
          <X color={colores.texto} size={20} />
        </Pressable>
      </View>

      <ScrollView style={estilos.lista} contentContainerStyle={estilos.contenido} showsVerticalScrollIndicator={false}>
        {disponibles.map((grupo) => (
          <View key={grupo.id} style={estilos.grupo}>
            <Texto peso="seminegrita">{grupo.titulo}</Texto>
            <View style={estilos.chips}>
              {grupo.opciones.map((o) => (
                <Chip key={o.id} etiqueta={o.etiqueta} activo={borrador.includes(o.id)} onPress={() => alternar(o.id)} />
              ))}
            </View>
          </View>
        ))}

        {pronto.length ? (
          <View style={estilos.pronto}>
            <View style={estilos.separador}>
              <View style={estilos.raya} />
              <Texto variante="pequeno" peso="negrita" color="textoSuave" style={estilos.textoSeparador}>
                MUY PRONTO
              </Texto>
              <View style={estilos.raya} />
            </View>
            <Texto variante="pequeno" color="textoSuave">
              Para buscar por ocasión, dieta o plan, los restaurantes tienen que etiquetar sus platos. Las activamos en
              cuanto lo hagan.
            </Texto>
            {pronto.map((grupo) => (
              <View key={grupo.id} style={estilos.grupo}>
                <Texto peso="seminegrita" color="textoSuave">
                  {grupo.titulo}
                </Texto>
                <View style={estilos.chips}>
                  {grupo.opciones.map((o) => (
                    <Chip key={o.id} etiqueta={o.etiqueta} pronto />
                  ))}
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={estilos.pie}>
        <Boton
          titulo="Limpiar"
          variante="secundario"
          onPress={() => setBorrador([])}
          deshabilitado={!borrador.length}
          style={estilos.limpiar}
        />
        <Boton
          titulo={tituloAccion}
          onPress={() => onAplicar(borrador)}
          // Solo se bloquea con la cifra al día: con una vieja se podría
          // bloquear una combinación que sí tiene platos.
          deshabilitado={borrador.length > 0 && alDia && total === 0}
          style={estilos.aplicar}
        />
      </View>
    </HojaInferior>
  );
}

const estilos = StyleSheet.create({
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.m,
    paddingHorizontal: espacio.xl,
    paddingTop: espacio.m,
    paddingBottom: espacio.s,
  },
  titulos: { flex: 1, gap: 2 },
  titulo: { fontSize: 24, lineHeight: 28 },
  cerrar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.superficieAlta,
  },
  lista: { flexGrow: 0 },
  contenido: { paddingHorizontal: espacio.xl, paddingVertical: espacio.m, gap: espacio.xl },
  grupo: { gap: espacio.s },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.s },
  pronto: { gap: espacio.l },
  separador: { flexDirection: 'row', alignItems: 'center', gap: espacio.s },
  raya: { flex: 1, height: 1, backgroundColor: colores.linea },
  textoSeparador: { letterSpacing: 1.4, fontSize: 11 },
  pie: {
    flexDirection: 'row',
    gap: espacio.s,
    paddingHorizontal: espacio.xl,
    paddingTop: espacio.m,
    borderTopWidth: 1,
    borderTopColor: colores.linea,
  },
  limpiar: { borderRadius: radios.pildora },
  aplicar: { flex: 1, borderRadius: radios.pildora },
});
