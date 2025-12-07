export const config = {
  // Enter your Hackatime (Slack) username here (leave empty to prompt user)
  username: process.env.NEXT_PUBLIC_HACKATIME_USERNAME || "", 
  // Goal Mode: 'daily' (fixed hours/day) or 'total' (reach X hours by year end)
  goalMode: process.env.NEXT_PUBLIC_GOAL_MODE || "total",
  // Set your default daily goal in hours (for 'daily' mode)
  dailyGoalHours: Number(process.env.NEXT_PUBLIC_DAILY_GOAL_HOURS) || 1,
  // Set your target total hours for the year (for 'total' mode)
  targetTotalHours: Number(process.env.NEXT_PUBLIC_TARGET_TOTAL_HOURS) || 225,
  // Minimum minutes to count as a "streak" day
  streakMinMinutes: Number(process.env.NEXT_PUBLIC_STREAK_MIN_MINUTES) || 1,
};
