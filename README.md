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

## Placeholder / Future Roadmap Sections
- [ ] Database Schema & Migrations
- [ ] Queue System & Background Workers
- [ ] Email Provider Integration & Rate Limiting
- [ ] Authentication & User Management
- [ ] Analytics & Dashboard UI