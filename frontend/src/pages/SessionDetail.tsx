import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { Send, Bot, User, Cpu, Clock, DollarSign, Database, MessageSquare } from 'lucide-react'

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [injectText, setInjectText] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['session', id],
    queryFn: async () => {
      const { data } = await api.get(`/sessions/${id}`)
      return data
    },
  })

  const injectMutation = useMutation({
    mutationFn: (text: string) =>
      api.post(`/sessions/${id}/inject`, { message: text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', id] })
      setInjectText('')
    },
  })

  const session = data?.session
  const messages = session?.messages || []
  const memory = session?.memory || []

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      completed: 'badge-green',
      running: 'badge-blue',
      failed: 'badge-red',
      pending: 'badge-yellow',
    }
    return map[status] || 'badge-purple'
  }

  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      user: 'badge-blue',
      assistant: 'badge-green',
      system: 'badge-purple',
      tool: 'badge-yellow',
    }
    return map[role] || 'badge'
  }

  const roleIcon = (role: string) => {
    switch (role) {
      case 'user':
        return <User className="w-4 h-4" />
      case 'assistant':
        return <Bot className="w-4 h-4" />
      case 'system':
        return <Cpu className="w-4 h-4" />
      default:
        return <MessageSquare className="w-4 h-4" />
    }
  }

  const handleInject = (e: React.FormEvent) => {
    e.preventDefault()
    if (injectText.trim()) {
      injectMutation.mutate(injectText.trim())
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="card text-center py-12">
        <MessageSquare className="w-16 h-16 text-gray-700 mx-auto mb-4" />
        <p className="text-gray-400 text-lg">Session not found</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-white font-mono">
            {session._id?.slice(0, 16)}...
          </h1>
          <span className={`badge ${statusBadge(session.status)}`}>{session.status}</span>
        </div>
        <p className="text-gray-400">
          {session.agentId ? `Agent: ${typeof session.agentId === 'string' ? session.agentId : '—'}` : 'Session details'}
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card py-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            <span className="text-sm text-gray-400">Messages</span>
          </div>
          <p className="text-xl font-bold text-white mt-1">{messages.length}</p>
        </div>
        <div className="card py-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-green-400" />
            <span className="text-sm text-gray-400">Tokens</span>
          </div>
          <p className="text-xl font-bold text-white mt-1">
            {(session.tokenUsage?.total || 0).toLocaleString()}
          </p>
        </div>
        <div className="card py-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-gray-400">Cost</span>
          </div>
          <p className="text-xl font-bold text-white mt-1">
            ${(session.cost || 0).toFixed(4)}
          </p>
        </div>
        <div className="card py-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-gray-400">Duration</span>
          </div>
          <p className="text-xl font-bold text-white mt-1">
            {session.createdAt && session.updatedAt
              ? `${Math.round(
                  (new Date(session.updatedAt).getTime() -
                    new Date(session.createdAt).getTime()) /
                    1000
                )}s`
              : '—'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages / Context */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-400" />
              Messages ({messages.length})
            </h2>
            {messages.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No messages in this session</p>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {messages.map((msg: { role: string; content: string; timestamp?: string; tool?: string }, i: number) => (
                  <div
                    key={i}
                    className={`rounded-lg p-4 ${
                      msg.role === 'user'
                        ? 'bg-gray-800/70 border-l-2 border-indigo-500'
                        : msg.role === 'assistant'
                        ? 'bg-gray-800/40 border-l-2 border-green-500'
                        : msg.role === 'system'
                        ? 'bg-gray-800/30 border-l-2 border-purple-500'
                        : 'bg-gray-800/20 border-l-2 border-yellow-500'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="flex items-center gap-1.5">
                        {roleIcon(msg.role)}
                        <span className={`badge ${roleBadge(msg.role)}`}>{msg.role}</span>
                      </span>
                      {msg.tool && (
                        <span className="text-xs text-gray-500">via {msg.tool}</span>
                      )}
                      {msg.timestamp && (
                        <span className="text-xs text-gray-600 ml-auto">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inject Form */}
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Send className="w-5 h-5 text-indigo-400" />
              Inject Message
            </h2>
            <form onSubmit={handleInject} className="space-y-3">
              <textarea
                value={injectText}
                onChange={(e) => setInjectText(e.target.value)}
                className="input min-h-[100px] font-mono text-sm"
                placeholder="Type a message to inject into the session..."
              />
              <button
                type="submit"
                className="btn-primary flex items-center gap-2"
                disabled={injectMutation.isPending || !injectText.trim()}
              >
                <Send className="w-4 h-4" />
                {injectMutation.isPending ? 'Injecting...' : 'Inject Message'}
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Session Info */}
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4">Session Info</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`badge ${statusBadge(session.status)}`}>{session.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="text-gray-300">
                  {session.createdAt ? new Date(session.createdAt).toLocaleString() : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Updated</span>
                <span className="text-gray-300">
                  {session.updatedAt ? new Date(session.updatedAt).toLocaleString() : '—'}
                </span>
              </div>
              {session.tokenUsage && (
                <>
                  <div className="border-t border-gray-800 pt-3">
                    <p className="text-gray-500 mb-2">Token Usage</p>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Prompt</span>
                        <span className="text-gray-300">
                          {(session.tokenUsage.prompt || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Completion</span>
                        <span className="text-gray-300">
                          {(session.tokenUsage.completion || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span className="text-gray-400">Total</span>
                        <span className="text-white">
                          {(session.tokenUsage.total || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Memory */}
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-400" />
              Memory ({memory.length})
            </h2>
            {memory.length === 0 ? (
              <p className="text-gray-500 text-sm">No memory entries</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {memory.map((entry: { key: string; value: string; updatedAt?: string }, i: number) => (
                  <div key={i} className="p-3 rounded-lg bg-gray-800/50">
                    <p className="text-xs font-medium text-indigo-400 mb-1">{entry.key}</p>
                    <p className="text-sm text-gray-300 line-clamp-3">{entry.value}</p>
                    {entry.updatedAt && (
                      <p className="text-xs text-gray-600 mt-1">
                        {new Date(entry.updatedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
