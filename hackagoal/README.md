# HackaGoal

A Christmas-themed dashboard to track your coding goals using the Hackatime API.

## Features

- **Daily & Yearly Tracking:** See your progress towards daily and yearly coding goals.
- **Streak Tracking:** Keep your coding streak alive!
- **Christmas Theme:** Festive UI with frosted glass effects and holiday colors.
- **Interactive Charts:** Visual breakdown of your coding activity.

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd hackagoal
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

4.  **Open in browser:**
    Open [http://localhost:3000](http://localhost:3000) to see the app.

## Deployment on Vercel

This project is optimized for deployment on [Vercel](https://vercel.com).

1.  Push your code to a GitHub repository.
2.  Go to Vercel and "Add New Project".
3.  Import your GitHub repository.
4.  **Framework Preset:** Select `Next.js`.
5.  **Environment Variables:** (Optional) You can configure the default settings using the following variables:

    | Variable Name | Description | Default |
    | :--- | :--- | :--- |
    | `NEXT_PUBLIC_HACKATIME_USERNAME` | Your Hackatime (Slack) User ID (e.g., U091RNMRAH2) | (Empty - prompts user) |
    | `NEXT_PUBLIC_GOAL_MODE` | 'daily' or 'total' | 'total' |
    | `NEXT_PUBLIC_DAILY_GOAL_HOURS` | Daily goal in hours | 1 |
    | `NEXT_PUBLIC_TARGET_TOTAL_HOURS` | Yearly target in hours | 225 |
    | `NEXT_PUBLIC_STREAK_MIN_MINUTES` | Minimum minutes for a streak | 1 |

6.  Click **Deploy**.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Date Handling:** date-fns
