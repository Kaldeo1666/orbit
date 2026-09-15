# Orbit — Habits & Focus

A dark, glassy productivity app with three connected features:

- **Tasks** — a to-do list built around the **Eisenhower Matrix** (Do First / Schedule / Delegate / Eliminate), with drag-and-drop between quadrants, a flat list view, and a collapsible "Completed" archive so finished tasks don't clutter the board.
- **Calendar** — a rolling 7-day week (renews every 7 days from whenever you first open it — e.g. Sat→Fri, then the next Sat→Fri). Add tasks straight onto a day, tag them with an Eisenhower quadrant, drag to reorder within a day or between days, and check them off. It's the same task list as the Tasks tab — just viewed by date.
- **Habits** — a daily habit tracker with streaks, a 90-day heatmap, weekly trend charts, and a one-tap check-in animation.

Plus a **Dashboard** that pulls it together: today's urgent tasks, habits checked off, your best streak, and a 7-day consistency score.

No build step, no backend — pure HTML/CSS/JS, data saved to your browser's `localStorage`.

## Run it locally

Just open `index.html` in a browser, or serve it:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploy for free (GitHub Pages)

1. Push this repo to GitHub.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`, branch `main`, folder `/ (root)`.
4. Save — your app will be live at `https://<your-username>.github.io/<repo-name>/` in a minute or two.

## Installing as an app

Chrome/Edge: address bar → install icon (or ⋮ menu → "Install Orbit…"). It now ships a proper `manifest.json` and icon set (`assets/icons/`), so the installed shortcut gets Orbit's own icon instead of a generic placeholder — if you installed it before this was added, remove the old shortcut and reinstall from the site to pick up the new icon.

## Tech

- Vanilla JS (no framework, no build tools) — `js/store.js`, `js/tasks.js`, `js/calendar.js`, `js/habits.js`, `js/charts.js`, `js/app.js`
- [Chart.js](https://www.chartjs.org/) via CDN for the bar/donut/line charts
- `Fraunces`, `Inter`, `JetBrains Mono` via Google Fonts
- CSS custom properties + `localStorage`, no dependencies to install

## Project structure

```
index.html
manifest.json
assets/icons/          # app icon set (favicon, apple-touch, PWA icons)
css/style.css
js/
  store.js      # localStorage persistence + date helpers
  tasks.js      # to-do list, Eisenhower matrix, completed archive
  calendar.js   # rolling 7-day week view, reads/writes the same tasks
  habits.js     # habit CRUD, streak math, heatmap, drawer
  charts.js     # Chart.js instances
  app.js        # nav, dashboard stats, boot
```

## License

MIT — do whatever you like with it.
