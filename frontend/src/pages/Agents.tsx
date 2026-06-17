import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { Plus, Bot, Search, Trash2, Edit, Archive, Tag } from 'lucide-react'

export default function Agents() {
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({
    name: '',
    description: '',
    provider: 'openai',
    model: 'gpt-4o',
    systemPrompt: '',
    temperature: 0.7,
    maxTokens: 2048,
  })
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const { data } = await api.get('/agents')
      return data
    },
  })

  const createMutation = useMutation({
    mutationFn: (newAgent: typeof form) => api.post('/agents', newAgent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      setShowCreate(false)
      setForm({ name: '', description: '', provider: 'openai', model: 'gpt-4o', systemPrompt: '', temperature: 0.7, maxTokens: 2048 })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/agents/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  })

  const agents = data?.agents || []
  const filtered = agents.filter((a: { name: string }) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  )

  const modelsByProvider: Record<string, string[]> = {
    openai: ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
    openrouter: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'google/gemini-pro', 'meta-llama/llama-3.1-70b'],
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      ...form,
      parameters: { temperature: form.temperature, maxTokens: form.maxTokens },
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Agents</h1>
          <p className="text-gray-400 mt-1">Create and manage your AI agents</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Agent
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Create New Agent</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                  placeholder="My Agent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Provider</label>
                <select
                  value={form.provider}
                  onChange={(e) => {
                    const provider = e.target.value
                    setForm({
                      ...form,
                      provider,
                      model: modelsByProvider[provider]?.[0] || '',
                    })
                  }}
                  className="input"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="openrouter">OpenRouter</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input"
                placeholder="What does this agent do?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Model</label>
              <select
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                className="input"
              >
                {(modelsByProvider[form.provider] || []).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">System Prompt</label>
              <textarea
                value={form.systemPrompt}
                onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                className="input min-h-[100px] font-mono text-sm"
                placeholder="You are a helpful assistant..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Temperature: {form.temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={form.temperature}
                  onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
                  className="w-full accent-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Max Tokens: {form.maxTokens}
                </label>
                <input
                  type="range"
                  min="256"
                  max="8192"
                  step="256"
                  value={form.maxTokens}
                  onChange={(e) => setForm({ ...form, maxTokens: parseInt(e.target.value) })}
                  className="w-full accent-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="btn-primary"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Agent'}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-10"
          placeholder="Search agents..."
        />
      </div>

      {/* Agents List */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Bot className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No agents found</p>
          <p className="text-gray-600 text-sm mt-1">
            {search ? 'Try a different search' : 'Create your first agent to get started'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((agent: {
            _id: string; name: string; description: string; provider: string;
            model: string; status: string; versions: unknown[]; createdAt: string
          }) => (
            <div key={agent._id} className="card hover:border-gray-700 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-900/50 rounded-lg flex items-center justify-center">
                    <Bot className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <a href={`/agents/${agent._id}`} className="font-semibold text-white hover:text-indigo-400">
                      {agent.name}
                    </a>
                    <p className="text-xs text-gray-500">{agent.provider} · {agent.model}</p>
                  </div>
                </div>
                <span className={`badge ${agent.status === 'active' ? 'badge-green' : 'badge-yellow'}`}>
                  {agent.status}
                </span>
              </div>
              {agent.description && (
                <p className="text-sm text-gray-400 mb-3 line-clamp-2">{agent.description}</p>
              )}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{agent.versions?.length || 0} versions</span>
                <span>{new Date(agent.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-800">
                <a href={`/agents/${agent._id}`} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
                  <Edit className="w-3 h-3" /> Edit
                </a>
                <button
                  onClick={() => deleteMutation.mutate(agent._id)}
                  className="text-red-400 hover:text-red-300 text-xs py-1.5 px-3 flex items-center gap-1 hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
