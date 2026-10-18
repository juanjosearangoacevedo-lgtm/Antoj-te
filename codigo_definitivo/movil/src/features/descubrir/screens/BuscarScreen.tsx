import { Search } from 'lucide-react-native';
import { useEspacioBarra } from '@/navigation/BarraFlotante';
import { Vacio } from '@/shared/components/estados';
import { Pantalla, Texto } from '@/shared/components/ui';

// Pestaña Buscar: antojos, ocasiones, filtros y búsqueda por intención (fase 3).
export default function BuscarScreen() {
  return (
    <Pantalla espacioInferior={useEspacioBarra()}>
      <Texto variante="titulo">Buscar</Texto>
      <Vacio
        icono={Search}
        titulo="¿Qué se te antoja?"
        descripcion="Busca por antojo, ocasión, zona o presupuesto, o escríbelo como lo dirías. Llega en la fase 3."
      />
    </Pantalla>
  );
}
