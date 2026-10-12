import { claseInput } from './estilosCampo';

export function Select({ children, invalido, valido, className = '', ...props }) {
  return (
    <select className={`${claseInput(invalido, valido)} ${className}`} {...props}>
      {children}
    </select>
  );
}
