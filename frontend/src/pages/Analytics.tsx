import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import { BarChart3, TrendingUp, DollarSign, Zap } from 'lucide-react'

export default function Analytics() {
  const { data } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const { data } = await api.get('/analytics/usage?days=30')
      return data
    },
  })

  const analytics = data || {
    dailyTokens: [],
    costPerAgent: [],
    sessionsOverTime: [],
    providerDistribution: [],
    topSessions: [],
  }

  const totalTokens = analytics.dailyTokens?.reduce((sum: number, d: { openai: number; anthropic: number; openrouter: number }) => sum + (d.openai + d.anthropic + d.openrouter), 0) || 0
  const totalCost = analytics.costPerAgent?.reduce((sum: number, a: { cost: number }) => sum + a.cost, 0) || 0
  const totalSessions = analytics.sessionsOverTime?.reduce((sum: number, s: { count: number }) => sum + s.count, 0) || 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-gray-400 mt-1">Token usage, costs, and performance metrics</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-900/30 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Tokens</p>
              <p className="text-xl font-bold text-white">{totalTokens.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-900/30 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Cost</p>
              <p className="text-xl font-bold text-white">${totalCost.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-900/30 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Sessions</p>
              <p className="text-xl font-bold text-white">{totalSessions}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Avg Cost/Session</p>
              <p className="text-xl font-bold text-white">${totalSessions > 0 ? (totalCost / totalSessions).toFixed(4) : '0.00'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Provider Distribution */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Provider Distribution</h2>
          {analytics.providerDistribution?.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No data yet</p>
          ) : (
            <div className="space-y-3">
              {analytics.providerDistribution?.map((p: { provider: string; count: number }) => {
                const pct = totalSessions > 0 ? Math.round((p.count / totalSessions) * 100) : 0
                return (
                  <div key={p.provider}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300 capitalize">{p.provider}</span>
                      <span className="text-gray-400">{p.count} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Cost per Agent */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Cost per Agent</h2>
          {analytics.costPerAgent?.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No data yet</p>
          ) : (
            <div className="space-y-3">
              {analytics.costPerAgent?.map((a: { agentName: string; cost: number }) => (
                <div key={a.agentName} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                  <span className="text-sm text-gray-300">{a.agentName}</span>
                  <span className="text-sm font-medium text-white">${a.cost.toFixed(4)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Sessions */}
      <div className="card mt-6">
        <h2 className="text-lg font-semibold text-white mb-4">Top Sessions by Cost</h2>
        {analytics.topSessions?.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No sessions yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase py-2 px-3">Session</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase py-2 px-3">Agent</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase py-2 px-3">Tokens</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase py-2 px-3">Cost</th>
                </tr>
              </thead>
              <tbody>
                {analytics.topSessions?.map((s: { sessionId: string; agentName: string; tokens: number; cost: number }) => (
                  <tr key={s.sessionId} className="border-b border-gray-800/50">
                    <td className="py-2 px-3 font-mono text-sm text-indigo-400">{s.sessionId?.slice(0, 12)}...</td>
                    <td className="py-2 px-3 text-sm text-gray-300">{s.agentName}</td>
                    <td className="py-2 px-3 text-sm text-gray-300">{s.tokens?.toLocaleString()}</td>
                    <td className="py-2 px-3 text-sm text-gray-300">${s.cost?.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
