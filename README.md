# ReachInbox Email Scheduler

A full-stack email scheduling application built with a modern TypeScript monorepo architecture.

## Overview
This repository contains the full-stack code for the ReachInbox Email Scheduler task, split into independent client (Frontend) and server (Backend) applications.

## Project Structure

```
reachinbox-email-scheduler/
├── client/                 # React + Vite + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── layout/
│   │   │   └── email/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
├── server/                 # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── queues/
│   │   ├── workers/
│   │   ├── integrations/
│   │   ├── utils/
│   │   ├── types/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation & Setup

#### Backend Setup (`server`)
```bash
cd server
npm install
npm run dev
```

The backend server will run at `http://localhost:5000`.

#### Frontend Setup (`client`)
```bash
cd client
npm install
npm run dev
```

The frontend client application will run at `http://localhost:5173`.

## Production Deployment Guide

### Deployment Architecture
- **Frontend**: React + Vite SPA (Vercel or Render Static Site)
- **Backend API**: Express + TypeScript Web Service (Render Web Service / Railway)
- **Background Worker**: BullMQ Queue Consumer (Render Background Worker)
- **Database & Services**: Managed MySQL (Aven / PlanetScale / Railway), Managed Redis (Render Redis / Upstash), Managed Elasticsearch (Elastic Cloud / Bonsai)

---

### Production Commands

#### 1. Backend Web Service (`server/`)
- **Build Command**: `npm run build` (`prisma generate && tsc`)
- **Start Command**: `npm run start` (`node dist/server.js`)

#### 2. Background Worker (`server/`)
- **Build Command**: `npm run build` (`prisma generate && tsc`)
- **Start Command**: `npm run start:worker` (`node dist/worker.js`)

#### 3. Frontend SPA (`client/`)
- **Build Command**: `npm run build` (`tsc && vite build`)
- **Output Directory**: `dist`

---

### Required Environment Variables

#### Backend Web Service & Background Worker Environment Variables
| Variable | Description | Example / Default |
|---|---|---|
| `PORT` | HTTP port provided by host | `5000` |
| `NODE_ENV` | Environment mode | `production` |
| `CLIENT_URL` | Frontend origin for CORS & cookies | `https://reachinbox-client.vercel.app` |
| `DATABASE_URL` | MySQL connection URI | `mysql://user:pass@host:3306/db` |
| `REDIS_URL` | Redis connection URI (preferred) | `rediss://default:pass@host:6379` |
| `REDIS_HOST` | Redis host (fallback if no `REDIS_URL`) | `localhost` |
| `REDIS_PORT` | Redis port (fallback if no `REDIS_URL`) | `6379` |
| `ELASTICSEARCH_NODE` | Elasticsearch node URL | `https://elastic:pass@es-node:9200` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `GOCSPX-xxx` |
| `GOOGLE_CALLBACK_URL` | Google OAuth Redirect Callback URI | `https://api.domain.com/api/auth/google/callback` |
| `SLACK_CLIENT_ID` | Slack OAuth App Client ID | `12345.6789` |
| `SLACK_CLIENT_SECRET` | Slack OAuth App Client Secret | `xxx` |
| `SLACK_REDIRECT_URI` | Slack OAuth Redirect Callback URI | `https://api.domain.com/api/slack/oauth/callback` |
| `SESSION_SECRET` | Random session signing secret | `super_secret_production_key` |
| `SMTP_HOST` | SMTP server host | `smtp.ethereal.email` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username | `user@ethereal.email` |
| `SMTP_PASS` | SMTP password | `secret` |
| `SMTP_SECURE` | TLS requirement flag | `false` |
| `WORKER_CONCURRENCY` | Concurrent BullMQ job worker threads | `5` |
| `MIN_SEND_DELAY_MS` | Minimum delay between sender emails (ms) | `2000` |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | Hourly limit quota per sender account | `200` |

#### Frontend Environment Variables
| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Backend production API URL | `https://reachinbox-api.onrender.com` |