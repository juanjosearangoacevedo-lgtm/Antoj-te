import { useCallback, useEffect, useState } from 'react';

// Tema del panel staff: 'oscuro' (por defecto) | 'claro'.
// Se aplica como atributo data-staff-tema en <html>; el CSS de
// .superficie-plataforma reacciona a ese atributo.
const KEY = 'bitemo_staff_tema';

// El bootstrap (main.jsx) llama a esto ANTES del primer render para que el
// panel no parpadee en oscuro antes de pintarse en claro.
export function aplicarTemaStaffGuardado() {
  document.documentElement.setAttribute('data-staff-tema', localStorage.getItem(KEY) || 'oscuro');
}

export function useTemaStaff() {
  const [tema, setTema] = useState(() => localStorage.getItem(KEY) || 'oscuro');

  // Efectos secundarios fuera del updater (el updater debe ser puro).
  useEffect(() => {
    localStorage.setItem(KEY, tema);
    document.documentElement.setAttribute('data-staff-tema', tema);
  }, [tema]);

  const alternar = useCallback(() => {
    setTema((actual) => (actual === 'oscuro' ? 'claro' : 'oscuro'));
  }, []);

  return { tema, alternar };
}
