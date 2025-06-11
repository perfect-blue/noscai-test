# TypeScript Express App (Dockerized)

This is a simple Node.js + TypeScript app using Express, containerized with Docker.

---

## 🛠 Prerequisites

- [Node.js](https://nodejs.org/) (for local development)
- [Docker](https://www.docker.com/) (for containerized runs)

---

## Getting Started

### 1. run the database and redis
```bash
docker-compose up -d postgres redis
```

### 2. Run backend
```bash
cd backend

npm install

npx prisma generate
npx prisma push db

npx prisma seed db

npm run dev
```

## 3. install frontend dependencies
```bash
cd frontend
npm install

npm run dev
```

## System Design

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (React)       │    │   (Node.js)     │    │                 │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │AppointmentForm│◄────┤ │Lock Service │ │    │ │ PostgreSQL  │ │
│ │             │ │    │ │             │ │    │ │             │ │
│ │LockIndicator│ │    │ │AppointmentCtrl│◄────┤ │Appointments │ │
│ │             │ │    │ │             │ │    │ │Locks        │ │
│ │FollowPointer│ │    │ │SocketHandler│ │    │ │Users        │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │useLockSystem│ │    │ │   Redis     │ │    │ │   Prisma    │ │
│ │useWebSocket │◄────┤ │   Cache     │ │    │ │    ORM      │ │
│ └─────────────┘ │    │ │             │ │    │ └─────────────┘ │
└─────────────────┘    │ └─────────────┘ │    └─────────────────┘
                       │                 │
                       │ ┌─────────────┐ │
                       │ │ Socket.IO   │ │
                       │ │ Real-time   │ │
                       │ │Communication│ │
                       │ └─────────────┘ │
                       └─────────────────┘

### Key Components 1. Lock Service ( lockService.ts )
- Purpose : Core locking mechanism with Redis for atomic operations
- Features :
  - 5-minute lock duration with auto-renewal
  - Race condition prevention using Redis atomic operations
  - Database persistence with Prisma
  - Automatic cleanup of expired locks 2. Real-time Communication (Socket.IO)
- Purpose : Live updates and cursor tracking
- Features :
  - Lock acquisition/release notifications
  - Real-time cursor position sharing
  - User presence indicators
  - Rate limiting for performance 3. Frontend State Management (Jotai)
- Purpose : Reactive state management for locks and UI
- Features :
  - Atomic state updates
  - Real-time lock status synchronization
  - Cursor position tracking 4. Security & Performance
- JWT authentication
- Rate limiting (100 req/15min general, 10 lock ops/min)
- CORS protection
- Helmet security headers

Data Flow

- User Edit Attempt → Auto Lock Request → Redis Check → DB Transaction → Socket Broadcast → UI Update
- User Action → Socket Event → All Connected Clients → State Update → UI Refresh
- Timer Check → Auto-renewal (if active) → Force Release (if expired) → Cleanup → Notification