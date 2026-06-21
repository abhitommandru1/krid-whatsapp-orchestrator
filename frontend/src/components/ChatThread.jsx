import { useState, useEffect, useRef } from 'react'

export default function ChatThread({ tenantId, phone, api }) {
  const [messages, setMessages] = useState([])
  const [typing, setTyping] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    setMessages([])
    setTyping(false)
    const load = () =>
      fetch(`${api}/tenants/${tenantId}/messages/${encodeURIComponent(phone)}`)
        .then(r => r.json())
        .then(msgs => {
          setMessages(msgs)
          const last = msgs[msgs.length - 1]
          setTyping(!!last && last.direction === 'inbound')
        })
        .catch(() => {})
    load()
    const id = setInterval(load, 3000)
    return () => clearInterval(id)
  }, [tenantId, phone, api])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  return (
    <div className="h-full flex flex-col">
      {/* Thread header */}
      <div className="glass-strong px-6 py-4 flex items-center gap-3 shrink-0 border-b border-white/[0.06]">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-xs font-semibold text-emerald-300">
          {phone.slice(-2)}
        </div>
        <div>
          <p className="text-sm font-medium text-white">{phone}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
            <span className="text-[10px] text-gray-500">WhatsApp</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {messages.length === 0 && !typing && (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-gray-700">No messages yet</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={msg.id || i} className="msg-enter">
            <Message msg={msg} />
          </div>
        ))}

        {typing && <TypingBubble />}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}

function Message({ msg }) {
  const isBot = msg.direction === 'outbound'

  return (
    <div className={`flex items-end gap-2.5 ${isBot ? '' : 'flex-row-reverse'}`}>
      {isBot && (
        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400 shrink-0">
          K
        </div>
      )}

      <div className={`max-w-sm space-y-1.5 ${isBot ? '' : 'items-end flex flex-col'}`}>
        {msg.text && (
          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isBot
              ? 'glass-strong text-gray-100 rounded-bl-sm'
              : 'bg-emerald-600/80 text-white rounded-br-sm border border-emerald-500/30'
          }`}>
            {msg.text}
          </div>
        )}

        {msg.media?.map((m, i) => (
          <MediaBubble key={i} media={m} isBot={isBot} />
        ))}

        <p className={`text-[10px] text-gray-700 px-1 ${isBot ? '' : 'text-right'}`}>
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

function MediaBubble({ media, isBot }) {
  if (media.type === 'image') {
    return (
      <div className={`rounded-2xl overflow-hidden border max-w-xs ${isBot ? 'border-white/10 rounded-bl-sm' : 'border-emerald-500/30 rounded-br-sm'}`}>
        <img src={media.url} alt={media.caption || 'image'} className="w-full object-cover" />
        {media.caption && (
          <div className="glass px-3 py-1.5 text-xs text-gray-400">{media.caption}</div>
        )}
      </div>
    )
  }

  return (
    <a
      href={media.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 glass-strong rounded-xl px-3.5 py-2.5 hover:bg-white/[0.08] transition-colors max-w-xs"
    >
      <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-200 truncate">{media.filename || 'Document'}</p>
        {media.caption && <p className="text-[10px] text-gray-500 truncate">{media.caption}</p>}
        <p className="text-[10px] text-blue-400 mt-0.5">PDF · tap to open</p>
      </div>
    </a>
  )
}

function TypingBubble() {
  return (
    <div className="flex items-end gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400 shrink-0">
        K
      </div>
      <div className="glass-strong rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
      <span className="text-[10px] text-gray-700 pb-1">typing</span>
    </div>
  )
}
