# DeskGuard – Library Seat Booking & Anti-Hoarding App

### Hackathon MVP Specification

---

## 1. Problem Statement

Students reserve library desks by leaving bags/belongings and disappear for hours, blocking access for others. There is no fair, trackable, real-time system to manage desk occupancy. DeskGuard solves this with a live, color-coded seat map driven entirely by server-side timers — so no one can "cheat" by simply not refreshing a page.

---

## 2. Core Concept

* A **live SVG map** of the library shows every desk as **Green (Free)**, **Red (Occupied)**, or **Yellow (Away)**.
* Students **scan a QR code** at their desk to check in.
* An **"Away" button** pauses the session for up to 20 minutes (bathroom/snack breaks).
* Every 2 hours, the system pings "Still here?" — no response = desk auto-frees.
* **All timers are server-side** (Redis TTLs + a cron sweeper). Browser refresh/closing changes nothing.
* A **Librarian Dashboard** shows abandoned desks and allows manual overrides.

---

## 3. Architecture Overview

```text
┌─────────────┐      WebSocket (live)      ┌──────────────────┐
│  React App   │ <─────────────────────────│   Node/Express     │
│  (SVG Map)   │ ───── REST API calls ────> │   Backend Server   │
└─────────────┘                            └─────────┬─────────┘
                                                      │
                                   ┌──────────────────┼──────────────────┐
                                   │                                      │
                          ┌────────▼────────┐               ┌────────────▼───────────┐
                          │   Redis (TTLs)    │               │   PostgreSQL (Prisma)   │
                          │  Ephemeral state  │               │  Source of truth + logs │
                          └────────┬──────────┘               └────────────────────────┘
                                   │
                          ┌────────▼────────┐
                          │ Cron Worker (1m)  │
                          │ Sweeps expired    │
                          │ Redis keys → DB   │
                          │ → WebSocket push  │
                          └───────────────────┘

```

**Key principle:** Redis is the "ticking clock." PostgreSQL is the "permanent record." The cron worker reconciles the two every minute and broadcasts changes over WebSocket.

---

## 4. UI/UX Design

* **Design System:** Material Design 3 — rounded corners, elevated surfaces, dynamic color states.
* **Seat Map (core screen):**
* **Green** – outlined/soft fill → "Available"
* **Red** – solid fill → shows partial user ID (e.g., `USR...492`)
* **Yellow** – striped/glowing → live countdown to auto-release


* **Check-in flow:** QR scan → modal confirmation overlay (no page reload) → map updates instantly via WebSocket for all connected clients.
* **Student controls (floating action buttons once checked in):**
* "Step Away" (turns desk Yellow, starts 20-min timer)
* "I'm Back" (returns to Red, resets to 2-hour timer)
* "Check Out" (frees desk immediately)


* **"Still here?" prompt:** Modal with a button; if ignored, Redis TTL naturally expires and cron worker frees the desk.

---

## 5. Data Model

### 5.1 Ephemeral State — Redis

| Key | Value | TTL |
| --- | --- | --- |
| `desk:{seatId}:session` | `userId` | 7200s (2hr) on check-in / "I'm Back" |
| `desk:{seatId}:session` | `userId` | 1200s (20min) when "Away" |

> When this key **expires naturally**, the cron worker detects the gap and frees the desk.

### 5.2 Persistent Database — PostgreSQL (Prisma Schema)

```prisma
model User {
  id        String    @id @default(uuid())
  name      String
  email     String    @unique
  sessions  Session[]
}

model Seat {
  id        String    @id          // e.g. "A1", "B4"
  zone      String                 // e.g. "North Wing"
  status    String    @default("FREE") // FREE, OCCUPIED, AWAY
  qrToken   String    @unique
  sessions  Session[]
}

model Session {
  id                 String   @id @default(uuid())
  userId             String
  seatId             String
  status             String   // ACTIVE, EXPIRED, COMPLETED
  checkInTime        DateTime @default(now())
  checkOutTime       DateTime?
  terminationReason  String?  // User, Auto-Expired, Librarian_Reset

  user User @relation(fields: [userId], references: [id])
  seat Seat @relation(fields: [seatId], references: [id])
}

```

---

## 6. Functional Modules

### Module A — Check-In Engine & Anonymous Auth

* **Trigger:** Student scans QR code.
* **Identity Bypass (MVP):** On frontend load, check `localStorage` for `userId`. If missing, generate a UUID, save it, and silently hit `/api/users/register` to create a dummy user in PostgreSQL.
* **Action:** Frontend sends `qrToken` and `userId`.
* **Server logic:**
1. Verify seat status is `FREE` in PostgreSQL based on the `qrToken`.
2. Create new `Session` row (`status: ACTIVE`) linked to the `userId`.
3. Update `Seat.status = OCCUPIED`.
4. Set Redis key `desk:{seatId}:session` with **7200s TTL**.


* **Output:** Broadcast WebSocket event → all clients see desk turn **Red**.

### Module B — "Away" Mechanism

* **Trigger:** Student taps "Step Away".
* **Server logic:**
1. Update `Seat.status = AWAY` in PostgreSQL.
2. Overwrite Redis TTL to **1200s (20 min)**.


* **Output:** WebSocket event → desk turns **Yellow** with countdown.
* **"I'm Back":** Reverses the above — status back to `OCCUPIED`, TTL reset to 7200s.

### Module C — Orchestrator (Cron Worker)

