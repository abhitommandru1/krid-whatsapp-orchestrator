const STATUS = {
  WAITING_FOR_BOT:  { dot: 'bg-yellow-400', label: 'Waiting',    text: 'text-yellow-400' },
  AGENT_RESPONDING: { dot: 'bg-blue-400 animate-pulse', label: 'Responding', text: 'text-blue-400' },
  RESOLVED:         { dot: 'bg-emerald-400', label: 'Resolved',   text: 'text-emerald-400' },
  NEEDS_HUMAN:      { dot: 'bg-red-400 animate-pulse', label: 'Needs help', text: 'text-red-400' },
}

export default function SessionList({ sessions, activePhone, onSelect }) {
  if (sessions.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-4">
        <div className="w-10 h-10 rounded-xl glass flex items-center justify-center">
          <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
          </svg>
        </div>
        <p className="text-xs text-gray-600">No conversations yet</p>
      </div>
    )
  }

  return (
    <ul className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
      {sessions.map(s => {
        const st = STATUS[s.status] || STATUS.WAITING_FOR_BOT
        const isActive = activePhone === s.phone
        const isAlert = s.status === 'NEEDS_HUMAN'

        return (
          <li key={s.phone}>
            <button
              onClick={() => onSelect(s.phone)}
              className={`session-row w-full text-left p-3 rounded-xl flex items-center gap-3 group ${
                isActive
                  ? 'glass-strong border-emerald-500/20 selected-glow'
                  : isAlert
                  ? 'glass border-red-500/20 hover:border-red-500/30'
                  : 'glass hover:bg-white/[0.05]'
              }`}
            >
              {/* Avatar */}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-semibold shrink-0 ${
                isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/[0.06] text-gray-400'
              }`}>
                {s.phone.slice(-2)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium truncate ${isActive ? 'text-white' : 'text-gray-300'}`}>
                  {s.phone}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dot}`} />
                  <span className={`text-[10px] ${st.text}`}>{st.label}</span>
                </div>
              </div>

              {isAlert && (
                <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded-full shrink-0">
                  !
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
