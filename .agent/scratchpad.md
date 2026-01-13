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

## Remaining Tasks

1. Add "Next Workout" column header in WorkoutTable.tsx (between Trend and date columns)
2. Add "Next Workout" cells in rows (showing generated workout info)
3. Test the UI displays correctly
4. Add "Push to Hevy" button integration
5. Update PROMPT.md with progress

## Technical Notes

- The WorkoutTable uses `TimeSeriesTable` component
- Fixed columns are: Goal, Workload, Avg, Trend
- Date columns come after the fixed columns
- Each row uses `TimeSeriesRow` with `fixedContent` for the fixed columns
- `fixedCellsCount={4}` in SectionHeaderRow
- Need to add 5th fixed column for "Next Workout"
