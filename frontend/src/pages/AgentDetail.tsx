import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { ArrowLeft, Play, Edit, Tag, Clock, Cpu, MessageSquare } from 'lucide-react'

export default function AgentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', systemPrompt: '' })

  const { data } = useQuery({
    queryKey: ['agent', id],
    queryFn: async () => {
      const { data } = await api.get(`/agents/${id}`)
      return data
    },
    enabled: !!id,
  })

  const updateMutation = useMutation({
    mutationFn: (update: Record<string, unknown>) => api.put(`/agents/${id}`, update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent', id] })
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      setEditing(false)
    },
  })

  const versionMutation = useMutation({
    mutationFn: (tag: string) => api.post(`/agents/${id}/versions`, { tag }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agent', id] }),
  })

  const agent = data?.agent
  if (!agent) return <div className="text-gray-400 text-center py-12">Loading...</div>

  return (
    <div>
      <button onClick={() => navigate('/agents')} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Agents
      </button>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">{agent.name}</h1>
          <p className="text-gray-400 mt-1">{agent.description || 'No description'}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => versionMutation.mutate('v' + ((agent.versions?.length || 0) + 1))} className="btn-secondary flex items-center gap-2">
            <Tag className="w-4 h-4" /> Save Version
          </button>
          <button onClick={() => setEditing(!editing)} className="btn-secondary flex items-center gap-2">
            <Edit className="w-4 h-4" /> Edit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Config */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4">Configuration</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 uppercase">Provider</label>
                <p className="text-white font-medium mt-1">{agent.provider}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase">Model</label>
                <p className="text-white font-medium mt-1">{agent.model}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase">Temperature</label>
                <p className="text-white font-medium mt-1">{agent.parameters?.temperature}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase">Max Tokens</label>
                <p className="text-white font-medium mt-1">{agent.parameters?.maxTokens}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-400" /> System Prompt
            </h2>
            {editing ? (
              <textarea
                value={form.systemPrompt || agent.systemPrompt}
                onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                className="input min-h-[200px] font-mono text-sm"
              />
            ) : (
              <pre className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300 whitespace-pre-wrap font-mono">
                {agent.systemPrompt || 'No system prompt set'}
              </pre>
            )}
            {editing && (
              <div className="flex gap-2 mt-3">
                <button onClick={() => updateMutation.mutate({ systemPrompt: form.systemPrompt })} className="btn-primary">
                  Save
                </button>
                <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4">Status</h2>
            <span className={`badge ${agent.status === 'active' ? 'badge-green' : 'badge-yellow'}`}>
              {agent.status}
            </span>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Created</span>
                <span className="text-white">{new Date(agent.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Versions</span>
                <span className="text-white">{agent.versions?.length || 0}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" /> Version History
            </h2>
            <div className="space-y-2">
              {(agent.versions || []).map((v: { tag: string; createdAt: string }, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-gray-800/50">
                  <span className="text-sm text-white">{v.tag}</span>
                  <span className="text-xs text-gray-500">{new Date(v.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
              {(!agent.versions || agent.versions.length === 0) && (
                <p className="text-sm text-gray-500">No versions yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
