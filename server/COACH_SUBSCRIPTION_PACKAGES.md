# Coach Subscription System - Flexible Packages Implementation

## Overview

The coach subscription system has been refactored to give coaches complete flexibility to create and manage their own subscription packages with three billing frequencies: **Monthly**, **Quarterly**, and **Yearly**.

## What Changed

### 1. **Old System (Removed)**

- Global `CoachPlan` models created by admins
- Coaches could only subscribe to these global plans
- `CoachSubscriptionOverrideRequest` for requesting special pricing
- Limited flexibility for coaches

### 2. **New System (Implemented)**

- Coaches create their own `CoachSubscriptionPackage` instances
- Each package can be configured with:
  - **Frequency**: MONTHLY, QUARTERLY, or YEARLY
  - **Price**: Custom pricing in paise
  - **Features**: Array of feature descriptions
  - **Max Students**: Optional limit on subscribers
  - **Max Sessions**: Optional limit on coaching sessions
  - **Description**: Package details
  - **Active Status**: Enable/disable packages
- Users subscribe directly to coach-specific packages
- No admin overhead - coaches have full control

## Database Models

### CoachSubscriptionPackage

```typescript
{
  coachId: ObjectId,                    // Owner coach
  name: string,                          // Package name
  description: string,                   // Details
  frequency: "MONTHLY" | "QUARTERLY" | "YEARLY",
  price: number,                         // In paise
  features: string[],                    // Feature list
  maxStudents: number | null,            // null = unlimited
  maxSessions: number | null,            // null = unlimited
  isActive: boolean,                     // Enable/disable
  createdAt: Date,
  updatedAt: Date
}
```

### CoachSubscription (Updated)

```typescript
{
  coachId: ObjectId,                     // Coach owner
  userId: ObjectId,                      // Subscriber
  packageId: ObjectId,                   // References CoachSubscriptionPackage
  status: "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED",
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  nextBillingDate: Date,
  autoRenew: boolean,
  gracePeriodEndsAt: Date | null,
  cancelledAt: Date | null,
  cancellationReason: string,
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

### Coach Management Endpoints (Requires COACH role)

#### Create Package

```
POST /api/coaches/subscription-packages
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Monthly Premium Coaching",
  "description": "Unlimited coaching sessions per month",
  "frequency": "MONTHLY",
  "price": 50000,                    // 500 INR
  "features": ["Unlimited sessions", "1-on-1 coaching", "Performance tracking"],
  "maxStudents": null,               // unlimited
  "maxSessions": null,               // unlimited
}

