export function Tabla({ columnas, children }) {
  return (
    <div className="overflow-x-auto border border-line rounded-2xl bg-surface shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            {columnas.map((c) => (
              <th
                key={c}
                className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted border-b border-line whitespace-nowrap"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line [&>tr:hover]:bg-base">{children}</tbody>
      </table>
    </div>
  );
}
