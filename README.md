# Saulgooo - AI Assistant Workspace

A Next.js application integrated with Claude Agent SDK for AI-powered workspace assistance.

## Features

- 🤖 AI Assistant powered by Anthropic Claude
- 📁 Workspace file management
- 💾 Persistent session storage
- 🔄 Background task processing with BullMQ
- 📊 Real-time task status updates

## Tech Stack

- [Next.js](https://nextjs.org) - Full-stack React framework
- [NextAuth.js](https://next-auth.js.org) - Authentication
- [Prisma](https://prisma.io) - Database ORM
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [tRPC](https://trpc.io) - End-to-end typesafe APIs
- [BullMQ](https://bullmq.io/) - Queue system for background jobs
- [Redis](https://redis.io/) - In-memory data store

## Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose (for Redis)

### 1. Clone and Install

```bash
git clone <repository-url>
cd saulgooo
npm install
```

### 2. Start Redis with Docker

```bash
# Start Redis service
docker-compose up -d redis

# Optional: Start Redis with web UI
docker-compose --profile tools up -d
```

### 3. Setup Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key environment variables:
```env
# Database
DATABASE_URL="file:./db.sqlite"

# Redis (for BullMQ)
REDIS_HOST="localhost"
REDIS_PORT="6379"

# Anthropic API
ANTHROPIC_AUTH_TOKEN="your-token"
ANTHROPIC_BASE_URL="https://open.bigmodel.cn/api/anthropic"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
AUTH_SECRET="your-secret"
```

### 4. Initialize Database

```bash
npm run db:migrate
```

### 5. Run Development Server

```bash
# Worker will start automatically with Next.js
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

## Development Scripts

```bash
# Development
npm run dev          # Start Next.js (Worker starts automatically)

# Database
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio
npm run db:push      # Push schema changes

# Build & Deploy
npm run build        # Build for production
npm run start        # Start production server
npm run preview      # Preview production build

# Utilities
npm run lint         # Run ESLint
npm run format:write # Format code
npm run typecheck    # Type checking
```

## Docker Services

### Redis Server

```bash
# Start Redis
docker-compose up -d redis

# Stop Redis
docker-compose down

# View logs
docker-compose logs -f redis

# Access Redis CLI
docker exec -it saulgooo-redis redis-cli
```

### Redis Commander (Optional Web UI)

```bash
# Start with Redis Commander
docker-compose --profile tools up -d

# Access at http://localhost:8081
```

## Project Structure

```
├── src/
│   ├── app/              # Next.js app router
│   ├── components/       # React components
│   ├── lib/              # Utility libraries
│   │   ├── queue.ts      # BullMQ queue config
│   │   ├── worker.ts     # BullMQ worker
│   │   └── queue-utils.ts # Queue utilities
│   ├── server/           # Server-side code
│   └── trpc/             # tRPC router
├── prisma/               # Database schema
├── redis/                # Redis config
├── scripts/              # Helper scripts
└── docs/                 # Documentation
```

## Background Task Processing

This application uses BullMQ for processing AI queries in the background:

- Tasks are queued when users submit queries
- Worker processes tasks asynchronously
- Status updates are tracked in real-time
- Failed tasks are automatically retried

For detailed setup, see [docs/BULLMQ_SETUP.md](./docs/BULLMQ_SETUP.md).

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## License

[MIT](LICENSE)

## Support

For help and questions:
- Create an issue in the repository
- Join our Discord community
- Check the documentation in the `/docs` folder