Response:
{
  "success": true,
  "message": "Subscription package created successfully",
  "data": {
    "package": {
      "id": "...",
      "coachId": "...",
      "name": "Monthly Premium Coaching",
      "frequency": "MONTHLY",
      "price": 50000,
      "features": [...],
      "maxStudents": null,
      "maxSessions": null,
      "isActive": true,
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

#### Get Own Packages

```
GET /api/coaches/subscription-packages
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "packages": [
      {
        "id": "monthly-pkg",
        "name": "Monthly Premium",
        "frequency": "MONTHLY",
        "price": 50000,
        ...
      },
      {
        "id": "quarterly-pkg",
        "name": "Quarterly Bundle",
        "frequency": "QUARTERLY",
        "price": 120000,
        ...
      },
      {
        "id": "yearly-pkg",
        "name": "Yearly Full Access",
        "frequency": "YEARLY",
        "price": 400000,
        ...
      }
    ]
  }
}
```

#### Update Package

```
PUT /api/coaches/subscription-packages/:packageId
Authorization: Bearer <token>

{
  "price": 55000,
  "features": ["Updated feature list"],
  "maxStudents": 50,
  ...
}
```

#### Delete Package

```
DELETE /api/coaches/subscription-packages/:packageId
Authorization: Bearer <token>
```

#### Get Active Subscriptions

```
GET /api/coaches/subscription-packages/active-subscriptions
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "subscriptions": [
      {
        "id": "...",
        "userId": "...",
        "packageId": "...",
        "status": "ACTIVE",
        "currentPeriodStart": "...",
        "currentPeriodEnd": "...",
        "nextBillingDate": "..."
      }
    ]
  }
}
```

#### Get Revenue Dashboard

```
GET /api/coaches/subscription-packages/revenue
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "revenue": {
      "total": 500000,              // Total revenue in paise
      "count": 10,                  // Total active subscriptions
      "byFrequency": {
        "MONTHLY": 150000,
        "QUARTERLY": 200000,
        "YEARLY": 150000
      }
    }
  }
}
```

### Public Endpoints

#### View Coach's Packages

```
GET /api/coaches/:coachId/subscription-packages

Response:
{
  "success": true,
  "data": {
    "packages": [
      {
        "id": "...",
        "name": "Monthly Premium Coaching",
        "frequency": "MONTHLY",
        "price": 50000,
        "features": [...],
        "description": "..."
      }
    ]
  }
}
```

#### Subscribe to Package

```
POST /api/coaches/subscriptions
Authorization: Bearer <token>

{
  "coachId": "coach-123",
  "packageId": "package-456"
}

Response:
{
  "success": true,
  "data": {
    "subscription": {
      "id": "sub-123",
      "coachId": "coach-123",
      "userId": "user-456",
      "packageId": "package-456",
      "status": "ACTIVE",
      "currentPeriodStart": "2024-05-10T00:00:00Z",
      "currentPeriodEnd": "2024-06-10T00:00:00Z",
      "nextBillingDate": "2024-06-10T00:00:00Z",
      "autoRenew": true
    }
  }
}
```

#### Get My Subscriptions

```
GET /api/coaches/subscriptions?coachId=optional-filter
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "subscriptions": [
      {
        "id": "sub-123",
        "coachId": "coach-123",
        "packageId": "package-456",
        "status": "ACTIVE",
        "currentPeriodEnd": "2024-06-10T00:00:00Z",
        "package": {
          "name": "Monthly Premium",
          "frequency": "MONTHLY",
          "price": 50000,
          "features": [...]
        },
        "coach": {
          "name": "...",
          "bio": "...",
          "rating": 4.8,
          "sports": [...]
        }
      }
    ]
  }
}
```

#### Cancel Subscription

```
DELETE /api/coaches/subscriptions/:subscriptionId
Authorization: Bearer <token>

{
  "reason": "No longer interested"
}

Response:
{
  "success": true,
  "message": "Subscription cancelled successfully",
  "data": {
    "subscription": {
      "id": "sub-123",
      "status": "CANCELLED",
      "cancelledAt": "...",
      "cancellationReason": "No longer interested"
    }
  }
}
```

## Billing Cycles

### Frequency Duration Calculation

- **MONTHLY**: 1 month from subscription date
- **QUARTERLY**: 3 months from subscription date
- **YEARLY**: 12 months from subscription date

Example:

- Subscribe on May 10, 2024 to MONTHLY package
- Current period: May 10 - June 10
- Next billing: June 10, 2024

## Key Features

### Flexibility

✅ Coaches set their own pricing
✅ Coaches choose which features to include
✅ Optional limits on students and sessions
✅ Can create multiple packages for different needs

### Standard Parameters

Each package includes:

- **Frequency**: Fixed timeframe (Monthly/Quarterly/Yearly)
- **Price**: Transparent pricing in paise
- **Features**: Clear feature list for buyers
- **Capacity**: Optional limits to manage bookings

### Management

- Enable/disable packages without deletion
- Update pricing and features anytime
- View active subscribers
- Track revenue by frequency
- Auto-renewal support

### User Experience

- Browse coach's available packages
- Subscribe to preferred frequency
- Auto-renewal with grace period
- Easy cancellation with optional reason tracking

## Migration Notes

### Deprecated Models

- `CoachPlan` - No longer used (kept for backward compatibility)
- `CoachSubscriptionOverrideRequest` - No longer needed

### Backward Compatibility

- Old Coach Plan endpoints still return empty/deprecated status
- Existing subscriptions remain in database but use new model
- Coach model fields retained for compatibility

## Example Usage Flow

### Coach Creating Packages

1. Coach logs in and goes to "My Subscription Packages"
2. Creates 3 packages:
   - **Monthly**: ₹500/month with 4 sessions
   - **Quarterly**: ₹1200/quarter with 12 sessions
   - **Yearly**: ₹4000/year with 50 sessions
3. Sets active status and publishes
4. Students can now subscribe

### Student Subscribing

1. Browse available coaches
2. View coach's subscription packages
3. Choose frequency (Monthly/Quarterly/Yearly)
4. Subscribe with one click
5. Payment processing (using PhonePe)
6. Subscription becomes active
7. Can cancel anytime with optional reason

### Coach Monitoring

1. Dashboard shows active subscriptions
2. Revenue breakdown by frequency
3. List of active subscribers
4. Can update packages (new subscribers get new price)
5. Existing subscribers keep their locked-in price until renewal

## Technical Implementation

### Files Created

- `src/models/CoachSubscriptionPackage.ts` - New model
- `src/services/CoachSubscriptionPackageService.ts` - Service layer
- `src/controllers/coachSubscriptionPackageController.ts` - Route handlers

### Files Modified

- `src/models/CoachSubscription.ts` - Updated to use packageId
- `src/services/CoachSubscriptionService.ts` - Added new methods, deprecated old ones
- `src/routes/coachRoutes.ts` - New endpoints

### Database Indexes

- `coachId + isActive` - For finding active packages
- `coachId + frequency` - For querying by frequency

## Future Enhancements

Potential improvements for later:

- Discount codes for packages
- Trial periods
- Package dependencies
- Subscriber communication templates
- Advanced analytics and insights
- Tiered subscriber management
- Bundle deals across multiple coaches
