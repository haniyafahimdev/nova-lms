# NOVA Virtual School: plain HTML/CSS/JS + Firebase

No build step, no React. Front end = static files. Server code = one small file, `api/create-user.js` (Vercel function).

## Setup
1. `npm install firebase-admin resend`  (only the server function and the admin script use these)
2. Firebase console: create project, enable **Authentication > Email/Password**, create **Firestore** (production mode), paste `firestore.rules` in the Rules tab and Publish.
3. Project settings > Your apps > Web: copy the config into **js/firebase.js** (public values, safe in the browser).
4. Project settings > Service accounts > Generate new private key. Put the 3 values in `.env.local` (copy `.env.local.example`). Never commit it.
5. Make your admin: `node --env-file=.env.local scripts/make-first-admin.mjs you@email.com "Password123"` (Node 20+)
6. Run locally: `npx vercel dev` (serves the pages and the API; log in to Vercel when asked). Open http://localhost:3000

## First use (admin)
Classes → Teachers → Parents → Students (enter the parent's email to link them) → Announcements, Resources, Assignments → Attendance, Fees, Remarks.
Teachers/parents/students log in at /login.html with the emailed (or on-screen) temporary password.

## Deploy
Push to GitHub, import in Vercel, add the `.env.local` variables in Project Settings (set `SITE_URL` to your live URL). In Firebase > Authentication > Settings > Authorized domains, add your Vercel domain.

## Security notes
- Real protection = `firestore.rules` + admin check in the API. Hidden buttons are only for looks.
- All text is inserted with textContent (no HTML injection); links only open if they start with http(s).
- `vercel.json` adds security headers incl. a Content-Security-Policy. If something is blocked, check the browser console for "Refused to…".
- Paid for launch: Vercel Pro (commercial use), Resend Pro (>100 emails/day), Firebase Blaze with budget alerts.

## Not built yet
Student file submissions, edit forms, report cards, online payments, TSS site.
