# bia-tracker Feature Backlog

## Priority 1 - High Value Features

### 1. Workout Heatmap
**Description:** A GitHub-style commit heatmap visualization showing workout consistency over time, similar to GitHub's contribution graph.

**Details:**
- Display a calendar heatmap with each day as a cell
- **Color coding:**
  - Orange shades for running workouts (lighter = fewer/shorter runs, darker = multiple/longer runs)
  - Blue shades for lifting workouts (lighter = fewer/shorter lifts, darker = multiple/longer lifts)
- **Multi-activity days:** When a day has both runs and lifting:
  - Use a split/half-shaded cell approach (top half blue for lifting, bottom half orange for running)
  - Or use a mixed color (blend of orange and blue with intensity based on total volume/duration)
  - Or use a border/outline approach (solid color with contrasting border)
- **Interaction:**
  - Hover to see detailed breakdown: "2 runs (45 min total) + 1 lift (90 min)"
  - Click to view all workouts for that day
- **Time range:** Configurable view (last 3 months, 6 months, 1 year, all-time)
- **Legend:** Show color intensity scale explaining volume/duration mapping

---

### 2. Workout Statistics Dashboard
**Description:** Enhanced analytics and summary statistics for workout data.

**Features:**
- Weekly/monthly/yearly summary stats (total volume, frequency, duration)
- Average workout duration by type
- Longest workout streak tracker
- Personal records (PRs) for major lifts
- Weekly breakdown chart

---

### 3. Rest Day Analysis
**Description:** Insights into recovery and rest patterns.

**Features:**
- Correlation between rest days and sleep quality
- Suggested optimal rest days based on workout intensity
- Recovery score tracking
- Alert when consecutive workout days exceed threshold

---

## Priority 2 - Medium Value Features

### 4. Workout Comparison Over Time
**Description:** Compare the same workout/lift across different time periods.

**Features:**
- Select a specific lift/run type and compare month-over-month or year-over-year
- Progress visualization for specific exercises
- Volume/intensity trend analysis

---

### 5. Goals with Progress Tracking
**Description:** User-defined fitness goals with progress visualization.

**Features:**
- Set goals (e.g., "Squat 315 lbs", "Run 20 miles/week")
- Visual progress bars
- Goal completion notifications
- Historical goal data

---

### 6. Data Export Enhancements
**Description:** More flexible data export options.

**Features:**
- Export to CSV with custom columns
- Export to PDF reports (heatmap, summary stats, etc.)
- Data backup/restore functionality

---

### 7. Notifications & Reminders
**Description:** Proactive notifications for workout consistency.

**Features:**
- Remind user if no workout logged for N days
- Milestone celebrations (100 workouts, 52-week streak, etc.)
- Weekly summary notification
- Browser push notifications

---

## Priority 3 - Polish & UX Improvements

### 8. Mobile Responsiveness
**Description:** Optimize UI for mobile devices.

**Features:**
- Responsive heatmap visualization
- Mobile-friendly data tables
- Touch-optimized controls

---

### 9. Dark Mode Enhancement
**Description:** Improve dark mode support across all features.

**Features:**
- Dark mode for heatmap (better color contrast)
- Consistent theming throughout app

---

### 10. Performance Optimization
**Description:** Improve app loading and rendering speed.

**Features:**
- Virtualize large tables
- Lazy load heatmap data
- Optimize database queries
- Implement caching strategies

---

### 11. Advanced Filtering
**Description:** More powerful workout filtering options.

**Features:**
- Filter by workout type, duration, intensity, date range
- Save custom filter presets
- Combined filters (e.g., "runs over 30 min in last month")

---

### 12. Trend Analysis
**Description:** AI-powered insights into workout patterns.

**Features:**
- Detect patterns in workout types and timing
- Suggest workout recommendations based on history
- Identify performance plateaus

---

## Completed Features ✓

- Strava integration
- Hevy integration
- Bodyspec sync
- Manual workout entry
- Sleep tracking
- Workout data tables
- Timeline/calendar view
- File upload capability
