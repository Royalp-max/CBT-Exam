# School CBT Examination System

This project is a simple full-stack web application for a school examination system with three dashboard roles:

- Admin dashboard: reviews and approves teacher-submitted questions
- Teacher dashboard: creates exam questions for approval
- Student dashboard: logs in, attempts a timed CBT exam, and sees profile details

## Features

- Role-based login for admin, teacher, and student
- Teacher question entry linked to admin approval
- Student exam timer countdown
- Student session details and result tracking
- Persistent local database stored in `data/db.json`

## Local demo users

These seeded users are for local development only. Production starts without demo users.

- Admin: username `admin`, password `admin123`
- Teacher: username `teacher1`, password `teacher123`
- Student: username `student1`, password `student123`

New schools create their own admin login during sign-up. Passwords are stored as scrypt hashes.

## Run locally

```bash
cd C:\Users\DELL\school-cbt-app
npm install
npm start
```

Open this URL in your browser:

http://localhost:3000

## Public deployment on Render

1. Push this project to a Git repository that you control.
2. In Render, create a new Blueprint deployment and select the repository's `render.yaml` file.
3. Set `PLATFORM_ADMIN_EMAIL` and a unique, strong `PLATFORM_ADMIN_PASSWORD` when Render prompts for them. Render generates `SESSION_SECRET` automatically.
4. Deploy and verify the service health check at `/api/health`.

The Blueprint mounts persistent storage at `/var/data`; the app writes its production data file there. The configured persistent disk requires a paid Render web service and is intended for one running instance. Back up the disk regularly. For horizontal scaling or higher-volume production use, migrate the JSON store to managed PostgreSQL before adding instances.

Production does not seed the local demo accounts. School administrators can create accounts through the public sign-up form. Dashboard and exam API routes require a signed, HTTP-only session cookie and restrict school data by school ID.

The local `data/db.json` is not automatically copied to a newly deployed service. Migrate any records you need before switching users to the public URL.

## Run as a desktop app

```bash
cd C:\Users\DELL\school-cbt-app
npm install
npm run desktop
```

This launches the app in an Electron desktop window instead of opening it in a browser.

## Build a Windows desktop installer

```bash
cd C:\Users\DELL\school-cbt-app
npm install
npm run dist
```

This creates a Windows portable build in the `dist` folder for installation on a computer.

## Project structure

- `server.js` — Express server and API
- `public/index.html` — main front-end layout
- `public/styles.css` — styling for the dashboard and exam pages
- `public/app.js` — client-side logic for login, dashboards, and exam flow
- `data/db.json` — persisted exam data and users