* **Trigger:** Runs every **1 minute**.
* **Logic:**
1. Query PostgreSQL for all seats with status `OCCUPIED` or `AWAY`.
2. For each, check if `desk:{seatId}:session` still exists in Redis.
3. **If Redis key is missing (TTL expired):**
* Update `Session.status = EXPIRED`, set `checkOutTime`, `terminationReason = "Auto-Expired"`.
* Update `Seat.status = FREE`.
* Broadcast WebSocket event → desk turns **Green**.





### Module D — Librarian Dashboard

* **View:** Table of all seats with current status, occupant (partial ID), time remaining, and session history.
* **Filters:** Show only `AWAY` or flagged/long-running sessions.
* **Override button:** Manually free a seat —
1. Delete Redis key `desk:{seatId}:session`.
2. Update `Seat.status = FREE`, `Session.status = COMPLETED`/`EXPIRED`, `terminationReason = "Librarian_Reset"`.
3. Broadcast WebSocket event.



---

## 7. API Specification

### REST Endpoints

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/api/users/register` | Auto-registers a guest user ID for foreign key relations |
| `POST` | `/api/seat/scan` | Validate `qrToken` + `userId`, create session, set Redis TTL |
| `POST` | `/api/seat/away` | Update status to AWAY, set Redis TTL to 20min |
| `POST` | `/api/seat/back` | Update status to OCCUPIED, reset Redis TTL to 2hr |
| `POST` | `/api/seat/ping` | "Still here?" response — resets Redis TTL to 2hr |
| `POST` | `/api/seat/checkout` | Voluntary checkout — frees seat, deletes Redis key |
| `GET` | `/api/seats` | Returns current state of all seats (initial map load) |
| `GET` | `/api/admin/dashboard` | Returns seat list + session metadata for librarians |
| `POST` | `/api/admin/override` | Force-free a seat, terminate session |

### Real-Time Protocol

* `WS /socket/live` — persistent connection established on page load.
* Server pushes JSON only on state change:
```json
{ "seatId": "A1", "status": "FREE", "timestamp": "..." }

```


* Frontend updates only the affected SVG node — no polling, no full reloads.

---

## 8. Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React (Vite or Next.js) + SVG map + Material Design 3 |
| Realtime | Socket.io (or native WebSocket) |
| Backend | Node.js + Express |
| Timer/Cache | Redis (Docker local for dev, Upstash for prod) |
| Database | PostgreSQL (Supabase/Neon) + Prisma ORM |
| Hosting | Vercel/Netlify (frontend), Render/Railway (backend) |

---

## 9. Build Order & Setup Configuration

### Phase 1: Environment Setup

Before writing code, establish your `.env` files.

* **Backend (`.env`)**: `DATABASE_URL`, `REDIS_URL`, `PORT=3001`, `FRONTEND_URL=http://localhost:3000`
* **Frontend (`.env.local`)**: `NEXT_PUBLIC_API_URL=http://localhost:3001`, `NEXT_PUBLIC_WS_URL=ws://localhost:3001`

### Phase 2: Database Seeding (Hour 0–1)

**Critical:** You must inject physical QR tokens into the database before scanning works. Create a `prisma/seed.js` script to populate the layout:

```javascript
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const seats = [
    { id: 'A1', zone: 'Quiet Floor', qrToken: 'hackathon-secret-token-a1' },
    { id: 'B1', zone: 'Discussion Room', qrToken: 'hackathon-secret-token-b1' },
  ]
  for (const seat of seats) {
    await prisma.seat.upsert({ where: { id: seat.id }, update: {}, create: seat })
  }
}
main().catch(console.error).finally(() => prisma.$disconnect())

```

Run `npx prisma db push` and `npx prisma db seed`. Generate physical QR codes mapping to these exact token strings.

### Phase 3: Development Pipeline (Hour 1–15)

1. **Hour 1–4:** Build `/api/users/register`, `/api/seat/scan`, `/api/seat/away`, `/api/seat/checkout` with Redis TTL logic.
2. **Hour 4–6:** Build cron worker (Module C) — run via `node-cron`.
3. **Hour 6–9:** Frontend SVG map + WebSocket listener + Material Design styling.
4. **Hour 9–11:** `localStorage` UUID logic + QR scan flow + check-in modal.
5. **Hour 11–13:** Librarian dashboard + override functionality.
6. **Hour 13–15:** Polish, deploy, print QR codes for demo, test end-to-end.

---

## 10. Deliverables Checklist

* [ ] **GitHub Repo** with `README.md` containing:
* "How to Run" instructions (local dev + deployed link)
* "Environment Variables" list (`DATABASE_URL`, `REDIS_URL`, `PORT`, etc.)


* [ ] **Live Deployed App** (Vercel/Netlify frontend + Render/Railway backend)
* [ ] **3–4 Printed QR Codes** mapped to real seat IDs for live demo
* [ ] **4-Slide PPT:**
1. The Pain Point
2. The Solution
3. Tech Stack
4. Future Scope



---

## 11. Future Scope (for the "Future Scope" slide)

* Push notifications (mobile/email) for "Still here?" prompts instead of in-app modal only.
* User accounts with booking history & "no-show" penalty system.
* Heatmap analytics for librarians (peak hours, most-abandoned zones).
* Mobile app with native QR scanning.
* Reservation/pre-booking system for desks in advance.
* Integration with university ID/SSO for authentication.