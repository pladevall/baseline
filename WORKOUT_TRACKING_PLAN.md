# Workout Tracking Feature - Implementation Plan

## Overview
Add running (Strava) and lifting (Hevy) workout tracking to bia-tracker with a unified WorkoutTable UI.

---

## Data Sources

| Source | Auth Method | Data |
|--------|-------------|------|
| **Strava** | OAuth 2.0 (PKCE) | Running activities, splits, pace |
| **Hevy** | API Key (`8494616f-...`) | Lifting workouts, sets, body parts |

---

## 1. Database Schema

**New tables** (migration: `003_create_workout_tables.sql`):

```sql
-- Strava OAuth connections
strava_connections (
  id UUID PRIMARY KEY,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  athlete_id TEXT,
  athlete_name TEXT,
  last_sync TIMESTAMPTZ,
  sync_status TEXT  -- 'connected' | 'error' | 'pending'
)

-- Hevy API key connections
hevy_connections (
  id UUID PRIMARY KEY,
  api_key TEXT,
  connection_name TEXT,
  last_sync TIMESTAMPTZ,
  sync_status TEXT
)

-- Running activities from Strava
running_activities (
  id UUID PRIMARY KEY,
  connection_id UUID REFERENCES strava_connections,
  strava_id TEXT UNIQUE,
  activity_date TIMESTAMPTZ,
  distance_miles DECIMAL,
  duration_seconds INTEGER,
  splits JSONB  -- [{mile: 1, time_seconds: 480}, ...]
)

-- Lifting workouts from Hevy
lifting_workouts (
  id UUID PRIMARY KEY,
  connection_id UUID REFERENCES hevy_connections,
  hevy_id TEXT UNIQUE,
  workout_date TIMESTAMPTZ,
  total_sets INTEGER,
  duration_seconds INTEGER,
  total_reps INTEGER,
  body_parts JSONB  -- {chest: {sets: 5, reps: 40}, ...}
  exercises JSONB
)
```

---

## 2. New Files to Create

### Types (`/lib/types.ts` additions)
- `StravaConnection`, `HevyConnection`
- `RunningActivity`, `RunningSplit`
- `LiftingWorkout`, `BodyPartStats`, `LiftingExercise`
- `WorkoutType = 'run' | 'lifting' | 'all'`
- `VolumePeriod = '7' | '30' | '90' | 'YTD' | 'PY'`
- `RUNNING_METRICS`, `LIFTING_METRICS`, `BODY_PARTS` constants

### Strava Integration
| File | Purpose |
|------|---------|
| `/lib/strava-config.ts` | OAuth URLs, client ID/secret |
| `/lib/strava-client.ts` | API client, activity fetching, split calculation |
| `/lib/supabase-strava.ts` | DB operations for connections & activities |
| `/app/api/auth/strava/authorize/route.ts` | Initiate OAuth (PKCE in cookies) |
| `/app/api/auth/strava/callback/route.ts` | Exchange code for tokens |
| `/app/api/strava/connections/route.ts` | GET/DELETE connections |
| `/app/api/strava/sync/route.ts` | Fetch & store activities |
| `/app/api/strava/activities/route.ts` | Retrieve stored activities |

### Hevy Integration
| File | Purpose |
|------|---------|
| `/lib/hevy-client.ts` | API client with API key auth |
| `/lib/supabase-hevy.ts` | DB operations for connections & workouts |
| `/app/api/hevy/connect/route.ts` | Validate key & create connection |
| `/app/api/hevy/connections/route.ts` | GET/DELETE connections |
| `/app/api/hevy/sync/route.ts` | Fetch & store workouts |
| `/app/api/hevy/workouts/route.ts` | Retrieve stored workouts |

### UI Components
| File | Purpose |
|------|---------|
| `/components/StravaConnect.tsx` | OAuth connect button & status |
| `/components/HevyConnect.tsx` | API key input form |
| `/components/WorkoutSyncButton.tsx` | Trigger sync with loading state |
| `/components/WorkoutTable.tsx` | Main workout data table |

