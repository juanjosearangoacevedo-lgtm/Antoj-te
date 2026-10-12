import { claseInput } from './estilosCampo';

export function Textarea({ invalido, valido, className = '', ...props }) {
  return <textarea className={`${claseInput(invalido, valido)} min-h-[88px] ${className}`} {...props} />;
}
