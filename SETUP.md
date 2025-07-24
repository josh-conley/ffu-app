# FFU App Setup Instructions

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

## Installation

1. **Clone/Navigate to the project directory:**
   ```bash
   cd ffu-app
   ```

2. **Install root dependencies:**
   ```bash
   npm install
   ```

3. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   cd ..
   ```

4. **Install frontend dependencies:**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

## Environment Setup

1. **Backend Environment:**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env if needed (PORT is optional, defaults to 3001)
   cd ..
   ```

2. **Frontend Environment:**
   ```bash
   cd frontend
   cp .env.example .env
   # Edit .env if needed (API_URL defaults to http://localhost:3001/api)
   cd ..
   ```

## Running the Application

### Development Mode (Both frontend and backend)
```bash
npm run dev
```

This will start:
- Backend API server on http://localhost:3001
- Frontend React app on http://localhost:5173

### Individual Services

**Backend only:**
```bash
npm run dev:backend
# or
cd backend && npm run dev
```

**Frontend only:**
```bash
npm run dev:frontend
# or
cd frontend && npm run dev
```

## Building for Production

```bash
npm run build
```

This will:
1. Build the backend TypeScript to JavaScript in `backend/dist/`
2. Build the frontend React app in `frontend/dist/`

## Starting Production Server

```bash
npm start
```

This runs the backend server from the built files.

## API Endpoints

The backend provides the following endpoints:

- `GET /health` - Health check
- `GET /api/leagues/standings` - All league standings for all years
- `GET /api/leagues/history` - Complete league history organized by year
- `GET /api/leagues/:league/:year` - Specific league standings (league: premier/masters/national)
- `GET /api/leagues/:league/:year/:week` - Week matchups

## Frontend Routes

- `/` - Overview dashboard
- `/standings` - Current league standings
- `/history` - Historical league data
- `/matchups` - Weekly matchup viewer

## Data Source

The application fetches data from the Sleeper API:
- League information and standings
- User profiles and team names
- Weekly matchups and scores
- Playoff brackets (when available)

## League Structure

- **Premier League**: Top tier
- **Masters League**: Middle tier
- **National League**: Entry tier

Teams can be promoted to higher leagues or relegated to lower leagues based on performance.

## Troubleshooting

1. **CORS Issues**: Make sure the backend is running on port 3001 and frontend on 5173
2. **API Connection**: Check that VITE_API_URL in frontend/.env points to the correct backend URL
3. **Sleeper API**: The app depends on Sleeper's public API - check if sleeper.app is accessible

## Development Notes

- Backend uses TypeScript with ES modules
- Frontend uses React 18+ with TypeScript and Tailwind CSS
- Shared types are in the `/shared` directory
- The app includes comprehensive error handling and loading states