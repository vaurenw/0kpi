# Payment Strategy: Stripe Setup Mode Implementation

This document outlines the comprehensive payment strategy for the goal-tracking application using Stripe's setup mode for future payments.

## Overview

Our payment strategy follows Stripe's best practices for collecting payment methods upfront and charging customers later when goals fail. This approach provides a seamless user experience while ensuring reliable payment processing.

## Architecture

### 1. Payment Flow Overview

```
User Creates Goal → Setup Payment Method → Goal Active → Goal Fails → Charge Payment
```

### 2. Key Components

- **Setup Mode Checkout**: Collects payment methods without immediate charges
- **Webhook Processing**: Handles payment method setup and future charges
- **Payment Recovery**: Manages failed payments with user-friendly recovery flows
- **Idempotency**: Prevents duplicate charges and ensures data consistency

## Implementation Details

### Phase 1: Payment Method Setup

#### API Endpoint: `/api/stripe/create-payment-intent`

**Purpose**: Creates a Stripe Checkout session in setup mode to collect payment methods.

**Key Features**:
- Uses `mode: 'setup'` for payment method collection
- Includes `currency: 'usd'` (required for dynamic payment methods)
- Sets `usage: 'off_session'` for future charges
- Attaches comprehensive metadata for tracking

**Request**:
```json
{
  "amount": 50.00,
  "goalId": "goal_123",
  "userId": "user_456"
}
```

**Response**:
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/...",
  "amount": 50.00,
  "hasSavedCards": false,
  "customerId": "cus_..."
}
```

### Phase 2: Webhook Processing

#### Webhook Events Handled

1. **`checkout.session.completed`**
   - Retrieves SetupIntent with expanded payment method
   - Attaches payment method to customer
   - Saves payment method ID to goal

2. **`setup_intent.succeeded`**
   - Confirms payment method is ready for future use
   - Updates goal with payment method ID

3. **`setup_intent.setup_failed`**
   - Handles setup failures gracefully
   - Updates goal status and notifies user

4. **`payment_intent.succeeded`**
   - Records successful payments
   - Updates goal payment status
   - Creates payment records

5. **`payment_intent.payment_failed`**
   - Handles payment failures
   - Creates notifications for user action

### Phase 3: Future Payment Processing

#### API Endpoint: `/api/stripe/charge-payment-method`

**Purpose**: Charges saved payment methods when goals fail.

**Key Features**:
- Uses `off_session: true` for background charges
- Implements comprehensive error handling
- Provides detailed error responses for recovery

**Error Handling**:
- `authentication_required`: Requires user action
- `card_declined`: Card-specific issues
- `insufficient_funds`: Account balance issues
- `expired_card`: Card expiration issues

### Phase 4: Payment Recovery

#### API Endpoint: `/api/stripe/update-payment-method`

**Purpose**: Creates new setup sessions for failed payment recovery.

**Features**:
- Creates new Checkout session for payment method updates
- Handles different failure scenarios
- Provides user-friendly recovery flow

#### Component: `PaymentRecoveryModal`

**Purpose**: User interface for payment recovery.

**Features**:
- Context-aware error messages
- Clear action steps for users
- Seamless integration with Stripe Checkout

## Data Flow

### 1. Goal Creation
```
User Input → Form Validation → Create Goal (pending) → Setup Payment → Redirect to Stripe
```

### 2. Payment Setup
```
Stripe Checkout → User Enters Card → SetupIntent Created → Webhook Processing → Goal Activated
```

### 3. Goal Monitoring
```
Cron Job → Check Expired Goals → Mark Failed → Attempt Payment → Handle Results
```

### 4. Payment Processing
```
Payment Attempt → Success/Failure → Update Records → Notify User → Recovery if Needed
```

## Error Handling Strategy

### 1. Setup Failures
- **User Action**: Redirect to goal creation with error message
- **System Action**: Log failure, update goal status
- **Recovery**: User can retry setup process

### 2. Payment Failures
- **User Action**: Show recovery modal with specific error details
- **System Action**: Create notification, log failure
- **Recovery**: New setup session for payment method update

### 3. Network Failures
- **Retry Logic**: Implement exponential backoff
- **Idempotency**: Use goal-specific idempotency keys
- **Fallback**: Manual intervention for persistent failures

## Security Considerations

### 1. Webhook Security
- Signature verification for all webhook events
- Environment-specific webhook secrets
- Comprehensive logging for audit trails

### 2. API Security
- Internal API key for payment operations
- User authorization checks
- Input validation and sanitization

### 3. Data Protection
- PCI compliance through Stripe
- Encrypted storage of payment method IDs
- Minimal data retention policies

## Monitoring and Analytics

### 1. Key Metrics
- Setup success rate
- Payment success rate
- Recovery conversion rate
- Average time to recovery

### 2. Logging
- Comprehensive webhook event logging
- Payment attempt tracking
- Error categorization and analysis

### 3. Alerts
- Failed payment thresholds
- Setup failure rates
- Webhook processing errors

## Testing Strategy

### 1. Test Cards
- Use Stripe's test card numbers
- Test various failure scenarios
- Validate error handling flows

### 2. Webhook Testing
- Use Stripe CLI for local testing
- Test all event types
- Validate idempotency

### 3. Integration Testing
- End-to-end payment flows
- Error recovery scenarios
- Performance under load

## Best Practices Implemented

### 1. Stripe Recommendations
- ✅ Setup mode for future payments
- ✅ Off-session payment processing
- ✅ Comprehensive webhook handling
- ✅ Proper error handling and recovery
- ✅ Idempotency for all operations

### 2. User Experience
- ✅ Clear error messages
- ✅ Seamless recovery flows
- ✅ Minimal friction in setup
- ✅ Transparent payment processing

### 3. System Reliability
- ✅ Comprehensive error handling
- ✅ Retry logic for failures
- ✅ Audit trails and logging
- ✅ Data consistency checks

## Future Enhancements

### 1. Advanced Features
- Multiple payment method support
- Subscription-based goals
- Partial payment options
- Payment plan flexibility

### 2. Analytics
- Payment behavior analysis
- Goal success correlation
- Revenue optimization
- User engagement metrics

### 3. Compliance
- Enhanced audit trails
- Regulatory reporting
- Data retention policies
- Privacy controls

## Troubleshooting

### Common Issues

1. **Setup Intent Failures**
   - Check webhook endpoint configuration
   - Verify Stripe account settings
   - Review payment method restrictions

2. **Payment Processing Failures**
   - Validate customer and payment method IDs
   - Check account balance and limits
   - Review Stripe dashboard for errors

3. **Webhook Processing Issues**
   - Verify webhook signature
   - Check endpoint availability
   - Review event processing logic

### Debug Tools

- Stripe Dashboard for transaction monitoring
- Webhook event logs for debugging
- Payment intent status tracking
- Customer payment method management

## Conclusion

This payment strategy provides a robust, user-friendly, and scalable solution for goal-based payments. By following Stripe's best practices and implementing comprehensive error handling, we ensure reliable payment processing while maintaining excellent user experience.

The modular architecture allows for easy maintenance and future enhancements, while the comprehensive monitoring and logging provide visibility into system performance and user behavior. 