# CueConnect

CueConnect is a web-based management and booking system for a snooker lounge. It provides separate features for **Admins** and **Clients**, allowing the lounge owner to manage tables, prices, games, bookings, memberships, loyalty points, events, income, and expenses, while customers can book tables, manage their memberships, track loyalty points, and view their history.

## Project Summary

CueConnect provides a centralized platform for managing the daily operations of a snooker lounge.

### Admin Features

* Manage snooker tables
* Set and update table prices
* Set frame and century rates
* Create and manage discounts
* Manage weekly/hour-based discounts
* Record games such as frames and centuries
* Automatically generate bills
* Track customer payments
* Award loyalty points to registered customers
* Apply loyalty-based discounts
* Manage upcoming tournaments and events
* View complete customer history
* Manage income and expenses
* View daily, monthly, and yearly financial information
* Generate and download PDF financial reports
* Review customer booking requests and payment proofs
* Manage tables, prices, and other settings

### Client Features

* Create an account and log in
* View available tables
* Check table schedules
* Book available tables
* Pay an advance for bookings
* Upload payment proof
* Edit or cancel bookings
* Purchase memberships
* View membership details, discounts, rules, and expiry
* View loyalty points and available discounts
* View booking and game history
* View upcoming tournaments and events
* Register for tournaments
* Join a waitlist when a table is unavailable
* Receive real-time notifications when a waitlisted table becomes available

---

# Tech Stack

## Frontend

* **React.js** — Building the user interface and reusable components
* **Tailwind CSS** — Responsive and modern UI styling
* **Redux** — Global state management
* **JavaScript (ES6+)** — Frontend logic and functionality
* **React Router** — Client-side routing and protected pages

## Backend

* **Node.js** — Server-side runtime
* **Express.js** — REST API development and backend routing
* **JavaScript (ES6+)** — Backend development
* **Middleware** — Authentication, validation, error handling, and request processing

## Database

* **MongoDB** — NoSQL database
* **Mongoose** — MongoDB object modeling and database operations

## Authentication & Security

* **Cookies** — Secure authentication/session handling
* **Password Hashing** — Securely storing user passwords
* **Role-Based Authorization** — Separate Admin and Client permissions
* **Input Validation** — Validating user-provided data
* **CORS** — Controlling cross-origin requests
* **XSS Protection** — Protecting against malicious input and scripts

## Real-Time Communication

* **WebSockets / Socket.IO** — Real-time communication between the server and clients

Used for features such as:

* Table availability notifications
* Waitlist notifications
* Real-time booking status updates
* Admin/client notifications

## File System

The Node.js file system will be used for handling project files such as:

* Customer payment proof uploads
* Generated PDF reports
* Temporary report files
* Reading and managing uploaded files

## PDF Generation

PDF generation will be used to create downloadable:

* Income reports
* Expense reports
* Financial summaries
* Other relevant administrative reports

## Performance

Performance optimization will be considered throughout the application, including:

* Optimized MongoDB queries
* Database indexing where required
* Efficient API requests
* Pagination for large datasets
* Optimized React rendering
* Efficient Redux state management
* Proper handling of uploaded files
* Reducing unnecessary network requests

## Web Services

CueConnect will use **RESTful APIs** for communication between the React frontend and Node.js/Express backend.

Example API areas include:

* Authentication
* Users
* Tables
* Bookings
* Games
* Payments
* Memberships
* Loyalty points
* Events
* Waitlists
* Income and expenses
* Reports

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
├── Middleware
└── WebSockets / Socket.IO

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

* Client registration and login
* Admin registeration and login
* Cookie-based authentication
* Role-based access control
* Protected routes

## 2. Table Management

* Add, edit, and remove tables
* Set table prices
* Set frame and century rates
* View table schedules
* Check table availability

## 3. Booking System

* Create bookings
* Check availability before booking
* Prevent conflicting bookings
* Upload advance payment proof
* Admin approval/rejection
* Edit or cancel bookings

## 4. Billing & Games

* Record frame and century games
* Record payer information
* Calculate bills automatically
* Apply applicable discounts

## 5. Loyalty System

* Award loyalty points after payment
* Track customer loyalty points
* Apply loyalty discounts
* Display loyalty information to clients

## 6. Membership System

* Purchase memberships
* View membership details
* Track expiry dates
* Display membership discounts and rules

## 7. Events & Tournaments

* Display upcoming events
* Create/manage tournaments
* Allow clients to register
* Different registration rules for members and non-members

## 8. Waitlist & Notifications

* Join a waitlist when a table is busy
* Monitor table availability
* Send real-time notifications when a table becomes available

## 9. Financial Management

* Record income
* Record expenses
* View daily income and expenses
* View monthly income and expenses
* View yearly income and expenses
* Generate downloadable PDF reports

## 10. Customer History

* View booking history
* View games played
* View payments
* View loyalty points
* View membership information

---

# Project Architecture

```text
                    ┌──────────────────────┐
                    │      React Client    │
                    │                      │
                    │ React + Tailwind     │
                    │ Redux + React Router  │
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
                    │ REST APIs             │
                    └───────┬───────┬──────┘
                            │       │
                     ┌──────▼───┐   │
                     │ MongoDB  │   │ WebSockets
                     │ +        │   │ / Socket.IO
                     │ Mongoose │   │
                     └──────────┘   │
                                    ▼
                             Real-time Events
```

# Project Goals

* Provide an organized booking system for a snooker lounge
* Reduce manual booking and billing work
* Allow customers to easily book tables online
* Provide centralized customer and game records
* Manage memberships and loyalty points
* Provide financial tracking and reporting
* Provide real-time table and waitlist notifications
* Build a responsive, secure, and performance-oriented web application

# Development Approach

CueConnect will be developed using the **MERN stack** with additional technologies such as **Tailwind CSS, Redux, Cookies, File System, PDF generation, WebSockets, and performance optimization techniques**.

The application will follow a client-server architecture where the React frontend communicates with the Node.js/Express backend through RESTful APIs, while MongoDB stores application data.
