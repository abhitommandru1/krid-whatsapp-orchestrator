import { useState } from 'react'

const TEMPLATES = [
  {
    id: 'catalog',
    label: 'New Catalog Promo',
    desc: 'Share the latest product catalog with customers',
    text: 'Hi! Our new catalog is here. Reply CATALOG to receive it instantly.',
  },
  {
    id: 'appointment',
    label: 'Appointment Reminder',
    desc: 'Remind customers about upcoming service slots',
    text: 'Your upcoming appointment is confirmed. Reply YES to confirm or NO to reschedule.',
  },
  {
    id: 'offer',
    label: 'Exclusive Offer',
    desc: 'Send a limited-time deal to your customers',
    text: "You've got an exclusive offer waiting. Reply OFFER to claim it before it expires.",
  },
]

export default function BroadcastDrawer({ tenantId, sessions, api, onClose }) {
  const [selected, setSelected] = useState([])
  const [template, setTemplate] = useState(TEMPLATES[0].id)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const toggle = phone =>
    setSelected(p => p.includes(phone) ? p.filter(x => x !== phone) : [...p, phone])

  const selectAll = () =>
    setSelected(sessions.length === selected.length ? [] : sessions.map(s => s.phone))

  const send = async () => {
    if (!selected.length) return
    setLoading(true)
    const t = TEMPLATES.find(t => t.id === template)
    await fetch(`${api}/tenants/${tenantId}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phones: selected, template: t.text }),
    }).catch(() => {})
    setLoading(false)
    setSent(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Drawer */}
      <div
        className="relative w-96 h-full glass-strong border-l border-white/[0.08] flex flex-col overflow-hidden"
        style={{ animation: 'slideInRight 0.22s ease-out' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Broadcast Campaign</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">Send a message to multiple contacts</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg glass flex items-center justify-center text-gray-500 hover:text-white transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {sent ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white">Campaign Queued</p>
              <p className="text-xs text-gray-500 mt-1">
                {selected.length} message{selected.length !== 1 ? 's' : ''} will be sent shortly
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Template */}
            <div>
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-3">Template</p>
              <div className="space-y-2">
                {TEMPLATES.map(t => (
                  <label
                    key={t.id}
                    className={`flex gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-150 ${
                      template === t.id
                        ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
                        : 'border-white/[0.06] glass hover:border-white/[0.12]'
                    }`}
                  >
                    <div className="mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                      ${template === t.id ? 'border-emerald-400' : 'border-gray-600'}">
                      {template === t.id && <div className="w-2 h-2 rounded-full bg-emerald-400" />}
                    </div>
                    <input
                      type="radio" name="tpl" value={t.id}
                      checked={template === t.id}
                      onChange={() => setTemplate(t.id)}
                      className="sr-only"
                    />
                    <div>
                      <p className="text-xs font-medium text-gray-200">{t.label}</p>
                      <p className="text-[11px] text-gray-600 mt-0.5">{t.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Recipients */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                  Recipients
                </p>
                {sessions.length > 0 && (
                  <button onClick={selectAll} className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors">
                    {selected.length === sessions.length ? 'Deselect all' : 'Select all'}
                  </button>
                )}
              </div>

              {sessions.length === 0 ? (
                <p className="text-xs text-gray-700 text-center py-4">No sessions yet</p>
              ) : (
                <div className="space-y-1.5 max-h-44 overflow-y-auto">
                  {sessions.map(s => (
                    <label
                      key={s.phone}
                      className="flex items-center gap-3 p-2.5 rounded-xl glass hover:bg-white/[0.05] cursor-pointer transition-colors"
                    >
                      <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        selected.includes(s.phone)
                          ? 'bg-emerald-500/20 border-emerald-500/40'
                          : 'border-white/10'
                      }`}>
                        {selected.includes(s.phone) && (
                          <svg className="w-2.5 h-2.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <input type="checkbox" checked={selected.includes(s.phone)}
                        onChange={() => toggle(s.phone)} className="sr-only" />
                      <span className="text-xs text-gray-300">{s.phone}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        {!sent && (
          <div className="px-6 py-4 border-t border-white/[0.06]">
            <button
              onClick={send}
              disabled={!selected.length || loading}
              className="press w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed
                bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/25 hover:border-emerald-500/40"
            >
              {loading
                ? 'Sending...'
                : selected.length
                ? `Send to ${selected.length} contact${selected.length !== 1 ? 's' : ''}`
                : 'Select recipients'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
