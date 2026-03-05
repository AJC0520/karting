# 🏎️ Mario Kart Tournament Tracker

A comprehensive tournament tracking system for Mario Kart competitions. Track races, players, and standings over time with detailed statistics, visual analytics, and customizable scoring rules.

## Why I Built This

When racing with my friends, I realized there was no good way for keeping track of races over the course of some period. We wanted to see who was really the best over time, track our improvement, and maintain standings across weeks or months of play. This app solves that problem with persistent cloud storage, detailed analytics, and everything needed to run a proper long-term tournament.

## ✨ Features

### Tournament Management
- Create unlimited tournaments with independent players and races
- Configurable scoring rules (points per placement, initial points, tie handling)
- Tournament-specific settings including the Blue Shell Bonus system
- Rename, archive, or delete tournaments

### Race Tracking
- Quick race entry with drag-and-drop or dropdown ranking
- Support for ties, DNF (Did Not Finish), and DQ (Disqualified) statuses
- Track selection with history
- Edit or delete past races
- Optional Blue Shell tracking for bonus points

### Statistics & Analytics
- Real-time leaderboard with point gaps and last race performance
- Player statistics: wins, podiums, average finish, win streaks, recent form
- Tournament insights: most-played tracks, win rates
- Visual leadership progression chart showing point accumulation over time
- Podium graph with overtake labels showing leadership changes

### Special Features
- **Blue Shell Bonus**: Reward players who overcome the blue shell curse and still win (+1 bonus point)
- **Player Archives**: Safely remove players from active roster while preserving historical race data
- **Multi-device Support**: Cloud sync means your data follows you across devices

### Security & Privacy
- Multi-user authentication with email/password
- Row Level Security ensures users only see their own tournaments
- Password reset functionality
- Secure cloud storage with Supabase

## 🚀 Tech Stack

- **Frontend**: Vue 3 (Composition API) + TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Pinia
- **Database**: Supabase (PostgreSQL)
- **Build Tool**: Vite
- **Routing**: Vue Router

## 📦 Installation

### Prerequisites
- Node.js v20.19.0 or v22.12.0+
- A Supabase account ([create one free](https://supabase.com))

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd karting
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - In your Supabase SQL Editor, run the database schema (see Database Setup section)
   - Get your project credentials from Settings → API

4. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Build for production**
   ```bash
   npm run build
   ```

## 🗄️ Database Setup

Run this SQL in your Supabase SQL Editor to create the required tables and Row Level Security policies:

```sql
-- Create tournaments table
CREATE TABLE tournaments (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  initial_points INTEGER NOT NULL DEFAULT 0,
  points_by_placement INTEGER[] NOT NULL,
  tie_handling TEXT NOT NULL DEFAULT 'split',
  blue_shell_bonus BOOLEAN DEFAULT false
);

-- Create players table
CREATE TABLE players (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  nickname TEXT,
  created_at TIMESTAMP NOT NULL,
  archived BOOLEAN NOT NULL DEFAULT false,
  initial_points INTEGER
);

-- Create races table
CREATE TABLE races (
  id TEXT PRIMARY KEY,
  tournament_id TEXT NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  timestamp TIMESTAMP NOT NULL,
  track TEXT NOT NULL,
  placements TEXT[] NOT NULL,
  notes TEXT,
  status JSONB,
  rank_by_player JSONB,
  manual_points JSONB,
  blue_shells JSONB
);

-- Enable Row Level Security
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE races ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tournaments
CREATE POLICY "Users can view own tournaments" ON tournaments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tournaments" ON tournaments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tournaments" ON tournaments
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tournaments" ON tournaments
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for players
CREATE POLICY "Users can view players in their tournaments" ON players
  FOR SELECT USING (
    tournament_id IN (SELECT id FROM tournaments WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create players in their tournaments" ON players
  FOR INSERT WITH CHECK (
    tournament_id IN (SELECT id FROM tournaments WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update players in their tournaments" ON players
  FOR UPDATE USING (
    tournament_id IN (SELECT id FROM tournaments WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete players in their tournaments" ON players
  FOR DELETE USING (
    tournament_id IN (SELECT id FROM tournaments WHERE user_id = auth.uid())
  );

-- RLS Policies for races
CREATE POLICY "Users can view races in their tournaments" ON races
  FOR SELECT USING (
    tournament_id IN (SELECT id FROM tournaments WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create races in their tournaments" ON races
  FOR INSERT WITH CHECK (
    tournament_id IN (SELECT id FROM tournaments WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update races in their tournaments" ON races
  FOR UPDATE USING (
    tournament_id IN (SELECT id FROM tournaments WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete races in their tournaments" ON races
  FOR DELETE USING (
    tournament_id IN (SELECT id FROM tournaments WHERE user_id = auth.uid())
  );

-- Create indexes for better performance
CREATE INDEX idx_tournaments_user_id ON tournaments(user_id);
CREATE INDEX idx_players_tournament_id ON players(tournament_id);
CREATE INDEX idx_races_tournament_id ON races(tournament_id);
```

## 🎮 Usage

1. **Sign up** for an account
2. **Create a tournament** and configure scoring rules
3. **Add players** to your tournament
4. **Record races** after each session
5. **View statistics** and track progression over time

### Blue Shell Bonus

When creating a tournament, enable "Blue Shell Bonus" to award an extra point to players who:
- Get hit by a blue shell during the race
- Still manage to finish in 1st place

Mark affected players with the blue shell icon when entering race results.

## 📁 Project Structure

```
src/
├── components/       # Reusable UI components
├── lib/             # Supabase client and database types
├── router/          # Vue Router configuration
├── stores/          # Pinia state management
├── utils/           # Helper functions (scoring, stats, formatting)
├── views/           # Page components
├── App.vue          # Root component
└── main.ts          # Application entry point
```

## 🛠️ Development

```bash
# Run dev server
npm run dev

# Type check
npm run typecheck

# Build for production
npm run build

# Preview production build
npm run preview
```
