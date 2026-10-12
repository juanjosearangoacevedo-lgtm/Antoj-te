import { claseInput } from './estilosCampo';

export function Input({ invalido, valido, className = '', ...props }) {
  return <input className={`${claseInput(invalido, valido)} ${className}`} {...props} />;
}
