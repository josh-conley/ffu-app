# Fantasy Football Union (FFU) App

A full-stack application for tracking Fantasy Football Union league history, stats, and records across multiple leagues with promotion/relegation system.

## Architecture

- **Frontend**: React with TypeScript
- **Backend**: Node.js/Express with TypeScript
- **Data Source**: Sleeper API

## Leagues

- **Premier League**: Top tier
- **Masters League**: Middle tier  
- **National League**: Entry tier

## Features

- League standings by year
- Playoff tracking and results
- Member history across leagues/years
- Promotion/relegation tracking
- Team and player statistics

## Quick Start

```bash
# Install dependencies
npm install
cd backend && npm install
cd ../frontend && npm install

# Set up environment files
cd backend && cp .env.example .env && cd ..
cd frontend && cp .env.example .env && cd ..

# Run development servers (both frontend and backend)
npm run dev
```

Visit http://localhost:5173 to see the frontend and http://localhost:3001 for the API.

For detailed setup instructions, see [SETUP.md](./SETUP.md).

## Project Structure

```
ffu-app/
├── backend/          # Express API server
├── frontend/         # React application
├── shared/           # Shared types and utilities
└── package.json      # Root package.json
```