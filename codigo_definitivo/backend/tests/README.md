# Pruebas del backend

Se ejecutan con el runner que trae Node (no hay Jest ni Vitest, cero dependencias):

```bash
npm test
```

## Qué se prueba aquí

`tests/unit/` cubre lo que **no necesita base de datos**: errores, JWT, middlewares
y validadores. Son las piezas que atraviesan todas las peticiones, así que un fallo
ahí se nota en toda la API.

```
tests/unit/
  errors.test.js                       Cada subclase con su código HTTP + el errorHandler
  utils/jwt.test.js                    Firmar, verificar, token manipulado
  middlewares/auth.test.js             authenticate, authorize y el aislamiento multi-tenant
  middlewares/validar.test.js          Rechazo, coerción de tipos y campos no declarados
  validators/*.test.js                 Los esquemas de cada recurso
```

## Convención

- Un archivo de prueba por módulo, en la misma ruta que en `src/`.
- Nombres de prueba en español y en indicativo: describen lo que el sistema hace
  (`'authenticate acepta un Bearer valido'`), no lo que el test hace.
- Cada prueba deja claro **por qué importa**. Si una regla existe para evitar un bug
  concreto, se anota en un comentario para que nadie la "simplifique" después.

## Lo que todavía no se prueba

Los services y models hablan con MySQL, así que probarlos exige una base de datos de
pruebas aparte (nunca la de desarrollo: los tests escribirían sobre datos reales).
Cuando haga falta, lo natural es levantar un MySQL desechable con Docker, cargar
`migrations/bitemo_completo.sql` y añadir `tests/integracion/`.
