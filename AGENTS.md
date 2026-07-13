# PlantMD — AI Plant Disease Assistant

> [!IMPORTANT]
> This project uses TanStack Start with Vite. Avoid rewriting published git
> history — force pushing, or rebasing/amending/squashing commits that are
> already pushed.

## Rebuild Architecture

The project has been rebuilt as a decoupled full-stack application:
1. **Frontend**: Next.js (App Router), Tailwind CSS, Supabase Auth client.
2. **Backend**: FastAPI (Python), LangChain, sentence-transformers, Qdrant client.
3. **Database**: Supabase PostgreSQL for persistent user metadata, conversations, and messages.
4. **Vector Database**: Qdrant running locally via Docker.

## Getting Started

### Local Development

1. Install dependencies:
   ```bash
   npm run install:all
   ```

2. Run services locally:
   - Frontend: `npm run dev:frontend`
   - Backend: `npm run dev:backend`

### Docker Deployment

To spin up all services including Qdrant:
```bash
npm run docker:up
```
