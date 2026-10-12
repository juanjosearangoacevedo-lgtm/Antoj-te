/** @type {import('tailwindcss').Config} */
// Los colores apuntan a CSS variables: :root define la superficie del comensal
// (oscura, personalizable por restaurante) y .superficie-plataforma la del
// panel staff (clara). Los valores viven en index.css.
// Nota: los modificadores de opacidad (bg-x/15) NO funcionan sobre colores
// var(); usar los tokens -soft explícitos.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base: 'var(--c-base)',
        surface: 'var(--c-surface)',
        surface2: 'var(--c-surface2)',
        line: 'var(--c-line)',
        cream: 'var(--c-cream)',
        muted: 'var(--c-muted)',
        brand: 'var(--brand)',
        amber: {
          DEFAULT: 'var(--c-primario)',
          dim: 'var(--c-primario-dim)',
          soft: 'var(--c-primario-soft)',
        },
        accent: {
          DEFAULT: 'var(--c-primario)',
          dim: 'var(--c-primario-dim)',
          soft: 'var(--accent-soft)',
        },
        boton: 'var(--c-boton)',
        botontxt: 'var(--c-boton-texto)',
        ok: {
          DEFAULT: 'var(--ok)',
          soft: 'var(--ok-soft)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          soft: 'var(--danger-soft)',
        },
        // Alias históricos (chile/sage): hex fijos porque varias vistas aún
        // usan modificadores de opacidad sobre ellos; se retiran en la migración.
        chile: '#dc2626',
        sage: {
          DEFAULT: '#15803d',
          dim: '#166534',
        },
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        sans: 'var(--font-body)',
        mono: ['ui-monospace', 'Cascadia Code', 'Segoe UI Mono', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: {
        card: 'var(--radio-tarjetas)',
        boton: 'var(--radio-boton)',
      },
      spacing: {
        // Aire entre elementos, configurable desde el panel
        aire: 'var(--espaciado)',
      },
      height: {
        categoria: 'var(--alto-categoria)',
      },
      boxShadow: {
        sm: 'var(--sombra-sm)',
        card: 'var(--sombra-md)',
        sheet: '0 -12px 40px -12px rgba(0, 0, 0, 0.4)',
      },
      transitionDuration: {
        fast: '150ms',
        base: '200ms',
        slow: '250ms',
      },
      transitionTimingFunction: {
        salida: 'cubic-bezier(0.22, 1, 0.36, 1)',
        resorte: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        heartburst: {
          '0%': { transform: 'scale(0.4)', opacity: '0' },
          '35%': { transform: 'scale(1.15)', opacity: '1' },
          '70%': { transform: 'scale(0.95)', opacity: '1' },
          '100%': { transform: 'scale(0.9)', opacity: '0' },
        },
        risein: {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulsedot: {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '1' },
        },
        ticketIn: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        scalein: {
          '0%': { transform: 'scale(0.97)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        heartburst: 'heartburst 700ms ease-out forwards',
        risein: 'risein 200ms cubic-bezier(0.22,1,0.36,1) forwards',
        pulsedot: 'pulsedot 1.4s ease-in-out infinite',
        ticketIn: 'ticketIn 250ms cubic-bezier(0.16,1,0.3,1) forwards',
        scalein: 'scalein 250ms cubic-bezier(0.16,1,0.3,1) forwards',
      },
    },
  },
  plugins: [],
};
