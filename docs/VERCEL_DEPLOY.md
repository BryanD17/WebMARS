# Vercel deploy — click-by-click

## Prerequisites

- GitHub account that owns the `BryanD17/WebMARS` repo
- Vercel account (free tier is fine) with GitHub connected

## Steps

1. Open https://vercel.com/new
2. Click **Import Git Repository**.
3. Find `BryanD17/WebMARS` in the list. If it doesn't appear, click **Adjust GitHub App Permissions** and grant Vercel access to the repo.
4. Click **Import** next to `WebMARS`.
5. On the configuration screen, set:

   | Field | Value |
   | --- | --- |
   | Framework Preset | **Vite** (auto-detected; verify) |
   | Root Directory | `./` (default) |
   | Build Command | `npm run build` (default for Vite) |
   | Output Directory | `dist` (default for Vite) |
   | Install Command | `npm ci` (override the default `npm install`) |
   | Node.js Version | **20.x** (under **Build & Development Settings → Node.js Version** dropdown) |

6. Leave **Environment Variables** empty.
7. Click **Deploy**.
8. Wait ~60–90 seconds for the first build.
9. When the deploy succeeds:
   - The success page shows the production URL (e.g. `webmars.vercel.app` or `webmars-bryand17.vercel.app`).
   - Copy that URL.
10. Smoke test in three browsers:
    - **Chrome desktop**: page renders, no console errors, three-pane shell visible, control bar buttons disabled (no source typed yet).
    - **Firefox desktop**: same checks.
    - **Mobile Safari** (or Chrome DevTools mobile emulation): inspector pane stacks **below** the editor (the 1024px breakpoint).
11. Open a follow-up PR titled `docs: add live deploy URL to readme` that updates `README.md` and `docs/VERCEL_DEPLOY.md` with the real URL. Single-line commit, squash-merge on green CI.

## Troubleshooting

- **Build fails with "Node version mismatch"** → Project Settings → General → Node.js Version, set to `20.x` explicitly, redeploy.
- **Build fails with TypeScript errors** → should not happen if local `npm run build` passed; surface the error to Bryan.
- **Site loads but shows a blank page** → check the browser console; almost always a missing import or a CSS variable typo.
