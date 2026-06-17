import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import { Activity, Filter } from 'lucide-react'

export default function Sessions() {
  const [filter, setFilter] = useState('all')

  const { data } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data } = await api.get('/sessions')
      return data
    },
  })

  const sessions = data?.sessions || []
  const filtered = filter === 'all' ? sessions : sessions.filter((s: { status: string }) => s.status === filter)

  const statusColors: Record<string, string> = {
    completed: 'badge-green',
    running: 'badge-blue',
    pending: 'badge-yellow',
    failed: 'badge-red',
    paused: 'badge-purple',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Sessions</h1>
          <p className="text-gray-400 mt-1">View all agent execution sessions</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          {['all', 'running', 'completed', 'pending', 'failed'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === s ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Activity className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No sessions found</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4">Session</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4">Status</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4">Tokens</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4">Cost</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase py-3 px-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((session: { _id: string; status: string; tokenUsage: { total: number }; cost: number; createdAt: string }) => (
                <tr
                  key={session._id}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer transition-colors"
                  onClick={() => window.location.href = `/sessions/${session._id}`}
                >
                  <td className="py-3 px-4">
                    <span className="font-mono text-sm text-indigo-400">{session._id}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`badge ${statusColors[session.status] || 'badge-yellow'}`}>
                      {session.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-300">{session.tokenUsage?.total || 0}</td>
                  <td className="py-3 px-4 text-sm text-gray-300">${(session.cost || 0).toFixed(4)}</td>
                  <td className="py-3 px-4 text-sm text-gray-500">{new Date(session.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
