"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { fetchUserData, fetchYearlyTotal, fetchTodayStats, DailyData } from '../lib/api';
import { config } from '../lib/config';
import { differenceInDays, endOfYear, format, isSameDay, subDays, startOfYear, eachDayOfInterval } from 'date-fns';
import { Flame, Calendar, Clock, Target, Settings, User, Trophy, TrendingUp, Zap } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState<DailyData[]>([]);
  const [yearlyTotalSeconds, setYearlyTotalSeconds] = useState(0);
  const [todaySeconds, setTodaySeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState(config.username);
  const [showLogin, setShowLogin] = useState(false);
  
  // Settings State
  const [goalMode, setGoalMode] = useState<"daily" | "total">(config.goalMode as "daily" | "total");
  const [dailyGoal, setDailyGoal] = useState(config.dailyGoalHours);
  const [targetTotal, setTargetTotal] = useState(config.targetTotalHours);
  const [streakMinMinutes, setStreakMinMinutes] = useState(config.streakMinMinutes);

  useEffect(() => {
    // Check local storage for username
    const savedUser = localStorage.getItem('hackagoal_username');
    if (savedUser) {
        setUsername(savedUser);
    } else if (!config.username) {
        setShowLogin(true);
    }
  }, []);

  useEffect(() => {
    if (username) {
        loadData();
    } else {
        setLoading(false);
    }
  }, [username]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const input = (document.getElementById('login-username') as HTMLInputElement).value;
    if (input) {
        setUsername(input);
        localStorage.setItem('hackagoal_username', input);
        setShowLogin(false);
    }
  };

  const loadData = async () => {
    if (!username) return;
    setLoading(true);
    // Fetch daily breakdown, accurate yearly total, and today's real-time stats
    const [dailyRes, totalRes, todayRes] = await Promise.all([
        fetchUserData(username),
        fetchYearlyTotal(username),
        fetchTodayStats(username)
    ]);

    // Update dailyRes with today's real-time data
    if (todayRes) {
        setTodaySeconds(todayRes.total_seconds);
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const todayIndex = dailyRes.findIndex(d => d.date === todayStr);
        if (todayIndex >= 0) {
            dailyRes[todayIndex].stats = todayRes;
        } else {
            dailyRes.push({
                date: todayStr,
                stats: todayRes
            });
        }
    }

    setData(dailyRes);
    setYearlyTotalSeconds(totalRes);
    setLoading(false);
  };

  // --- Calculations ---
  const today = new Date();
  const yearStart = startOfYear(today);
  const yearEnd = endOfYear(today);
  const daysLeft = differenceInDays(yearEnd, today);
  const daysPassed = differenceInDays(today, yearStart) + 1;

  // Total Hours So Far (Use the accurate total from API)
  const totalHours = yearlyTotalSeconds / 3600;

  // Required Daily Hours (Dynamic for Total Mode)
  const requiredDailyHours = useMemo(() => {
    if (goalMode === 'daily') return dailyGoal;
    
    // Total Mode: (Target - Current) / Days Left
    const remaining = Math.max(0, targetTotal - totalHours);
    // If daysLeft is 0, avoid division by zero
    return daysLeft > 0 ? remaining / daysLeft : remaining;
  }, [goalMode, dailyGoal, targetTotal, totalHours, daysLeft]);

  // Streak Calculation (using streakMinMinutes)
  const currentStreak = useMemo(() => {
    let streak = 0;
    // data.date is now YYYY-MM-DD
    const todayStr = format(today, 'yyyy-MM-dd');
    const todayData = data.find(d => d.date === todayStr);
    
    // Check if coded today
    const codedToday = (todayData?.stats.total_seconds || 0) >= streakMinMinutes * 60;
    
    let checkDate = codedToday ? today : subDays(today, 1);
    
    // Sort descending
    const sortedData = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // We need to check consecutive days
    // Optimization: Create a map for quick lookup
    const dataMap = new Map(sortedData.map(d => [d.date, d]));

    // Max lookback 365 days to prevent infinite loops
    for (let i = 0; i < 365; i++) {
        const dateStr = format(checkDate, 'yyyy-MM-dd');
        const dayData = dataMap.get(dateStr);
        const seconds = dayData?.stats.total_seconds || 0;
        
        if (seconds >= streakMinMinutes * 60) {
            streak++;
            checkDate = subDays(checkDate, 1);
        } else {
            break;
        }
    }
    return streak;
  }, [data, streakMinMinutes, today]);

  // New Metrics
  const highScore = useMemo(() => {
    if (data.length === 0) return 0;
    const maxSeconds = Math.max(...data.map(d => d.stats.total_seconds || 0));
    return maxSeconds / 3600;
  }, [data]);

  const streakAverage = useMemo(() => {
    if (currentStreak === 0) return 0;
    
    // We need to sum the hours for the last 'currentStreak' days
    // Logic similar to streak calc but summing
    let sumSeconds = 0;
    let count = 0;
    
    const todayStr = format(today, 'yyyy-MM-dd');
    const todayData = data.find(d => d.date === todayStr);
    const codedToday = (todayData?.stats.total_seconds || 0) >= streakMinMinutes * 60;
    
    let checkDate = codedToday ? today : subDays(today, 1);
    const dataMap = new Map(data.map(d => [d.date, d]));

    for (let i = 0; i < currentStreak; i++) {
        const dateStr = format(checkDate, 'yyyy-MM-dd');
        const dayData = dataMap.get(dateStr);
        const seconds = dayData?.stats.total_seconds || 0;
        sumSeconds += seconds;
        count++;
        checkDate = subDays(checkDate, 1);
    }
    
    return count > 0 ? (sumSeconds / count) / 3600 : 0;
  }, [data, currentStreak, today, streakMinMinutes]);

  // Projection / On Track
  const projection = useMemo(() => {
    if (goalMode === 'daily') {
        // Projected total by end of year if we stick to dailyGoal
        return totalHours + (dailyGoal * daysLeft);
    } else {
        // For total mode, we track deviation
        // Expected hours by now
        // If we wanted linear progress from start of year:
        // const expectedByNow = (targetTotal / 365) * daysPassed;
        // But usually "on track" means "are we hitting the required rate?"
        // Let's show the deviation from the *original* linear path or just current status.
        // Let's use: Deviation = TotalHours - (TargetTotal * (DaysPassed/365))
        const expectedByNow = (targetTotal / 366) * daysPassed; // 2024 is leap year? 2025 is not. 365.
        return totalHours - expectedByNow;
    }
  }, [goalMode, totalHours, dailyGoal, daysLeft, targetTotal, daysPassed]);

  // 7 Day Chart Data
  const chartData = useMemo(() => {
    const last7Days = eachDayOfInterval({
        start: subDays(today, 6),
        end: today
    });

    return last7Days.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayData = data.find(d => d.date === dateStr); // Exact match YYYY-MM-DD
        const seconds = dayData?.stats.total_seconds || 0;
        const hours = seconds / 3600;
        // Compare against the *current* required daily hours (or fixed daily goal)
        const diff = hours - requiredDailyHours;
        return { date, hours, diff };
    });
  }, [data, today, requiredDailyHours]);


  return (
    <div className="min-h-screen text-white p-4 md:p-8 font-sans relative">
      <ChristmasBackground />
      
      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="glass-panel p-8 rounded-2xl max-w-md w-full mx-4 border border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
                <h2 className="text-2xl font-bold mb-2 text-center">Welcome to HackaGoal</h2>
                <p className="text-gray-400 text-center mb-6 text-sm">Enter your Hackatime (Slack) ID to start tracking.</p>
                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    <input 
                        id="login-username"
                        type="text" 
                        placeholder="e.g. U01234567"
                        className="bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-red-500 outline-none transition-colors"
                        autoFocus
                    />
                    <button 
                        type="submit"
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg hover:shadow-red-500/20"
                    >
                        Start Tracking
                    </button>
                </form>
            </div>
        </div>
      )}

      <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
        <div>
            <h1 className="text-4xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
            HackaGoal <span className="text-red-500">Xmas</span>
            </h1>
            <div className="flex items-center gap-2 text-gray-400 text-sm mt-1">
                <span>Tracking {username || "..."}</span>
                <button 
                    onClick={() => setShowLogin(true)}
                    className="hover:text-white transition-colors p-1 rounded hover:bg-white/10"
                    title="Change User"
                >
                    <User size={14} />
                </button>
            </div>
        </div>
        
        <div className="glass-panel p-4 rounded-xl flex flex-wrap gap-4 items-end">
            <div className="flex flex-col">
                <label className="text-xs text-gray-400 mb-1">Mode</label>
                <div className="flex bg-black/40 rounded p-1">
                    <button 
                        onClick={() => setGoalMode('daily')}
                        className={`px-3 py-1 text-xs rounded transition-colors ${goalMode === 'daily' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        Daily
                    </button>
                    <button 
                        onClick={() => setGoalMode('total')}
                        className={`px-3 py-1 text-xs rounded transition-colors ${goalMode === 'total' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        Total
                    </button>
                </div>
            </div>

            {goalMode === 'daily' ? (
                <div className="flex flex-col">
                    <label className="text-xs text-gray-400 mb-1">Daily Goal (h)</label>
                    <input 
                        type="number" 
                        value={dailyGoal}
                        onChange={(e) => setDailyGoal(Number(e.target.value))}
                        className="bg-black/40 border border-white/10 rounded px-2 py-1 text-sm w-20 text-white focus:border-red-500 outline-none"
                    />
                </div>
            ) : (
                <div className="flex flex-col">
                    <label className="text-xs text-gray-400 mb-1">Year Goal (h)</label>
                    <input 
                        type="number" 
                        value={targetTotal}
                        onChange={(e) => setTargetTotal(Number(e.target.value))}
                        className="bg-black/40 border border-white/10 rounded px-2 py-1 text-sm w-20 text-white focus:border-red-500 outline-none"
                    />
                </div>
            )}
             <div className="flex flex-col">
                <label className="text-xs text-gray-400 mb-1">Streak Min (m)</label>
                <input 
                    type="number" 
                    value={streakMinMinutes}
                    onChange={(e) => setStreakMinMinutes(Number(e.target.value))}
                    className="bg-black/40 border border-white/10 rounded px-2 py-1 text-sm w-20 text-white focus:border-red-500 outline-none"
                />
            </div>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
          
          {/* Countdown */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-300 text-sm uppercase tracking-wider">Time Left</h3>
              <Calendar className="text-red-500 w-5 h-5" />
            </div>
            <div className="text-5xl font-bold text-white drop-shadow-md">{daysLeft}</div>
            <div className="text-xs text-gray-400 mt-1">Days until New Year</div>
          </Card>

          {/* Today's Grind */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-300 text-sm uppercase tracking-wider">Today's Grind</h3>
              <Zap className="text-yellow-400 w-5 h-5" />
            </div>
            <div className="text-5xl font-bold text-white drop-shadow-md">{(todaySeconds / 3600).toFixed(1)}h</div>
            <div className="text-xs text-gray-400 mt-1">Hours coded today</div>
          </Card>

          {/* Streak */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-300 text-sm uppercase tracking-wider">Streak</h3>
              <Flame className={`w-5 h-5 ${currentStreak > 0 ? "text-orange-500 fill-orange-500" : "text-gray-600"}`} />
            </div>
            <div className="text-5xl font-bold text-white drop-shadow-md">{currentStreak}</div>
            <div className="text-xs text-gray-400 mt-1">Days &gt; {streakMinMinutes} min</div>
          </Card>

          {/* Total Hours */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-300 text-sm uppercase tracking-wider">Total Hours</h3>
              <Clock className="text-white w-5 h-5" />
            </div>
            <div className="text-5xl font-bold text-white drop-shadow-md">{totalHours.toFixed(1)}</div>
            <div className="text-xs text-gray-400 mt-1">
                {goalMode === 'total' 
                    ? `${(targetTotal - totalHours).toFixed(1)}h left to reach ${targetTotal}h`
                    : `Recorded this year`
                }
            </div>
          </Card>

          {/* Goal / Projection */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-300 text-sm uppercase tracking-wider">
                {goalMode === 'daily' ? 'Projection' : 'Daily Target'}
              </h3>
              <Target className="text-red-500 w-5 h-5" />
            </div>
            {goalMode === 'daily' ? (
                <>
                    <div className="text-5xl font-bold text-white drop-shadow-md">{projection.toFixed(0)}h</div>
                    <div className="text-xs text-gray-400 mt-1">Projected total at {dailyGoal}h/day</div>
                </>
            ) : (
                <>
                    <div className="text-5xl font-bold text-white drop-shadow-md">{requiredDailyHours.toFixed(2)}h</div>
                    <div className="text-xs text-gray-400 mt-1">Required daily to hit {targetTotal}h</div>
                </>
            )}
          </Card>

          {/* High Score */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-300 text-sm uppercase tracking-wider">High Score</h3>
              <Trophy className="text-yellow-500 w-5 h-5" />
            </div>
            <div className="text-5xl font-bold text-white drop-shadow-md">{highScore.toFixed(1)}h</div>
            <div className="text-xs text-gray-400 mt-1">Most hours in a single day</div>
          </Card>

          {/* Streak Average */}
          <Card>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-300 text-sm uppercase tracking-wider">Streak Avg</h3>
              <TrendingUp className="text-green-500 w-5 h-5" />
            </div>
            <div className="text-5xl font-bold text-white drop-shadow-md">{streakAverage.toFixed(1)}h</div>
            <div className="text-xs text-gray-400 mt-1">Avg hours during current streak</div>
          </Card>

          {/* Chart Section - Spans full width */}
          <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-4">
            <Card>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-gray-300 text-sm uppercase tracking-wider">Last 7 Days Performance</h3>
                    <div className="text-xs text-gray-500">Baseline: {requiredDailyHours.toFixed(2)}h / day</div>
                </div>
                
                <div className="h-48 flex items-center justify-around gap-2">
                    {chartData.map((d) => {
                        const isPositive = d.diff >= 0;
                        const height = Math.min(Math.abs(d.diff) * 20, 80); // Scale factor
                        
                        return (
                            <div key={d.date.toString()} className="flex flex-col items-center justify-center h-full w-full group">
                                <div className="flex-1 flex flex-col justify-end items-center w-full relative">
                                    {/* Tooltip */}
                                    <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-xs px-2 py-1 rounded border border-white/20 whitespace-nowrap z-20">
                                        {d.hours.toFixed(2)}h ({d.diff > 0 ? '+' : ''}{d.diff.toFixed(2)})
                                    </div>

                                    {/* Bar */}
                                    <div className="w-full flex flex-col items-center h-full justify-center">
                                        {/* Upper part (Positive) */}
                                        <div className="flex-1 flex flex-col justify-end w-4">
                                            {isPositive && (
                                                <div 
                                                    className="w-full bg-gradient-to-t from-green-500 to-green-300 rounded-t shadow-[0_0_10px_rgba(74,222,128,0.5)]"
                                                    style={{ height: `${height}%` }}
                                                ></div>
                                            )}
                                        </div>
                                        
                                        {/* Zero Line */}
                                        <div className="h-[1px] w-full bg-white/20 my-1"></div>
                                        
                                        {/* Lower part (Negative) */}
                                        <div className="flex-1 flex flex-col justify-start w-4">
                                            {!isPositive && (
                                                <div 
                                                    className="w-full bg-gradient-to-b from-red-500 to-red-800 rounded-b shadow-[0_0_10px_rgba(248,113,113,0.5)]"
                                                    style={{ height: `${height}%` }}
                                                ></div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="h-6 text-xs text-gray-500 mt-2">{format(d.date, 'EEE')}</div>
                            </div>
                        );
                    })}
                </div>
            </Card>
          </div>

        </div>
      )}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass-panel rounded-xl p-6 transition-all hover:bg-white/5">
      {children}
    </div>
  );
}

function ChristmasBackground() {
    // Generate random lights
    const lights = useMemo(() => {
        return Array.from({ length: 30 }).map((_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            color: Math.random() > 0.5 ? '#ef4444' : '#f97316', // Red or Orange
            delay: `${Math.random() * 2}s`,
            size: `${Math.random() * 10 + 5}px`
        }));
    }, []);

    return (
        <div className="christmas-bg">
            {lights.map(light => (
                <div 
                    key={light.id}
                    className="light"
                    style={{
                        left: light.left,
                        top: light.top,
                        backgroundColor: light.color,
                        animationDelay: light.delay,
                        width: light.size,
                        height: light.size,
                        boxShadow: `0 0 20px ${light.color}`
                    }}
                />
            ))}
        </div>
    );
}

