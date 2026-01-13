# Next Workout Generator Progress

## Completed

### Iteration 1: Created workout generator module
- Created `lib/workout-generator.ts` with:
  - Lifting workout generator:
    - `LIFTING_MUSCLE_GROUPS` constant mapping display names to body part codes
    - `getWeeklySetsPerMuscleGroup()` - calculates sets per muscle group for current week
    - `selectMuscleGroups()` - prioritizes groups that haven't hit 16 sets/week
    - `getExercisesForMuscleGroup()` - gets exercise history with heaviest weight, max volume
    - `generateSetTarget()` - calculates target weight/reps (heaviest + 5lb at 8 reps OR volume PR)
    - `generateExercisesForGroup()` - generates 8 sets distributed across 2-3 exercises
    - `generateLiftingWorkout()` - full routine with 3 muscle groups, 24 sets total
  - Running workout generator:
    - `classifyRunWorkoutType()` - classifies runs by name patterns
    - `getWeeklyRuns()`, `getWeeklyMileage()`, `getPreviousWeekMileage()` - weekly stats
    - `chooseNextWorkoutType()` - picks appropriate workout for day of week
    - `generateRunningWorkout()` - generates one run with distance, pace, duration
    - Respects 20% weekly mileage increase limit
    - Marathon training focus (sub-3:30 goal = 7:59/mi)
  - Types: `GeneratedLiftingWorkout`, `GeneratedRunningWorkout`, `GeneratedExercise`, `GeneratedSet`

### Iteration 2: Added "Next" column to WorkoutTable UI
- Added "Next" header column in table header (after Trend column)
- Updated all `fixedCellsCount` from 4 to 5 in SectionHeaderRow components
- Added empty "Next" cells to all TimeSeriesRow fixedContent sections:
  - Streaks row
  - Workouts row
  - Lifting section: Sets, Duration, Reps, Body parts, Exercises rows
  - Running section: Miles, Duration, Pace, Avg HR, Max HR, Cadence, Elevation, Split times rows
- All cells styled with green background (`bg-green-50/30 dark:bg-green-900/10`)
- TypeScript compiles without errors

### Iteration 3: Wired up workout generators to display in Next column
- Imported workout generator functions in WorkoutTable.tsx:
  - `generateLiftingWorkout`, `generateRunningWorkout`, `GeneratedLiftingWorkout`, `GeneratedRunningWorkout`, `getWeeklySetsPerMuscleGroup`
- Added `useMemo` hooks to generate workouts:
  - `nextLiftingWorkout` - generated lifting workout
  - `nextRunningWorkout` - generated running workout
  - `weeklySetsPerMuscleGroup` - for tracking weekly sets
- Updated Lifting Sets "Next" cell:
  - Shows total sets count with green styling
  - Tooltip displays workout name and all exercises with sets/weight/reps
- Updated Running Miles "Next" cell:
  - Shows distance with green styling
  - Tooltip displays workout name, distance, target pace, estimated time, and notes
- TypeScript compiles without errors

## Remaining Tasks

1. Add "Push to Hevy" button integration (Phase 3)
2. Optionally populate more Next cells (Duration, Pace, etc.) if desired
3. Update PROMPT.md with progress checkboxes

## Technical Notes

- The WorkoutTable uses `TimeSeriesTable` component
- Fixed columns are now: Goal, Workload, Avg, Trend, Next (5 columns)
- Each row uses `TimeSeriesRow` with `fixedContent` for the fixed columns
- `fixedCellsCount={5}` in all SectionHeaderRow components
- Generated workouts are memoized based on workout data
