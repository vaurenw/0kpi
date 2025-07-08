# 0kpi – Open Source Goal Tracking with Stripe Payments

## Overview

**0kpi** is an open source goal-tracking application that helps users set, track, and complete personal goals. It features accountability, pledges, and automated payments using Stripe. If a user fails to complete a goal, the pledged amount is charged.

## Features

- ✅ Create and manage personal goals
- ✅ Set deadlines and pledge amounts
- ✅ Stripe integration for secure payments
- ✅ Automatic payment capture on failed goals
- ✅ User-friendly dashboard
- ✅ Modular, scalable, and easy to extend
- ✅ Built with Next.js, Convex, TypeScript, and Tailwind CSS

## Getting Started

### 1. Clone the Repository
```sh
git clone https://github.com/vaurenw/0kpi.git
cd 0kpi
```

### 2. Install Dependencies
```sh
npm install
# or
yarn install
# or
pnpm install
```

### 3. Configure Environment Variables
- Copy `example.env` to `.env.local`:
  ```sh
  cp example.env .env.local
  ```
- Fill in all required values (see comments in `example.env`).
- **Never commit your real `.env` or `.env.local` files!**

### 4. Run the Development Server
```sh
npm run dev
```
Visit [http://localhost:3000](http://localhost:3000) to view the app.

## Docs
- **[Stripe Documentation](https://stripe.com/docs)** - Payment processing, webhooks, and API reference
- **[Convex Documentation](https://docs.convex.dev/)** - Database, functions, and real-time features
- **[Clerk Documentation](https://clerk.com/docs)** - Authentication and user management

