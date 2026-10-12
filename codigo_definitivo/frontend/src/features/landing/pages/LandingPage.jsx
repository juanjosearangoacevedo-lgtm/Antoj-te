import { useEffect, useState } from 'react';
import '@/features/landing/pages/LandingPage.css';
import LandingNav from '@/features/landing/components/LandingNav';
import Hero from '@/features/landing/components/Hero';
import ComoFunciona from '@/features/landing/components/ComoFunciona';
import Beneficios from '@/features/landing/components/Beneficios';
import Precios from '@/features/landing/components/Precios';
import Preguntas from '@/features/landing/components/Preguntas';
import Contacto from '@/features/landing/components/Contacto';
import CTAFinal from '@/features/landing/components/CTAFinal';
import LandingFooter from '@/features/landing/components/LandingFooter';

// Página pública de la plataforma (ruta /). El menú del comensal vive en /menu.
export default function LandingPage() {
  // El plan vive aquí, y no dentro de Precios, porque lo elige una sección y lo
  // usa otra: al pulsar "Solicitar una cuenta" en una tarjeta, el formulario de
  // abajo tiene que abrirse con ese plan ya puesto.
  const [planElegido, setPlanElegido] = useState(null);

  // Llegar con un ancla (/#contacto desde "Solicítala aquí" del login, o un
  // enlace compartido a /#precios) no baja solo: cuando el navegador busca la
  // sección, React aún no la ha pintado. Se baja aquí, ya montada la página.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);

  return (
    <div className="landing-page superficie-plataforma min-h-[100dvh] bg-base">
      <LandingNav />
      <main>
        <Hero />
        <ComoFunciona />
        <Beneficios />
        <Precios onElegirPlan={setPlanElegido} />
        <Preguntas />
        <Contacto planPreseleccionado={planElegido} />
        <CTAFinal />
      </main>
      <LandingFooter />
    </div>
  );
}
