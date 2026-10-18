import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, X } from 'lucide-react-native';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { PlatoFeed } from '@/shared/api/esquemas';
import { feed } from '@/shared/api/feed';
import { HojaInferior, Texto } from '@/shared/components/ui';
import { colores, espacio, radios } from '@/shared/theme';
import { formatearPrecio } from '@/shared/utils/formato';

// La ficha del plato, sobre el video: la descripción entera y los ingredientes
// con sus alérgenos, tal como los cargó el restaurante. Si el restaurante no
// cargó ingredientes, se dice así; no se adivinan a partir de la descripción.

export function HojaDetalle({ plato, onCerrar }: { plato: PlatoFeed | null; onCerrar: () => void }) {
  const detalle = useQuery({
    queryKey: ['feed', 'detalle', plato?.id],
    queryFn: ({ signal }) => feed.detalle(plato!.id, signal),
    enabled: Boolean(plato),
    staleTime: 5 * 60_000,
  });

  if (!plato) return null;
  const ingredientes = detalle.data?.ingredientes ?? [];
  const alergenos = ingredientes.filter((i) => i.es_alergeno);

  return (
    <HojaInferior visible onCerrar={onCerrar} altoMaximo="80%">
      <View style={estilos.cabecera}>
        <View style={estilos.titulos}>
          <Texto variante="titulo" style={estilos.titulo}>
            {plato.nombre}
          </Texto>
          <Texto variante="pequeno" color="textoSuave">
            {plato.restaurante.nombre}
            {plato.categoria ? ` · ${plato.categoria}` : ''}
          </Texto>
        </View>
        <Pressable onPress={onCerrar} accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={10} style={estilos.cerrar}>
          <X color={colores.texto} size={20} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={estilos.contenido} showsVerticalScrollIndicator={false}>
        <Texto variante="destacado" color="marcaClara">
          {formatearPrecio(plato.precio)}
        </Texto>
        {plato.descripcion ? <Texto>{plato.descripcion}</Texto> : null}

        <View style={estilos.seccion}>
          <Texto peso="seminegrita">Ingredientes</Texto>
          {detalle.isPending ? (
            <ActivityIndicator color={colores.marca} style={{ alignSelf: 'flex-start' }} />
          ) : detalle.isError ? (
            <Texto variante="pequeno" color="textoSuave">
              No pudimos cargar los ingredientes ahora.
            </Texto>
          ) : ingredientes.length ? (
            <View style={estilos.chips}>
              {ingredientes.map((i) => (
                <View key={i.id} style={[estilos.chip, i.es_alergeno ? estilos.chipAlergeno : null]}>
                  <Texto variante="pequeno" peso={i.es_alergeno ? 'seminegrita' : undefined} style={i.es_alergeno ? estilos.textoAlergeno : null}>
                    {i.nombre}
                  </Texto>
                </View>
              ))}
            </View>
          ) : (
            <Texto variante="pequeno" color="textoSuave">
              El restaurante todavía no cargó los ingredientes de este plato.
            </Texto>
          )}
        </View>

        {alergenos.length ? (
          <View style={estilos.aviso}>
            <AlertTriangle color={colores.mazorca} size={18} />
            <Texto variante="pequeno" style={{ flex: 1 }}>
              Contiene alérgenos: {alergenos.map((a) => a.nombre).join(', ')}. Si tienes una alergia, confírmalo con el
              restaurante.
            </Texto>
          </View>
        ) : null}
      </ScrollView>
    </HojaInferior>
  );
}

const estilos = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'flex-start', gap: espacio.m, paddingHorizontal: espacio.xl, paddingTop: espacio.m },
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
  contenido: { paddingHorizontal: espacio.xl, paddingVertical: espacio.l, gap: espacio.l },
  seccion: { gap: espacio.s },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.s },
  chip: {
    paddingHorizontal: espacio.m,
    paddingVertical: 6,
    borderRadius: radios.pildora,
    backgroundColor: colores.superficieAlta,
    borderWidth: 1,
    borderColor: colores.linea,
  },
  chipAlergeno: { borderColor: colores.mazorca },
  textoAlergeno: { color: colores.mazorca },
  aviso: {
    flexDirection: 'row',
    gap: espacio.s,
    padding: espacio.m,
    borderRadius: radios.tarjeta,
    backgroundColor: 'rgba(246, 185, 49, 0.12)',
  },
});
