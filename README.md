# Orbit — Habits & Focus

A dark, glassy productivity app with two focused features:

- **Tasks** — a to-do list built around the **Eisenhower Matrix** (Do First / Schedule / Delegate / Eliminate), with drag-and-drop between quadrants and a flat list view.
- **Habits** — a daily habit tracker with streaks, a 90-day heatmap, weekly trend charts, and a satisfying one-tap check-in animation.

Plus a **Dashboard** that pulls both together: today's urgent tasks, habits checked off, your best streak, and a 7-day consistency score.

No build step, no backend — pure HTML/CSS/JS, data saved to your browser's `localStorage`.

## Run it locally

Just open `index.html` in a browser, or serve it:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploy for free (GitHub Pages)

1. Push this repo to GitHub (see commands below).
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`, branch `main`, folder `/ (root)`.
4. Save — your app will be live at `https://<your-username>.github.io/<repo-name>/` in a minute or two.

## Tech

- Vanilla JS (no framework, no build tools) — `js/store.js`, `js/tasks.js`, `js/habits.js`, `js/charts.js`, `js/app.js`
- [Chart.js](https://www.chartjs.org/) via CDN for the bar/donut/line charts
- `Fraunces`, `Inter`, `JetBrains Mono` via Google Fonts
- CSS custom properties + `localStorage`, no dependencies to install

## Project structure

```
index.html
css/style.css
js/
  store.js    # localStorage persistence + date helpers
  tasks.js    # to-do list + Eisenhower matrix logic
  habits.js   # habit CRUD, streak math, heatmap, drawer
  charts.js   # Chart.js instances
  app.js      # nav, dashboard stats, boot
```

## License

MIT — do whatever you like with it.
