import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { Plus, FlaskConical, Play, CheckCircle, Trophy, Percent } from 'lucide-react'

export default function Experiments() {
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', agentA: '', agentB: '', trafficSplit: 50 })
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['experiments'],
    queryFn: async () => {
      const { data } = await api.get('/experiments')
      return data
    },
  })

  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const { data } = await api.get('/agents')
      return data
    },
  })

  const createMutation = useMutation({
    mutationFn: (exp: typeof form) => api.post('/experiments', exp),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiments'] })
      setShowCreate(false)
      setForm({ name: '', description: '', agentA: '', agentB: '', trafficSplit: 50 })
    },
  })

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      api.post(`/experiments/${id}/${action}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['experiments'] }),
  })

  const experiments = data?.experiments || []
  const agents = agentsData?.agents || []

  const statusBadge = (status: string) => {
    const map: Record<string, string> = { draft: 'badge-yellow', running: 'badge-blue', completed: 'badge-green' }
    return map[status] || 'badge'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Experiments</h1>
          <p className="text-gray-400 mt-1">A/B test your agent configurations</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Experiment
        </button>
      </div>

      {showCreate && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Create Experiment</h2>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form) }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" placeholder="Experiment name" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
              <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" placeholder="What are you testing?" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Agent A (Control)</label>
                <select value={form.agentA} onChange={(e) => setForm({ ...form, agentA: e.target.value })} className="input" required>
                  <option value="">Select agent...</option>
                  {agents.map((a: { _id: string; name: string }) => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Agent B (Variant)</label>
                <select value={form.agentB} onChange={(e) => setForm({ ...form, agentB: e.target.value })} className="input" required>
                  <option value="">Select agent...</option>
                  {agents.map((a: { _id: string; name: string }) => <option key={a._id} value={a._id}>{a.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Traffic Split: {form.trafficSplit}% A / {100 - form.trafficSplit}% B</label>
              <input type="range" min="10" max="90" value={form.trafficSplit} onChange={(e) => setForm({ ...form, trafficSplit: parseInt(e.target.value) })} className="w-full accent-indigo-500" />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Experiment'}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {experiments.length === 0 ? (
        <div className="card text-center py-12">
          <FlaskConical className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No experiments yet</p>
          <p className="text-gray-600 text-sm mt-1">Create an A/B test to compare agent configurations</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {experiments.map((exp: {
            _id: string; name: string; description: string; status: string;
            trafficSplit: number; winner: string; significance: { pValue: number; isSignificant: boolean };
            metrics: unknown[]; agentA: { name: string }; agentB: { name: string }
          }) => (
            <div key={exp._id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-white">{exp.name}</h3>
                  <p className="text-sm text-gray-400 mt-0.5">{exp.description}</p>
                </div>
                <span className={`badge ${statusBadge(exp.status)}`}>{exp.status}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                <span>A: {typeof exp.agentA === 'object' ? exp.agentA?.name || '—' : '—'}</span>
                <span>B: {typeof exp.agentB === 'object' ? exp.agentB?.name || '—' : '—'}</span>
                <span className="flex items-center gap-1"><Percent className="w-3 h-3" /> {exp.trafficSplit}/{100 - exp.trafficSplit}</span>
              </div>
              {exp.winner && (
                <div className="flex items-center gap-2 mb-3 p-2 bg-green-900/20 rounded-lg">
                  <Trophy className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-400">Winner: Variant {exp.winner}</span>
                </div>
              )}
              {exp.significance && (
                <div className="text-xs text-gray-500 mb-3">
                  p-value: {exp.significance.pValue?.toFixed(4)} {exp.significance.isSignificant ? '(significant)' : '(not significant)'}
                </div>
              )}
              <div className="flex gap-2 pt-3 border-t border-gray-800">
                {exp.status === 'draft' && (
                  <button onClick={() => actionMutation.mutate({ id: exp._id, action: 'start' })} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
                    <Play className="w-3 h-3" /> Start
                  </button>
                )}
                {exp.status === 'running' && (
                  <button onClick={() => actionMutation.mutate({ id: exp._id, action: 'complete' })} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Complete
                  </button>
                )}
                <span className="text-xs text-gray-500 ml-auto">{exp.metrics?.length || 0} sessions</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
