# Mario Kart Tournament Tracker

Vue 3 + TypeScript single-page app for tracking Mario Kart tournaments over months of play.

## Features checklist
- [x] Multi-user authentication (email/password)
- [x] Cloud storage with Supabase
- [x] Row Level Security (users only see their own data)
- [x] Create, rename, delete tournaments with independent players and races
- [x] Configurable tournament settings (initial points, points array, tie handling)
- [x] Add/edit/remove players with per-player initial point overrides
- [x] Prevent deletion if a player exists in race history (archive instead)
- [x] Add races with drag-and-drop or rank dropdowns (ties + DNF/DQ)
- [x] Leaderboard with last race points, gaps, and summary
- [x] Player stats (wins, podiums, average finish, streaks, recent form)
- [x] Tournament stats (most-played track, closest race, win rates)
- [x] Race history with filters + edit/delete

## Project setup
```sh
npm install
```

### Compile and hot-reload for development
```sh
npm run dev
```

### Type check
```sh
npm run typecheck
```

### Compile and minify for production
```sh
npm run build
```

## Setup

1. **Install dependencies:**
   ```sh
   npm install
   ```

2. **Configure Supabase:**
   - Create a Supabase project at [supabase.com](https://supabase.com)
   - Run the SQL schema from `supabase-schema.sql` in your Supabase SQL Editor
   - Copy `.env.example` to `.env` and add your Supabase credentials:
     ```
     VITE_SUPABASE_URL=your-project-url
     VITE_SUPABASE_ANON_KEY=your-anon-key
     ```

3. **Start development server:**
   ```sh
   npm run dev
   ```

## Authentication
- Users must sign up and log in to access the app
- Each user has isolated data (Row Level Security)
- Password reset functionality available on login page

## Data Storage
- All data automatically saved to Supabase cloud database
- Changes persist across devices and browsers
- No manual save/export needed

## Points system
- Update per tournament in **Leaderboard → Tournament settings**

## Folder overview
- `src/lib` Supabase client and database types
- `src/stores` Pinia stores (appStore, authStore)
- `src/components` reusable UI components
- `src/views` route views (login, signup, leaderboards, etc.)
- `src/utils` scoring, stats, and formatting helpers
