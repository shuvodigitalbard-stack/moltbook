import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { Plus, ArrowRight, Clock, CheckCircle, Eye, Play, AlertCircle } from 'lucide-react'

type TaskStatus = 'pending' | 'running' | 'review' | 'approved'
type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

const COLUMNS: { status: TaskStatus; label: string; icon: typeof Clock; color: string; borderColor: string }[] = [
  { status: 'pending', label: 'Pending', icon: Clock, color: 'text-yellow-400', borderColor: 'border-yellow-500/30' },
  { status: 'running', label: 'Running', icon: Play, color: 'text-blue-400', borderColor: 'border-blue-500/30' },
  { status: 'review', label: 'In Review', icon: Eye, color: 'text-purple-400', borderColor: 'border-purple-500/30' },
  { status: 'approved', label: 'Approved', icon: CheckCircle, color: 'text-green-400', borderColor: 'border-green-500/30' },
]

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    pending: 'badge-yellow',
    running: 'badge-blue',
    review: 'badge-purple',
    approved: 'badge-green',
  }
  return map[status] || 'badge'
}

const priorityBadge = (priority: string) => {
  const map: Record<string, string> = {
    low: 'badge',
    medium: 'badge-blue',
    high: 'badge-yellow',
    critical: 'badge-red',
  }
  return map[priority] || 'badge'
}

const nextStatus = (current: TaskStatus): TaskStatus | null => {
  const flow: Record<TaskStatus, TaskStatus | null> = {
    pending: 'running',
    running: 'review',
    review: 'approved',
    approved: null,
  }
  return flow[current]
}

const statusLabel = (status: TaskStatus): string => {
  const map: Record<TaskStatus, string> = {
    pending: 'Start',
    running: 'Submit for Review',
    review: 'Approve',
    approved: 'Done',
  }
  return map[status]
}

export default function Tasks() {
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    title: '',
    type: 'general',
    input: '',
    agentId: '',
    priority: 'medium' as TaskPriority,
  })
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data } = await api.get('/tasks')
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
    mutationFn: (newTask: typeof form) => api.post('/tasks', newTask),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setShowCreate(false)
      setForm({ title: '', type: 'general', input: '', agentId: '', priority: 'medium' })
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      api.patch(`/tasks/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const tasks = data?.tasks || []
  const agents = agentsData?.agents || []

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(form)
  }

  const tasksByStatus = (status: TaskStatus) =>
    tasks.filter((t: { status: string }) => t.status === status)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-gray-400 mt-1">Manage and track your agent tasks</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Create New Task</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="input"
                placeholder="Task title..."
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="input"
                >
                  <option value="general">General</option>
                  <option value="code-review">Code Review</option>
                  <option value="data-analysis">Data Analysis</option>
                  <option value="content-generation">Content Generation</option>
                  <option value="research">Research</option>
                  <option value="testing">Testing</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Agent</label>
                <select
                  value={form.agentId}
                  onChange={(e) => setForm({ ...form, agentId: e.target.value })}
                  className="input"
                >
                  <option value="">Select agent...</option>
                  {agents.map((a: { _id: string; name: string }) => (
                    <option key={a._id} value={a._id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
                  className="input"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Input / Description</label>
              <textarea
                value={form.input}
                onChange={(e) => setForm({ ...form, input: e.target.value })}
                className="input min-h-[80px]"
                placeholder="Describe the task..."
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="btn-primary"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Task'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const colTasks = tasksByStatus(col.status)
            return (
              <div
                key={col.status}
                className={`rounded-xl border ${col.borderColor} bg-gray-900/50 p-4`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <col.icon className={`w-4 h-4 ${col.color}`} />
                    <h3 className="font-semibold text-white text-sm">{col.label}</h3>
                    <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                      {colTasks.length}
                    </span>
                  </div>
                </div>

                {/* Task Cards */}
                <div className="space-y-3">
                  {colTasks.length === 0 ? (
                    <div className="text-center py-6 text-gray-600 text-sm">
                      No tasks
                    </div>
                  ) : (
                    colTasks.map((task: {
                      _id: string
                      title: string
                      type: string
                      status: string
                      priority: TaskPriority
                      agentId?: string
                      createdAt?: string
                      input?: string
                    }) => (
                      <div
                        key={task._id}
                        className="card hover:border-gray-700 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-sm font-medium text-white flex-1 pr-2">
                            {task.title}
                          </h4>
                          <span className={`badge ${priorityBadge(task.priority)} text-xs`}>
                            {task.priority}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mb-3">
                          <span className="badge badge-blue text-xs">{task.type}</span>
                          <span className={`badge ${statusBadge(task.status)} text-xs`}>
                            {task.status}
                          </span>
                        </div>

                        {task.input && (
                          <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                            {task.input}
                          </p>
                        )}

                        {task.createdAt && (
                          <p className="text-xs text-gray-600 mb-3">
                            {new Date(task.createdAt).toLocaleDateString()}
                          </p>
                        )}

                        <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
                          {nextStatus(task.status as TaskStatus) && (
                            <button
                              onClick={() =>
                                updateStatusMutation.mutate({
                                  id: task._id,
                                  status: nextStatus(task.status as TaskStatus)!,
                                })
                              }
                              className="btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1"
                              disabled={updateStatusMutation.isPending}
                            >
                              <ArrowRight className="w-3 h-3" />
                              {statusLabel(task.status as TaskStatus)}
                            </button>
                          )}
                          <button
                            onClick={() => deleteMutation.mutate(task._id)}
                            className="text-red-400 hover:text-red-300 text-xs py-1.5 px-2.5 flex items-center gap-1 hover:bg-red-900/20 rounded-lg transition-colors ml-auto"
                          >
                            <AlertCircle className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