---

## 3. WorkoutTable UI Design

```
[Run] [Lifting] [All]  <-- Toggle (filter what's shown)

| Metric      | Jan 11 | Jan 10 | Jan 9 | Volume [7|30|90|YTD|PY] |
|-------------|--------|--------|-------|-------------------------|
| LIFTING     |        |        |       |                         |
| Sets        | 24     | —      | 18    | 156                     |
| Duration    | 1:05   | —      | 0:52  | 8:30                    |
| Reps        | 180    | —      | 140   | 1,240                   |
| Chest       | 8      | —      | —     | 32                      |
| Shoulders   | 6      | —      | 8     | 48                      |
| Triceps     | 4      | —      | 4     | 24                      |
| ...         |        |        |       |                         |
|-------------|--------|--------|-------|-------------------------|
| RUNNING     |        |        |       |                         |
| Miles       | —      | 5.2    | —     | 28.4                    |
| Duration    | —      | 42:15  | —     | 3:45:20                 |
| 1 Mile      | —      | 7:52   | —     | —                       |
| 2 Miles     | —      | 15:58  | —     | —                       |
| 5K          | —      | 24:42  | —     | —                       |
| 5 Miles     | —      | 40:30  | —     | —                       |
```

**Key features:**
- Toggle: Run / Lifting / All (stacked when both shown)
- Volume column: Aggregated totals for selected period (7/30/90/YTD/PY)
- Volume aggregation for lifting: **Total sets**
- Sticky first column (metric names)
- Date columns sorted newest first
- Body part rows only show if that body part was worked

---

## 4. Implementation Order

### Phase 1: Foundation
1. Create database migration
2. Add TypeScript types to `/lib/types.ts`

### Phase 2: Strava (Running)
3. Create `/lib/strava-config.ts` + `/lib/strava-client.ts`
4. Create `/lib/supabase-strava.ts`
5. Create OAuth routes (`authorize`, `callback`)
6. Create data routes (`connections`, `sync`, `activities`)
7. Create `StravaConnect.tsx` component

### Phase 3: Hevy (Lifting)
8. Create `/lib/hevy-client.ts`
9. Create `/lib/supabase-hevy.ts`
10. Create API routes (`connect`, `connections`, `sync`, `workouts`)
11. Create `HevyConnect.tsx` component

### Phase 4: UI
12. Create `WorkoutSyncButton.tsx`
13. Create `WorkoutTable.tsx` (main table)
14. Update `/app/page.tsx` to add workout section

---

## 5. Environment Variables Needed

```bash
# .env.local additions
STRAVA_CLIENT_ID=195501
STRAVA_CLIENT_SECRET=9eaeba37079e0b44eb4f90cc38a2c6fb047ddff5

# Hevy API Key
HEVY_API_KEY=8494616f-f33a-4eb7-92d1-aff202f5df63
```

---

## 6. Verification Plan

1. **Database**: Run migration, verify tables created in Supabase dashboard
2. **Strava OAuth**:
   - Click connect -> redirects to Strava
   - Authorize -> returns with connection saved
   - Sync -> activities appear in table
3. **Hevy API**:
   - Enter API key -> validates and saves connection
   - Sync -> workouts appear in table
4. **WorkoutTable**:
   - Toggle between Run/Lifting/All works
   - Volume period toggle updates aggregations
   - Body part rows only appear when data exists
   - Dates sorted newest first

---

## Key Reference Files
- `/app/api/auth/bodyspec/authorize/route.ts` - OAuth pattern
- `/lib/supabase-bodyspec.ts` - DB operation pattern
- `/components/DataTable.tsx` - Table UI pattern
- `/lib/types.ts` - Type definition pattern

---

## API Documentation Links
- **Strava**: https://developers.strava.com/docs/getting-started/
- **Hevy**: https://api.hevyapp.com/docs/

## Prerequisites
- [x] Strava API application created (Client ID: 195501)
- [x] Hevy Pro API key obtained
