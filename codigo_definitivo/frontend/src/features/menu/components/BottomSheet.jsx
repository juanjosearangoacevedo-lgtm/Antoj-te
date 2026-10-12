import { X } from 'lucide-react';

export default function BottomSheet({ open, onClose, children, title, maxHeight = '80vh' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="relative w-full sm:max-w-md bg-surface rounded-t-3xl border-t border-line shadow-sheet animate-ticketIn overflow-hidden"
        style={{ maxHeight }}
      >
        <div className="flex items-center justify-center pt-3">
          <div className="h-1.5 w-10 rounded-full bg-line" />
        </div>
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <h3 className="font-display text-xl text-cream">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="grid place-items-center w-9 h-9 rounded-full bg-surface2 text-cream active:scale-90 transition-transform"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-6 no-scrollbar" style={{ maxHeight: `calc(${maxHeight} - 80px)` }}>
          {children}
        </div>
      </div>
    </div>
  );
}
