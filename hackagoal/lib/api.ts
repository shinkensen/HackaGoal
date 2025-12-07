import { config } from './config';
import { format } from 'date-fns';

const API_BASE = "https://hackatime.hackclub.com/api/v1/users";

export interface DayStats {
  total_seconds: number;
  languages: { name: string; total_seconds: number }[];
  editors: { name: string; total_seconds: number }[];
  operating_systems: { name: string; total_seconds: number }[];
}

export interface DailyData {
  date: string; // YYYY-MM-DD
  stats: DayStats;
}

export const fetchUserData = async (username: string = config.username): Promise<DailyData[]> => {
  if (!username) return [];

  const today = new Date();
  const currentYear = today.getFullYear();
  const startDate = new Date(`${currentYear}-01-01`);
  
  const daysToFetch: Date[] = [];
  let d = new Date(startDate);
  // Normalize today to midnight to ensure comparison works as expected for dates
  const todayMidnight = new Date(today);
  todayMidnight.setHours(0, 0, 0, 0);

  while (d <= todayMidnight) {
    daysToFetch.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }

  // Fetch in batches
  const BATCH_SIZE = 10;
  const allData: DailyData[] = [];

  for (let i = 0; i < daysToFetch.length; i += BATCH_SIZE) {
    const batch = daysToFetch.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (date) => {
        const stats = await fetchDayStats(username, date);
        return {
          date: format(date, 'yyyy-MM-dd'),
          stats: stats || {
            total_seconds: 0,
            languages: [],
            editors: [],
            operating_systems: []
          }
        };
      })
    );
    allData.push(...batchResults);
  }

  return allData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

// New function to fetch total stats for the year in one go
export const fetchYearlyTotal = async (username: string = config.username): Promise<number> => {
    if (!username) return 0;
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // Construct ISO strings for the full range
    // Start: Jan 1st 00:00:00 Local -> ISO
    const start = new Date(currentYear, 0, 1, 0, 0, 0, 0).toISOString();
    // End: Now (or end of today) -> ISO
    // To be safe and include all of today, let's use tomorrow midnight or just "now"
    // If we use "now", we might miss seconds between now and the next fetch?
    // Let's use end of today (tomorrow midnight)
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 0, 0, 0, 0).toISOString();

    const url = `${API_BASE}/${username}/stats?start_date=${start}&end_date=${end}`;
    try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return 0;
        const json = await res.json();
        return json.data?.total_seconds || 0;
    } catch (e) {
        console.error("Failed to fetch yearly total", e);
        return 0;
    }
};

export const fetchTodayStats = async (username: string = config.username): Promise<DayStats | null> => {
    if (!username) return null;
    
    // Use explicit start/end date for "today" to ensure we get daily stats, not all-time
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0).toISOString();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 0, 0, 0, 0).toISOString();

    const url = `${API_BASE}/${username}/stats?start_date=${start}&end_date=${end}`;
    
    try {
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
            const json = await res.json();
            return {
                total_seconds: json.data?.total_seconds || 0,
                languages: json.data?.languages || [],
                editors: json.data?.editors || [],
                operating_systems: json.data?.operating_systems || []
            };
        }
    } catch (e) {
        console.warn("Stats date range failed", e);
    }

    return null;
};

const fetchDayStats = async (username: string, date: Date): Promise<DayStats | null> => {
  // We want the stats for this specific LOCAL date.
  // The API expects ISO strings.
  // If we want "2025-01-01" (Local), we should pass the range that covers it.
  // Start: 2025-01-01 00:00:00 Local -> ISO
  // End: 2025-01-02 00:00:00 Local -> ISO
  
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0).toISOString();
  const nextDay = new Date(date);
  nextDay.setDate(date.getDate() + 1);
  const end = new Date(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate(), 0, 0, 0, 0).toISOString();

  const url = `${API_BASE}/${username}/stats?start_date=${start}&end_date=${end}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch (e) {
    console.error(e);
    return null;
  }
};
