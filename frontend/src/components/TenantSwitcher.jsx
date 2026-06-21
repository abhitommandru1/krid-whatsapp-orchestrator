export default function TenantSwitcher({ tenants, active, onChange }) {
  return (
    <div className="glass rounded-full p-1 flex gap-1">
      {tenants.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t)}
          className={`tenant-pill px-4 py-1.5 rounded-full text-xs font-medium ${
            active?.id === t.id
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 selected-glow'
              : 'text-gray-500 hover:text-gray-300 border border-transparent'
          }`}
        >
          {t.name}
        </button>
      ))}
    </div>
  )
}
