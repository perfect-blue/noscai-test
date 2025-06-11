# TypeScript Express App (Dockerized)

This is a simple Node.js + TypeScript app using Express, containerized with Docker.

---

## 🛠 Prerequisites

- [Node.js](https://nodejs.org/) (for local development)
- [Docker](https://www.docker.com/) (for containerized runs)

---

## 🚀 Getting Started

### ▶️ Run Locally (without Docker)

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run build

# Run the compiled app
npm start


# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).


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