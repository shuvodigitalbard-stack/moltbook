import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../stores/auth'
import api from '../lib/api'
import { Bot, Activity, FileText, DollarSign, TrendingUp, Users } from 'lucide-react'

export default function Dashboard() {
  const user = useAuthStore((s) => s.user)

  const { data: agentsData } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const { data } = await api.get('/agents')
      return data
    },
  })

  const { data: sessionsData } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data } = await api.get('/sessions')
      return data
    },
  })

  const { data: tasksData } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data } = await api.get('/tasks')
      return data
    },
  })

  const agents = agentsData?.agents || []
  const sessions = sessionsData?.sessions || []
  const tasks = tasksData?.tasks || []
  const activeSessions = sessions.filter((s: { status: string }) => s.status === 'running' || s.status === 'pending')

  const stats = [
    { label: 'Total Agents', value: agents.length, icon: Bot, color: 'text-indigo-400', bg: 'bg-indigo-900/30' },
    { label: 'Active Sessions', value: activeSessions.length, icon: Activity, color: 'text-green-400', bg: 'bg-green-900/30' },
    { label: 'Tasks', value: tasks.length, icon: FileText, color: 'text-yellow-400', bg: 'bg-yellow-900/30' },
    { label: 'Total Sessions', value: sessions.length, icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-900/30' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">Welcome back, {user?.name}. Here's your overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{stat.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 ${stat.bg} rounded-lg flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Agents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Agents</h2>
          {agents.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500">No agents yet</p>
              <a href="/agents" className="text-indigo-400 text-sm hover:text-indigo-300 mt-2 inline-block">
                Create your first agent →
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {agents.slice(0, 5).map((agent: { _id: string; name: string; provider: string; status: string; model: string }) => (
                <a
                  key={agent._id}
                  href={`/agents/${agent._id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-900/50 rounded-lg flex items-center justify-center">
                      <Bot className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{agent.name}</p>
                      <p className="text-xs text-gray-500">{agent.provider} · {agent.model}</p>
                    </div>
                  </div>
                  <span className={`badge ${agent.status === 'active' ? 'badge-green' : 'badge-yellow'}`}>
                    {agent.status}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Recent Sessions */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Sessions</h2>
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500">No sessions yet</p>
              <p className="text-gray-600 text-sm mt-1">Run an agent to see sessions here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.slice(0, 5).map((session: { _id: string; status: string; createdAt: string; tokenUsage: { total: number }; cost: number }) => (
                <a
                  key={session._id}
                  href={`/sessions/${session._id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-white font-mono">{session._id.slice(0, 8)}...</p>
                    <p className="text-xs text-gray-500">{new Date(session.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{session.tokenUsage?.total || 0} tokens</span>
                    <span className={`badge ${session.status === 'completed' ? 'badge-green' : session.status === 'running' ? 'badge-blue' : 'badge-yellow'}`}>
                      {session.status}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
