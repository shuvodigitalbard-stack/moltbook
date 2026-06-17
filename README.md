# MoltBook - AI Agent Orchestration & Analytics Platform

A full-stack MERN platform for creating, deploying, monitoring, and controlling AI agents across multiple LLM providers.

## Features

- **Agent Builder** - Create agents with system prompts, model selection, tool assignment, versioning
- **Multi-LLM Support** - OpenAI (GPT-4o), Anthropic (Claude), OpenRouter
- **Real-Time Monitoring** - WebSocket-streamed thought chain visualization
- **Mid-Run Injection** - Pause agents, inject instructions, resume
- **Decision Nodes** - Human-in-the-loop branching
- **Memory/Context Control** - Read and edit agent memory and context
- **A/B Testing** - Compare agent configurations with statistical significance
- **Task Management** - Kanban board for writing tasks
- **Analytics** - Token usage, cost tracking, performance metrics
- **Security** - JWT + RBAC + AES-256 encrypted API key vault + audit logs

## Tech Stack

- **Frontend:** React 18 + Vite + TypeScript + TailwindCSS
- **Backend:** Node.js + Express + TypeScript + Mongoose
- **Database:** MongoDB Atlas
- **Real-time:** Socket.io
- **Auth:** JWT + bcrypt + RBAC

## Quick Start

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and API keys
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
moltbook/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── index.ts
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── stores/
│   │   ├── lib/
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## License

MIT
