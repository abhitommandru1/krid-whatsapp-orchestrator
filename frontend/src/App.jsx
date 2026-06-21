import { useState, useEffect } from 'react'
import TenantSwitcher from './components/TenantSwitcher'
import SessionList from './components/SessionList'
import ChatThread from './components/ChatThread'
import BroadcastDrawer from './components/BroadcastDrawer'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export default function App() {
  const [tenants, setTenants] = useState([])
  const [activeTenant, setActiveTenant] = useState(null)
  const [sessions, setSessions] = useState([])
  const [activePhone, setActivePhone] = useState(null)
  const [broadcastOpen, setBroadcastOpen] = useState(false)

  useEffect(() => {
    fetch(`${API}/tenants`)
      .then(r => r.json())
      .then(data => {
        setTenants(data)
        if (data.length > 0) setActiveTenant(data[0])
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!activeTenant) return
    setActivePhone(null)
    const load = () =>
      fetch(`${API}/tenants/${activeTenant.id}/sessions`)
        .then(r => r.json())
        .then(setSessions)
        .catch(() => {})
    load()
    const id = setInterval(load, 4000)
    return () => clearInterval(id)
  }, [activeTenant])

  const needsHumanCount = sessions.filter(s => s.status === 'NEEDS_HUMAN').length

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 50% -20%, rgba(16,185,129,0.07) 0%, transparent 55%), #030712',
      }}
    >
      {/* ── Header ── */}
      <header className="glass-strong shrink-0 px-6 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <span className="text-emerald-400 text-sm font-semibold">K</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-none">Krid.AI</p>
            <p className="text-[10px] text-gray-500 mt-0.5">WhatsApp Orchestrator</p>
          </div>
        </div>

        <TenantSwitcher tenants={tenants} active={activeTenant} onChange={t => setActiveTenant(t)} />

        <div className="flex items-center gap-3">
          {needsHumanCount > 0 && (
            <div className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
              {needsHumanCount} need{needsHumanCount > 1 ? '' : 's'} attention
            </div>
          )}
          <button
            onClick={() => setBroadcastOpen(true)}
            className="press flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all duration-200"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            Broadcast
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside className="w-72 shrink-0 border-r border-white/[0.06] flex flex-col overflow-hidden">
          {/* Stats bar */}
          <div className="px-4 pt-4 pb-3 grid grid-cols-3 gap-2">
            {[
              { label: 'Total', value: sessions.length, color: 'text-gray-300' },
              { label: 'Active', value: sessions.filter(s => s.status === 'AGENT_RESPONDING').length, color: 'text-blue-400' },
              { label: 'Alerts', value: needsHumanCount, color: 'text-red-400' },
            ].map(s => (
              <div key={s.label} className="glass rounded-xl p-2.5 text-center">
                <p className={`text-lg font-semibold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-gray-600 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="px-4 pb-2">
            <p className="text-[11px] font-medium text-gray-600 uppercase tracking-wider">Conversations</p>
          </div>

          <SessionList sessions={sessions} activePhone={activePhone} onSelect={setActivePhone} />
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-hidden">
          {activePhone && activeTenant ? (
            <ChatThread tenantId={activeTenant.id} phone={activePhone} api={API} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center mb-1">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-500">Select a conversation</p>
              <p className="text-xs text-gray-700">Messages will appear here</p>
            </div>
          )}
        </main>
      </div>

      {broadcastOpen && (
        <BroadcastDrawer
          tenantId={activeTenant?.id}
          sessions={sessions}
          api={API}
          onClose={() => setBroadcastOpen(false)}
        />
      )}
    </div>
  )
}
