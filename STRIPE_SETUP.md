# Stripe Setup Guide

This guide will help you set up Stripe with product IDs for your goal-tracking app.

## 1. Create a Stripe Product

1. Go to your [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Products** in the left sidebar
3. Click **Add Product**
4. Fill in the details:
   - **Name**: "Goal Pledge"
   - **Description**: "Payment for failed goal completion"
   - **Pricing**: Leave as "One-time payment" (since amounts vary by user)
5. Click **Save product**
6. Copy the Product ID (starts with `prod_`)

## 2. Environment Variables

Add these to your `.env.local` file:

```env
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Product IDs
STRIPE_GOAL_PLEDGE_PRODUCT_ID=prod_your_goal_pledge_product_id_here

# Internal API Key for payment capture
INTERNAL_API_KEY=your_internal_api_key_here

# App URL for webhooks and API calls
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 3. Webhook Configuration

1. In your Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Set the endpoint URL to: `https://your-domain.com/api/stripe/webhook`
4. Select these events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `payment_intent.requires_action`
5. Copy the webhook secret and add it to your environment variables

## 4. Payment Flow

### When Creating a Goal:
1. User enters pledge amount
2. System creates a Stripe Price for that amount
3. System creates a Payment Intent with `capture_method: 'manual'`
4. Payment is authorized but not captured
5. Goal is created with the Payment Intent ID

### When Goal Fails:
1. Cron job detects expired goals
2. System captures the authorized payment
3. Goal status is updated to "failed"
4. User is notified of the charge

## 5. Testing

Use Stripe's test card numbers:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`

## 6. Security Notes

- Never expose your secret key in client-side code
- Always validate webhook signatures
- Use the internal API key for payment capture
- Store sensitive data in environment variables

## 7. Monitoring

Monitor these in your Stripe Dashboard:
- **Payments** → **Payment intents** for payment status
- **Analytics** → **Revenue** for payment analytics
- **Logs** for debugging payment issues 