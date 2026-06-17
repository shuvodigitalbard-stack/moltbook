import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/auth'
import api from '../lib/api'
import { User, Key, Shield, Trash2, Plus, Copy, CheckCircle } from 'lucide-react'

export default function Settings() {
  const user = useAuthStore((s) => s.user)
  const [showAddKey, setShowAddKey] = useState(false)
  const [keyForm, setKeyForm] = useState({ provider: 'openai', apiKey: '', label: '' })
  const [copied, setCopied] = useState(false)
  const queryClient = useQueryClient()

  const { data: keysData } = useQuery({
    queryKey: ['apikeys'],
    queryFn: async () => {
      const { data } = await api.get('/admin/apikeys')
      return data
    },
  })

  const addKeyMutation = useMutation({
    mutationFn: (key: typeof keyForm) => api.post('/admin/apikeys', key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apikeys'] })
      setShowAddKey(false)
      setKeyForm({ provider: 'openai', apiKey: '', label: '' })
    },
  })

  const deleteKeyMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/apikeys/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['apikeys'] }),
  })

  const apiKeys = keysData?.apiKeys || []

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Manage your account, team, and API keys</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-400" /> Profile
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 uppercase">Name</label>
              <p className="text-white mt-1">{user?.name}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase">Email</label>
              <p className="text-white mt-1">{user?.email}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase">Role</label>
              <div className="mt-1">
                <span className="badge badge-purple">{user?.role}</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase">Team ID</label>
              <p className="text-white mt-1 font-mono text-sm">{user?.teamId}</p>
            </div>
          </div>
        </div>

        {/* API Keys */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-400" /> API Keys
            </h2>
            <button onClick={() => setShowAddKey(!showAddKey)} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add Key
            </button>
          </div>

          {showAddKey && (
            <form onSubmit={(e) => { e.preventDefault(); addKeyMutation.mutate(keyForm) }} className="space-y-3 mb-4 p-4 bg-gray-800/50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Provider</label>
                <select value={keyForm.provider} onChange={(e) => setKeyForm({ ...keyForm, provider: e.target.value })} className="input">
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="openrouter">OpenRouter</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">API Key</label>
                <input type="password" value={keyForm.apiKey} onChange={(e) => setKeyForm({ ...keyForm, apiKey: e.target.value })} className="input" placeholder="sk-..." required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Label</label>
                <input type="text" value={keyForm.label} onChange={(e) => setKeyForm({ ...keyForm, label: e.target.value })} className="input" placeholder="Production key" />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary text-xs" disabled={addKeyMutation.isPending}>
                  {addKeyMutation.isPending ? 'Adding...' : 'Add Key'}
                </button>
                <button type="button" onClick={() => setShowAddKey(false)} className="btn-secondary text-xs">Cancel</button>
              </div>
            </form>
          )}

          {apiKeys.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">No API keys configured</p>
          ) : (
            <div className="space-y-2">
              {apiKeys.map((key: { _id: string; provider: string; label: string; createdAt: string }) => (
                <div key={key._id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white capitalize">{key.provider}</span>
                      <span className="badge badge-green text-xs">Active</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{key.label} · Added {new Date(key.createdAt).toLocaleDateString()}</p>
                  </div>
                  <button onClick={() => deleteKeyMutation.mutate(key._id)} className="text-red-400 hover:text-red-300 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" /> Security
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <span className="text-gray-300">Authentication</span>
              <span className="badge badge-green">JWT + RBAC</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <span className="text-gray-300">API Key Encryption</span>
              <span className="badge badge-green">AES-256-GCM</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <span className="text-gray-300">Password Hashing</span>
              <span className="badge badge-green">bcrypt (cost 12)</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <span className="text-gray-300">Audit Logging</span>
              <span className="badge badge-green">Enabled</span>
            </div>
          </div>
        </div>

        {/* Platform Info */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Platform</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Version</span>
              <span className="text-white">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Stack</span>
              <span className="text-white">MERN (MongoDB + Express + React + Node)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Real-time</span>
              <span className="text-white">Socket.io WebSocket</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">LLM Providers</span>
              <span className="text-white">OpenAI, Anthropic, OpenRouter</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
