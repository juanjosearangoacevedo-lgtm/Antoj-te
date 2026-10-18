import {
  Beef,
  Beer,
  CakeSlice,
  Coffee,
  Croissant,
  CupSoda,
  Drumstick,
  Fish,
  IceCreamCone,
  Pizza,
  Salad,
  Sandwich,
  Soup,
  UtensilsCrossed,
  Wine,
  type LucideIcon,
} from 'lucide-react-native';
import { normalizar } from '../logica/antojos';

// Ícono para una categoría, adivinado por su nombre. Es solo presentación: si no
// se reconoce, va el de cubiertos. Las categorías las escribe cada restaurante,
// así que la lista crece con lo que se vaya viendo en las cartas reales.
const REGLAS: [RegExp, LucideIcon][] = [
  [/postre|dulce|reposter|torta|pastel/, CakeSlice],
  [/helad/, IceCreamCone],
  [/bebida|jugo|soda|limonada|batido|malteada/, CupSoda],
  [/cafe|tinto/, Coffee],
  [/vino|coctel|trago/, Wine],
  [/cerveza/, Beer],
  [/entrada|ensalada|picad/, Salad],
  [/hamburgues|sandwich|sanduche/, Sandwich],
  [/pizza/, Pizza],
  [/sushi|mar|pescad|ceviche/, Fish],
  [/pollo|alita/, Drumstick],
  [/sopa|crema|caldo/, Soup],
  [/panader|desayuno|pan/, Croissant],
  [/carne|parrilla|fuerte|asado/, Beef],
];

export function iconoCategoria(nombre: string): LucideIcon {
  const texto = normalizar(nombre);
  return REGLAS.find(([regla]) => regla.test(texto))?.[1] ?? UtensilsCrossed;
}
