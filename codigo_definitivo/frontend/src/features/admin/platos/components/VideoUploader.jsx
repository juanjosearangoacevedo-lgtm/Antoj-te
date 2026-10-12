import { useRef, useState } from 'react';
import * as tus from 'tus-js-client';
import { UploadCloud, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { staffApi } from '@/shared/services/staffApi';

// Sube el video DIRECTO del navegador a Bunny (resumible/TUS). El backend solo
// firma la credencial; el archivo nunca pasa por nuestro servidor.
// Al terminar la subida avisa con onUploaded({ video_url, video_guid, video_thumbnail_url }).
export default function VideoUploader({ value, onUploaded }) {
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const subir = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setError('El archivo debe ser un video (.mp4, .mov, .webm…).');
      return;
    }
    setError(null);
    setSubiendo(true);
    setProgreso(0);
    try {
      const cred = await staffApi.platos.solicitarSubidaVideo(file.name);
      await new Promise((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: cred.tusEndpoint,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: {
            AuthorizationSignature: cred.signature,
            AuthorizationExpire: cred.expiration,
            LibraryId: cred.libraryId,
            VideoId: cred.videoGuid,
          },
          metadata: { filetype: file.type, title: file.name },
          onError: reject,
          onProgress: (enviado, total) => setProgreso(Math.round((enviado / total) * 100)),
          onSuccess: resolve,
        });
        upload.start();
      });
      onUploaded({
        video_url: cred.video_url,
        video_guid: cred.videoGuid,
        video_thumbnail_url: cred.video_thumbnail_url,
      });
    } catch (e) {
      setError(e?.message || 'No se pudo subir el video. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setSubiendo(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (!subiendo) subir(e.dataTransfer.files?.[0]);
  };

  const yaSubido = !!value && !subiendo;

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => subir(e.target.files?.[0])}
      />

      <button
        type="button"
        onClick={() => !subiendo && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        disabled={subiendo}
        className={`w-full rounded-xl border border-dashed px-4 py-6 flex flex-col items-center justify-center gap-2 text-center transition-colors ${
          dragOver ? 'border-amber bg-accent-soft' : 'border-line hover:border-muted'
        } ${subiendo ? 'cursor-wait' : 'cursor-pointer'}`}
      >
        {subiendo ? (
          <>
            <Loader2 className="w-6 h-6 text-amber animate-spin" />
            <span className="text-sm text-cream font-medium">Subiendo… {progreso}%</span>
            <div className="w-full max-w-xs h-2 rounded-full bg-surface2 overflow-hidden">
              <div className="h-full bg-amber transition-[width] duration-200" style={{ width: `${progreso}%` }} />
            </div>
          </>
        ) : yaSubido ? (
          <>
            <CheckCircle2 className="w-6 h-6 text-ok" />
            <span className="text-sm text-cream font-medium">Video cargado</span>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted">
              <RefreshCw className="w-3.5 h-3.5" /> Haz clic para reemplazarlo
            </span>
          </>
        ) : (
          <>
            <UploadCloud className="w-6 h-6 text-muted" />
            <span className="text-sm text-cream font-medium">Arrastra el video o haz clic para elegirlo</span>
            <span className="text-xs text-muted">Vertical (9:16) recomendado · se optimiza solo para móvil</span>
          </>
        )}
      </button>

      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-danger">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}
