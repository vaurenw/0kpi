# 0kpi

A goal-tracking app with financial accountability. Set goals, make pledges, and get charged if you don't complete them.

## Features

- Create and track personal goals
- Set pledge amounts ($0.01 - $10,000)
- Automatic payment capture on failed goals
- Real-time goal feed
- User authentication with Clerk
- Stripe payment processing

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Convex 
- **Auth**: Clerk
- **Payments**: Stripe
- **UI**: Shadcn/ui components

## Quick Start

```bash
# Clone and install
git clone https://github.com/vaurenw/0kpi.git
cd 0kpi
npm install

# Set up environment
cp example.env .env.local
# Fill in your API keys

# Run development server
npm run dev

# Deploy to production
npm run build
npm start
```

## Environment Variables

Copy `example.env` to `.env.local` and add your API keys:

- `NEXT_PUBLIC_CONVEX_URL` - Convex deployment URL
- `STRIPE_SECRET_KEY` - Stripe secret key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `STRIPE_GOAL_PLEDGE_PRODUCT_ID` - Stripe product ID
- `NEXT_PUBLIC_APP_URL` - Your app URL
- `INTERNAL_API_KEY` - Internal API key
- `CRON_SECRET` - Cron job secret

## Convex Commands

```bash
# Start Convex dev server
npx convex dev

# Deploy to production
npx convex deploy
```

## Docs

- [Stripe Documentation](https://stripe.com/docs)
- [Convex Documentation](https://docs.convex.dev/)
- [Clerk Documentation](https://clerk.com/docs)

## License

MIT

