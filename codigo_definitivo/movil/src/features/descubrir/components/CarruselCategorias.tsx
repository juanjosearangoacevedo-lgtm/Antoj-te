import { LayoutGrid } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Texto } from '@/shared/components/ui';
import { colores, espacio, radios } from '@/shared/theme';
import { iconoCategoria } from './iconos';

interface Categoria {
  id: string;
  nombre: string;
  total: number;
}

// Las categorías reales de las cartas, en una fila deslizable. Tocar una la suma
// a los antojos (o la quita); "Todo" las quita todas. Es el mismo estado que la
// hoja ANTOJATE: elegir aquí o allá da lo mismo.
export function CarruselCategorias({
  categorias,
  seleccion,
  onAlternar,
  onTodo,
}: {
  categorias: Categoria[];
  seleccion: string[];
  onAlternar: (id: string) => void;
  onTodo: () => void;
}) {
  const ninguna = !categorias.some((c) => seleccion.includes(c.id));

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.fila}>
      <Mosaico etiqueta="Todo" activo={ninguna} onPress={onTodo} icono={<LayoutGrid color={ninguna ? '#ffffff' : colores.texto} size={24} />} />
      {categorias.map((c) => {
        const activo = seleccion.includes(c.id);
        const Icono = iconoCategoria(c.nombre);
        return (
          <Mosaico
            key={c.id}
            etiqueta={c.nombre}
            detalle={`${c.total}`}
            activo={activo}
            onPress={() => onAlternar(c.id)}
            icono={<Icono color={activo ? '#ffffff' : colores.texto} size={24} />}
          />
        );
      })}
    </ScrollView>
  );
}

function Mosaico({
  etiqueta,
  detalle,
  activo,
  onPress,
  icono,
}: {
  etiqueta: string;
  detalle?: string;
  activo: boolean;
  onPress: () => void;
  icono: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: activo }}
      accessibilityLabel={detalle ? `${etiqueta}, ${detalle} platos` : etiqueta}
      style={({ pressed }) => [estilos.mosaico, activo ? estilos.activo : null, pressed ? estilos.presionado : null]}
    >
      <View style={[estilos.circulo, activo ? estilos.circuloActivo : null]}>{icono}</View>
      <Texto
        variante="pequeno"
        peso="seminegrita"
        numberOfLines={2}
        style={[estilos.etiqueta, activo ? estilos.textoActivo : null]}
      >
        {etiqueta}
      </Texto>
      {detalle ? (
        <Texto variante="pequeno" color={activo ? 'texto' : 'textoSuave'} style={estilos.detalle}>
          {detalle} {Number(detalle) === 1 ? 'plato' : 'platos'}
        </Texto>
      ) : null}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  fila: { gap: espacio.s, paddingHorizontal: espacio.xl },
  mosaico: {
    width: 100,
    alignItems: 'center',
    gap: 6,
    paddingVertical: espacio.m,
    paddingHorizontal: espacio.xs,
    borderRadius: radios.grande,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.linea,
  },
  activo: { backgroundColor: colores.marca, borderColor: colores.marca },
  presionado: { transform: [{ scale: 0.96 }] },
  circulo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.superficieAlta,
  },
  circuloActivo: { backgroundColor: 'rgba(255,255,255,0.18)' },
  // Dos líneas como máximo ("Platos Fuertes" no cabe en una), centradas.
  etiqueta: { textAlign: 'center', lineHeight: 17 },
  textoActivo: { color: '#ffffff' },
  detalle: { fontSize: 11, lineHeight: 14, marginTop: -4 },
});
