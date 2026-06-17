# MoltBook - AI Agent Orchestration & Analytics Platform

## Project Overview
MoltBook is a full-stack MERN platform for small teams (5-20 users) to create, deploy, monitor, and actively control AI agents across multiple LLM providers (OpenAI, Anthropic Claude, OpenRouter).

## Tech Stack
- **Frontend:** React 18 + Vite + TypeScript + TailwindCSS + shadcn/ui + Zustand + React Query + Socket.io-client
- **Backend:** Node.js 20 + Express.js + TypeScript + Mongoose + Socket.io + Bull (Redis queue) + JWT auth
- **Database:** MongoDB Atlas + Redis
- **LLM Providers:** OpenAI SDK, Anthropic SDK, OpenRouter

## Core Features
1. Agent Builder with system prompts, model selection, tool assignment, versioning
2. Multi-LLM Execution (OpenAI, Claude, OpenRouter)
3. Real-Time Monitoring with WebSocket-streamed thought chain
4. Mid-Run Prompt Injection (pause, inject, resume)
5. Decision Nodes (human-in-the-loop branching)
6. Memory/Context Control (read/edit agent memory and context)
7. A/B Testing (compare two agent configurations)
8. Writing Task Management (input, assign, approve, export)
9. Analytics (token usage, cost tracking, performance metrics)
10. Security (JWT + RBAC + AES-256 encrypted API key vault + audit logs)

## Architecture Rules
- TypeScript strict mode
- Backend: controllers → services → repositories (3-layer)
- Frontend: React Query for server state, Zustand for UI state
- All sensitive data encrypted/hashed before DB storage
- Every state-changing action → auditLogs collection
- WebSocket events namespaced: /agents
- All API endpoints require auth unless explicitly public

## Build Phases
- **Phase 1:** Project Setup & Authentication
- **Phase 2:** Agent Builder & LLM Adapter
- **Phase 3:** Real-Time Streaming & Thought Chain
- **Phase 4:** Agent Control & Intervention
- **Phase 5:** A/B Testing & Analytics
- **Phase 6:** Writing Task Management & Export

## Deployment
- Docker + Docker Compose
- MongoDB Atlas + Redis
- Render or similar

## Reference Documents
- Master Prompt: /opt/data/cache/documents/doc_955e985cdd6b_MoltBook_MasterPrompt_v1.0.docx
- PRD: /opt/data/cache/documents/doc_7dd354178744_MoltBook_PRD_v1.0.docx
