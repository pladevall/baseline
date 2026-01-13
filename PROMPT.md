# Task: Next Workout Generator Column

Add a "Next Workout" column to the WorkoutTable that intelligently designs upcoming workouts based on the user's goals and workout history.

## Requirements

### Phase 1: Lifting Workout Generator

- [ ] Add "Next Workout" column in WorkoutTable between Trend column and first workout date column
- [ ] Create `lib/workout-generator.ts` with lifting workout generation logic
- [ ] Generate routine with 3 muscle groups, 8 sets per muscle group (24 total sets)
- [ ] Choose exercises only from user's previously completed exercises
- [ ] Set weight/reps targeting: 8 reps at heaviest weight + 5lb OR combo that sets new set volume record (max 14 reps)
- [ ] Display results in Lbs
- [ ] Track weekly sets per muscle group (goal: 16 sets/week, week starts Monday)
- [ ] Prioritize muscle groups that haven't hit 16 sets this week
- [ ] Routine name format: "MuscleGroup1 + MuscleGroup2 + MuscleGroup3"
- [ ] Place generated routine in folder "Custom Routines"

**Muscle groups to choose from:**
1. Chest
2. Abdominals (maps to 'core' in codebase)
3. Biceps
4. Triceps
5. Shoulders
6. Quads (maps to 'quadriceps' in codebase)
7. Hamstring (maps to 'hamstrings' in codebase)
8. Glutes

### Phase 2: Running Workout Generator

- [ ] Generate ONE next run workout (not a full weekly plan - that will come later)
- [ ] Classify existing Strava runs by workout type based on name patterns
- [ ] Choose from workout types: Easy Run, Long Run, Tempo Run, Intervals, Hill Repeats, Fartlek, Recovery
- [ ] Progressive overload: previous distance + 0.5 miles OR previous pace - 5 sec/mile
- [ ] Respect 20% weekly mileage increase limit
- [ ] Target: 15+ miles/week, training for Napa Marathon (March 2025), sub-3:30 goal (7:59/mi)
- [ ] Display: distance in miles, pace in mm:ss/mile, total time
- [ ] Week starts Monday - check what's been done to pick appropriate workout type
- [ ] Naming format: "WorkoutType - Date" (e.g., "Tempo - Jan 14")

### Phase 3: Push to Hevy Integration

- [ ] Add "Push to Hevy" button for generated lifting workouts
- [ ] Use Hevy API to create routine with current date in name
- [ ] Store in "Custom Routines" folder on Hevy

## Technical Context

### Key Files to Understand:
- `components/WorkoutTable.tsx` - Main table component (2200+ lines)
- `lib/types.ts` - Types: `LiftingWorkout`, `RunningActivity`, `LiftingExercise`, `BODY_PARTS`
- `lib/hevy-client.ts` - `HevyClient` class with API methods, `convertHevyWorkout()`
- `lib/supabase-hevy.ts` - Database operations for workouts

### Existing Data Structures:
```typescript
// LiftingWorkout has:
- exercises: LiftingExercise[] | null (name, bodyPart, sets, reps, weightLbs)
- exercisesDetailed: LiftingExerciseDetailed[] | null (includes set-by-set data)
- bodyParts: Record<string, BodyPartStats> (sets, reps, volumeLbs per body part)

// RunningActivity has:
- distanceMiles, durationSeconds, averagePaceSeconds
- name (contains workout type like "Easy Run")
```

### Week Calculation (Monday start):
```typescript
const day = now.getDay();
const diff = now.getDate() - day + (day === 0 ? -6 : 1);
const weekStart = new Date(now.setDate(diff));
```

## Success Criteria

- [ ] Next Workout column displays in correct position
- [ ] Lifting workout generator produces valid 24-set routines
- [ ] Muscle group selection respects weekly totals (goal: 16 sets/group)
- [ ] Weight/rep targets are calculated from historical data
- [ ] Running plan respects progressive overload rules
- [ ] Push to Hevy button creates routine via API
- [ ] All existing functionality in WorkoutTable still works
- [ ] TypeScript compiles without errors
- [ ] App runs without crashes

## When Done

After implementing and verifying all features, confirm completion by outputting the text from ralph.yml's completion_promise setting.
