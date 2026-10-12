import { useEffect, useRef, useState } from 'react';

// Observa una lista de refs (uno por slide) y devuelve el indice del que esta
// mas visible en pantalla. threshold alto (>0.6) evita "dobles reproducciones"
// durante el scroll entre dos videos.
export function useActiveSlide(count) {
  const [activeIndex, setActiveIndex] = useState(0);
  const refs = useRef([]);
  refs.current = Array(count)
    .fill(null)
    .map((_, i) => refs.current[i] || null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        let best = null;
        for (const entry of entries) {
          if (entry.isIntersecting && (!best || entry.intersectionRatio > best.intersectionRatio)) {
            best = entry;
          }
        }
        if (best) {
          const idx = Number(best.target.dataset.index);
          setActiveIndex(idx);
        }
      },
      { threshold: [0.6, 0.75, 0.9] }
    );

    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [count]);

  const setRef = (index) => (el) => {
    refs.current[index] = el;
  };

  // Salta a un slide concreto. Sin `behavior: smooth` a propósito: quien llega
  // por un enlace compartido tiene que aparecer YA en ese plato, no ver pasar
  // en scroll todos los anteriores.
  const irA = (index) => {
    const el = refs.current[index];
    if (!el) return;
    el.scrollIntoView({ block: 'start' });

    // El índice se fija a mano además de scrollear. El observador acaba de
    // registrarse y su PRIMERA notificación describe la pantalla de antes del
    // salto (el slide 0), así que llega tarde y pisa el índice correcto. El
    // síntoma no es cosmético: `isActive` es quien arranca el video, y sin esto
    // suena el del primer plato mientras en pantalla se ve otro.
    setActiveIndex(index);
  };

  return { activeIndex, setRef, irA };
}
