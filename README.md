# CueConnect

CueConnect is a web-based management and booking system for a snooker lounge. It provides separate features for **Admins** and **Clients**, allowing the lounge owner to manage tables, prices, games, bookings, loyalty points, events, income, and expenses, while customers can book tables, earn and spend loyalty points, join events, and view their history.

## Project Summary

CueConnect provides a centralized platform for managing the daily operations of a snooker lounge.

### Admin Features

- Manage snooker and billiard tables (add, edit, delete, maintenance)
- Set hourly, frame, and century rates per table
- Start and stop frame (single/double) and century games
- Automatically generate one open bill per payer, shared across their games
- Record full or partial payments (cash, online, card) and download PDF receipts
- Apply manual discounts and loyalty-point discounts to bills
- Award loyalty points to registered customers
- Review, approve, reject, complete, edit, or cancel bookings and view payment proofs
- Create bookings for registered customers
- Notify waitlisted customers when their slot frees up
- Publish, edit, cancel, archive, and restore tournaments and events
- Verify paid event registrations
- Register and manage customer accounts and view each customer's history
- Record and delete expenses and view collected income
- View daily, weekly, monthly, yearly, or custom-range financial summaries
- Generate and download PDF financial reports
- Manage branch details, opening hours, payment accounts, and the admin profile/password

