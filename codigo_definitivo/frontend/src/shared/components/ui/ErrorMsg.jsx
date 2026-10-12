export function ErrorMsg({ error }) {
  if (!error) return null;
  return (
    <div className="bg-danger-soft text-danger text-sm rounded-xl px-4 py-2.5 mb-4">{error}</div>
  );
}