> See [Admin Panel — Current State](#admin-panel--current-state) for the full, up-to-date breakdown.

### Client Features

- Create an account and log in
- View available tables
- Check table schedules
- Book available tables
- Pay an advance for bookings
- Upload payment proof
- Edit or cancel bookings
- View loyalty points and available discounts
- View booking and game history
- View upcoming tournaments and events
- Register for tournaments
- Join a waitlist when a table is unavailable
- Receive real-time notifications when a waitlisted table becomes available

---

# Admin Panel — Current State

The admin panel lives under `/admin/*` in the frontend and `/api/admin/*` in the backend. Every admin route requires a signed-in admin (JWT in an HTTP-only cookie), and all data is scoped to the admin's own **branch**.

## Accounts & Access

- **Sign up** (`/admin/register`): email + password + the server's `ADMIN_SECRET_KEY`, then a 6-digit email OTP (sent via Resend). Repeated wrong secret keys are rate-limited per IP.
- **Complete sign-up** (`/admin/register/complete`): first and last name, then either **create a new branch** (a unique branch code is generated) or **join an existing branch**.
- **Sign in** (`/admin/login`): email (case-insensitive) and password.
- **Password rules for admins**: at least 8 characters, with an uppercase letter, a lowercase letter, a digit, and a special character. The same rules apply when changing the password in Settings.
- Visiting `/admin` redirects to the dashboard. Real-time notifications (Socket.IO) stay connected while moving between admin pages.

## Pages

| Page              | Route              | What the admin can do                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard         | `/admin/dashboard` | Live counts (available/occupied tables, pending bookings, waitlist, occupancy), today's collected income, expenses, and net profit, pending actions (booking requests, event payments to verify, unpaid bills, waitlist), recent activity, and quick actions: start a game, add an expense, open the waitlist and notify customers.                                                                                   |
| Table Management  | `/admin/tables`    | Add, edit, and delete tables; set type (snooker/billiard), per-hour, per-frame, and century (per-minute) rates; switch between available and maintenance; search and filter by status.                                                                                                                                                                                                                                |
| Games             | `/admin/games`     | Start a game for a registered customer or a walk-in, watch live timers, stop a game (the player, another customer, or a walk-in pays), "stop & start next", and browse completed games grouped by table with filters (dates, table, customer, type, payment status).                                                                                                                                                  |
| Billing           | `/admin/billing`   | Pending/all/paid bill tabs with filters (payer, dates, customer, status, payment method), bill details with games and payment history, a manual discount, the loyalty discount, full or partial payments, and PDF receipts.                                                                                                                                                                                           |
| Bookings & Events | `/admin/bookings`  | **Bookings tab:** filter by status and date, view advance payment proofs and transaction IDs, approve/reject (with a reason), mark completed, cancel, edit, or create bookings. **Events tab** (`?tab=events`): publish tournaments and club events, edit, change status (upcoming/ongoing/completed/cancelled), archive/restore, delete empty events, and verify registrations (confirm/reject, with payment proof). |
| Customers         | `/admin/customers` | Search (name, Customer ID, email) with pagination, register customers (a unique Customer ID is generated), edit name/email/phone, activate/deactivate accounts, and view details: games as player/payer, bookings, billing totals, and loyalty points.                                                                                                                                                                |
| Finance & Reports | `/admin/finance`   | Range picker (today, week, month, year, custom), overview (revenue, expenses, net profit, pending payments), revenue-vs-expense chart, income by source and expenses by category, searchable income and expense records, add/delete expenses, and report preview and PDF download (financial summary, income, expense).                                                                                               |
| Settings          | `/admin/settings`  | Branch name, address, phone, and opening/closing hours (whole hours; closing may run past midnight), branch code (copyable), payment accounts (JazzCash, Easypaisa, bank) that clients pay into, admin profile, and password change.                                                                                                                                                                                  |

## Business Rules

**Tables**

- The hourly rate defaults to century rate × 60 and can be overridden. Bookings are priced with the hourly rate.
- "Occupied" is set automatically while a game is running and cleared when it stops; it can't be set by hand.
- A table with a live game can't be put into maintenance or deleted. A table with upcoming bookings can't be deleted (set it to maintenance instead).

**Games & bills**

- A frame game charges the frame rate (a double frame charges twice that). A century game charges the century rate per minute, rounded up, with a minimum of 1 minute.
- When a game stops, its charge is added to the payer's **open bill**. Each registered payer, or each walk-in payer by name, has at most one open bill.
- Bills move from **pending** to **partial** to **paid**. Overpayments are rejected. A bill whose discount covers the whole balance is marked paid.
- Every payment is recorded as **income** (source: frame games, century games, or other), and registered payers earn loyalty points on it.

**Discounts & loyalty**

- **Manual discount:** an amount in Rs. set by the admin. It can't exceed the unpaid balance, and setting it to 0 removes it.
- **Loyalty discount:** available once a registered payer has **more than 200 points** (1 point = Rs. 1). It can be used once per bill and spends only the points needed to cover the balance. It stacks with the manual discount.
- Points earned: **10 per completed game** for a registered player, plus **1 point per Rs. 10 paid** on bills.
- Rejecting or cancelling a booking that used loyalty points returns those points to the customer.

**Bookings & waitlist**

- Allowed status changes: pending → approved / rejected / cancelled; approved → completed / cancelled.
- Bookings created by an admin are approved immediately. They must start on the hour, last 1–3 hours, fall within club hours, not overlap another active booking, and not start in the past.
- Editing a booking reprices it from the table's hourly rate and keeps any loyalty discount the client already used.
- The customer is notified (in-app and in real time) when an admin creates, approves, rejects, cancels, or completes their booking.
- **Waitlist:** an admin notifies a waiting customer once their requested slot is free. Entries whose slot has already started drop off the list.

**Events & registrations**

- New events must be in the future. The entry fee is locked once anyone registers, and the participant limit can't go below the current number of registrations.
- Registration status changes: registered → confirmed / rejected; confirmed → rejected; rejected → confirmed (only if a spot is free).
- Confirming a paid registration records its fee as **Tournament Fees** income. Rejecting it afterwards marks that income as refunded.
- Cancelling an event notifies everyone registered. Archived events are hidden from clients and can be restored. Only events with no registrations can be deleted.

**Finance**

- Revenue counts **collected money only** (bill payments and confirmed event fees). Booking advances and unpaid bills are not revenue; unpaid balances are shown as "Pending Payments".
- Expenses need a description, category (rent, utilities, equipment, salary, maintenance, other), amount, method, and a date that isn't in the future.

## Admin API Reference

All endpoints are prefixed with `/api/admin` and require an admin session. A malformed `:id` returns `404`.

| Area          | Endpoints                                                                                                                                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard     | `GET /dashboard-stats`                                                                                                                                                                                           |
| Tables        | `GET /tables` · `POST /tables` · `PUT /tables/:id` · `DELETE /tables/:id`                                                                                                                                        |
| Games         | `GET /games/active` · `GET /games/history` · `POST /games` · `GET /games/:id` · `PATCH /games/:id/stop`                                                                                                          |
| Billing       | `GET /bills` · `GET /bills/:id` · `GET /bills/:id/receipt` (PDF) · `PATCH /bills/:id/discount` · `POST /bills/:id/payments` · `POST /bills/:id/loyalty-reward`                                                   |
| Customers     | `GET /customers` · `POST /customers` · `GET /customers/:id` · `PATCH /customers/:id`                                                                                                                             |
| Bookings      | `GET /bookings` · `POST /bookings` · `PATCH /bookings/:id/edit` · `PATCH /bookings/:id` (status) · `GET /bookings/:id/payment-proof`                                                                             |
| Waitlist      | `GET /waitlist` · `PATCH /waitlist/:id/notify`                                                                                                                                                                   |
| Events        | `GET /events` · `POST /events` · `PATCH /events/:id` · `PATCH /events/:id/status` · `PATCH /events/:id/archive` · `DELETE /events/:id` · `GET /events/:id/registrations`                                         |
| Registrations | `PATCH /event-registrations/:id` · `GET /event-registrations/:id/payment-proof`                                                                                                                                  |
| Finance       | `GET /finance` · `GET /finance/income` · `GET /finance/expenses` · `GET /finance/report` · `GET /finance/report-pdf` · `POST /expenses` · `DELETE /expenses/:id`                                                 |
| Notifications | `GET /socket-token` · `GET /notifications` · `PATCH /notifications/:id/read` · `PATCH /notifications/read-all`                                                                                                   |
| Settings      | `GET /settings` · `PATCH /settings/branch` · `POST /settings/accounts` · `PATCH /settings/accounts/:accountId` · `DELETE /settings/accounts/:accountId` · `PATCH /settings/profile` · `PATCH /settings/password` |

**Public endpoints (no login)** used by the homepage: `GET /api/branches` returns every branch with its address, phone, opening hours, and tables (type, status, and prices); payment accounts are never included. `GET /api/events` returns upcoming, non-archived events.

## Getting Started

**Requirements:** Node.js 20+ and a MongoDB database (MongoDB Atlas or local).

```bash
# backend
cd backend
cp .env.example .env    # fill in MONGODB_URI, JWT_SECRET, ADMIN_SECRET_KEY, RESEND_* and CLIENT_URL
npm install
npm run dev             # http://localhost:5000

# frontend (in a second terminal)
cd frontend
cp .env.example .env    # VITE_API_URL=http://localhost:5000/api
npm install
npm run dev             # http://localhost:5173
```

Then open `http://localhost:5173/admin/register`, enter the `ADMIN_SECRET_KEY`, verify your email, and create your branch. Add at least one table and one payment account in Settings before clients start booking.

Useful scripts: `npm run lint` and `npm run build` in `frontend/`, and `npm start` in `backend/`.

---

# Tech Stack

## Frontend

- **React.js** — Building the user interface and reusable components
- **Tailwind CSS** — Responsive and modern UI styling
- **Redux Toolkit** — Global state management (authentication state)
- **JavaScript (ES6+)** — Frontend logic and functionality
- **React Router** — Client-side routing and protected pages

## Backend

- **Node.js** — Server-side runtime
- **Express.js** — REST API development and backend routing
- **JavaScript (ES6+)** — Backend development
- **Middleware** — Authentication, validation, error handling, and request processing

## Database

- **MongoDB** — NoSQL database
- **Mongoose** — MongoDB object modeling and database operations

## Authentication & Security

- **Cookies** — Secure authentication/session handling
- **Password Hashing** — Securely storing user passwords
- **Role-Based Authorization** — Separate Admin and Client permissions
- **Input Validation** — Validating user-provided data
- **CORS** — Controlling cross-origin requests
- **XSS Protection** — Protecting against malicious input and scripts through HTTP Only Cookies and Sanitizing user input

## File System

The Node.js file system will be used for handling project files such as:

- Customer payment proof uploads
- Generated PDF reports
- Temporary report files
- Reading and managing uploaded files

## PDF Generation

PDF generation will be used to create downloadable:

- Income reports
- Expense reports
- Financial summaries
- Other relevant administrative reports

## Performance

Performance optimization will be considered throughout the application, including:

- Optimized MongoDB queries
- Database indexing where required
- Efficient API requests
- Pagination for large datasets
- Optimized React rendering
- Efficient Redux state management
- Proper handling of uploaded files
- Reducing unnecessary network requests

## Web Services

CueConnect will use **RESTful APIs** for communication between the React frontend and Node.js/Express backend.

Example API areas include:

- Authentication
- Users
- Tables
- Bookings
- Games
- Payments
- Loyalty points
- Events
- Waitlists
- Income and expenses
- Reports

---

# Main Technologies

```text
Frontend
├── React.js
├── Tailwind CSS
├── Redux
├── React Router
└── JavaScript (ES6+)

Backend
├── Node.js
├── Express.js
├── REST APIs
└── Middleware

Database
├── MongoDB
└── Mongoose

Other
├── Cookies
├── File System
├── PDF Generation
├── Authentication & Authorization
├── Security
└── Performance Optimization
```

# Main Functional Modules

## 1. Authentication

- Client registration and login
- Admin registeration and login
- Cookie-based authentication
- Role-based access control
- Protected routes

## 2. Table Management

- Add, edit, and remove tables
- Set table prices
- Set frame and century rates
- View table schedules
- Check table availability

## 3. Booking System

- Create bookings
- Check availability before booking
- Prevent conflicting bookings
- Upload advance payment proof
- Admin approval/rejection
- Edit or cancel bookings

## 4. Billing & Games

- Record frame and century games
- Record payer information (the player, another customer, or a walk-in)
- Calculate bills automatically (one open bill per payer)
- Record full or partial payments and download PDF receipts
- Apply manual and loyalty discounts

## 5. Loyalty System

- Award 10 loyalty points to the player for every completed game, plus 1 point per PKR 10 paid on bills
- Track customer loyalty points
- Apply loyalty discounts: clients spend points on bookings (1 point = PKR 1, up to 20% of the total), and admins can apply a loyalty discount to a bill once the payer has more than 200 points
- Display loyalty information to clients

## 6. Events & Tournaments

- Display upcoming events
- Create/manage tournaments
- Allow clients to register (paid entry uses the payment proof flow)

## 7. Waitlist & Notifications

- Join a waitlist when a table is busy
- Admins see the waitlist and notify a customer once the slot is free
- Real-time (Socket.IO) notifications for waitlist, booking, event, and loyalty updates

## 8. Financial Management

- Record income automatically from collected payments and confirmed event fees
- Record and delete expenses
- View daily income and expenses
- View monthly income and expenses
- View yearly income and expenses
- Generate downloadable PDF reports

## 9. Customer History

- View booking history
- View games played
- View payments
- View loyalty points
- View event registrations

---

# Project Architecture

```text
                    ┌──────────────────────┐
                    │      React Client    │
                    │                      │
                    │ React + Tailwind     │
                    │ Redux + React Router │
                    └──────────┬───────────┘
                               │
                         REST APIs
                               │
                    ┌──────────▼───────────┐
                    │   Node.js + Express  │
                    │                      │
                    │ Authentication       │
                    │ Business Logic       │
                    │ Middleware           │
                    │ REST APIs            │
                    └───────┬──────────────┘
                            │
                     ┌──────▼───┐
                     │ MongoDB  │
                     │ +        │
                     │ Mongoose │
                     └──────────┘
```

# Project Goals

- Provide an organized booking system for a snooker lounge
- Reduce manual booking and billing work
- Allow customers to easily book tables online
- Provide centralized customer and game records
- Reward regular players with loyalty points
- Provide financial tracking and reporting
- Provide real-time table and waitlist notifications
- Build a responsive, secure, and performance-oriented web application

# Development Approach

CueConnect will be developed using the **MERN stack** with additional technologies such as **Tailwind CSS, Redux, Cookies, File System, PDF generation, and performance optimization techniques**.

The application will follow a client-server architecture where the React frontend communicates with the Node.js/Express backend through RESTful APIs, while MongoDB stores application data.
