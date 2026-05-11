# Refund Architecture & Payment Flow Documentation

## Overview

This document explains how player refunds work when a booking is cancelled, and how the money flows back to players through various payment methods.

---

## REQUIREMENT 4: Player Refund Flow

### Key Question
> "For refunds to a player, how the money is flowing? How will we return to the player through which method? Does the user have to set some payment methods for refunds?"

### Answer

**Three-Method Approach:**

1. **Method 1: Return to Original Card (Primary - No Setup Needed)**
   - When player pays via PhonePe, we can initiate a refund back to the original payment method automatically
   - **No setup required** - PhonePe handles the reversal
   - **Applicable when**: Booking cancelled within refund window
   - **Timeline**: 3-5 business days typically

2. **Method 2: Bank Account (For Larger Refunds)**
   - Player can optionally add bank details to their profile for refunds
   - Used when original card refund is not possible
   - Requires player to set bank account during refund processing
   - **Must Have**: Account holder name, account number, IFSC code

3. **Method 3: Store Credit (Instant)**
   - Instant credit to player's account wallet
   - Can be used for future bookings
   - Fastest method, user-friendly
   - No external dependency, no delay

---

## Current Architecture (What Exists)

### Booking Model - Refund Fields
```typescript
// server/src/models/Booking.ts
refundAmount: number;
refundStatus: "PENDING" | "PROCESSED" | "REJECTED";
```

### BookingPayment Model - Refund Tracking
```typescript
// Refund tracking per payment
refundMerchantId: string;
refundId: string;
refundState: string; // "INITIATED", "COMPLETED", "FAILED"
refundAmount: number;
```

### Issue: PhonePe getRefundStatus() Missing ❌
**CRITICAL**: The `PhonePeService.ts` lacks a `getRefundStatus()` method to check refund status.

---

## Implementation Plan

### Phase 1: Implement PhonePe Refund Status Checking (CRITICAL - Do This First!)

**File**: `server/src/services/PhonePeService.ts`

```typescript
/**
 * Get the current status of a refund
 * CRITICAL IMPLEMENTATION - Currently Missing!
 */
export async function getPhonePeRefundStatus(
  refundId: string
): Promise<PhonePeRefundStatusResult> {
  try {
    const client = getPhonePeClient();
    const request = client.refundStatusRequest(refundId);
    const response = await request.execute();

    return {
      refundId: response.refund_id || refundId,
      merchantRefundId: response.merchant_refund_id,
      state: response.state, // "INITIATED", "COMPLETED", "FAILED", "DECLINED"
      amount: response.amount,
      paymentDetails: response.payment_details,
      raw: response,
    };
  } catch (error) {
    const mappedError = mapPhonePeError(error);
    throw new PhonePeGatewayError(mappedError.userMessage, {
      statusCode: mappedError.statusCode,
      retryable: mappedError.retryable,
      originalError: error,
    });
  }
}
```

### Phase 2: Add Refund Method Selection to Player Profile

**File**: `server/src/models/User.ts` (or Player profile extension)

Add new field:
```typescript
export interface IRefundMethod {
  /** Type of refund destination */
  type: "ORIGINAL_CARD" | "BANK_ACCOUNT" | "STORE_CREDIT";
  
  // For bank account option
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  
  /** Whether to use this method by default */
  isDefault?: boolean;
  
  addedAt: Date;
  updatedAt: Date;
}

// In User/Player document:
refundMethods?: IRefundMethod[]; // Array of refund destinations
```

### Phase 3: Refund Processing Workflow

**Trigger**: When a booking is cancelled and refund is eligible

```typescript
// server/src/services/RefundService.ts (NEW FILE)

export async function processRefund(
  bookingId: string,
  playerId: string,
  amount: number,
  refundMethod?: IRefundMethod
) {
  // 1. Determine refund method
  const method = refundMethod || getDefaultRefundMethod(playerId);
  
  // 2. Process based on method
  switch (method.type) {
    case "ORIGINAL_CARD":
      return initiatePhonePeRefund(bookingId, amount);
    
    case "BANK_ACCOUNT":
      return bankTransferRefund(playerId, amount, method);
    
    case "STORE_CREDIT":
      return storeCreditRefund(playerId, amount);
  }
}

// Polling mechanism to track refund status
export async function pollRefundStatus(
  bookingPaymentId: string,
  maxAttempts = 10
) {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const payment = await BookingPayment.findById(bookingPaymentId);
    
    if (payment.refundId) {
      const status = await getPhonePeRefundStatus(payment.refundId);
      
      if (status.state === "COMPLETED") {
        payment.refundState = "COMPLETED";
        payment.refundAt = new Date();
        await payment.save();
        return status;
      } else if (status.state === "FAILED") {
        payment.refundState = "FAILED";
        await payment.save();
        throw new Error("Refund failed on PhonePe");
      }
    }
    
    // Wait before next poll
    await new Promise(r => setTimeout(r, 5000)); // 5 second intervals
    attempts++;
  }
  
  throw new Error("Refund status check timed out");
}
```

### Phase 4: Admin Refund Processing UI

**File**: `admin/src/app/admin/refunds/page.tsx` (NEW FILE)

Components needed:
1. **Refund Requests List** - Show pending refunds
2. **Refund Detail Modal** - Show booking details, player info, amount
3. **Refund Method Selector**:
   - Radio buttons for: Original Card, Bank Account, Store Credit
   - Bank account fields only appear if that option selected
4. **Confirm Refund Button**
5. **Status Tracker** - Show refund progress with polling

### Phase 5: Refund Status Polling Scheduler

**File**: `server/src/utils/scheduledJobs.ts`

```typescript
/**
 * Poll pending refunds and update their status
 * Run every 5-10 minutes
 */
export const pollPendingRefunds = async (): Promise<void> => {
  try {
    const { BookingPayment } = await import("../models/BookingPayment");
    
    // Find all refunds initiated but not completed
    const pendingRefunds = await BookingPayment.find({
      refundId: { $exists: true, $ne: null },
      refundState: "INITIATED",
    });

    for (const payment of pendingRefunds) {
      try {
        const status = await getPhonePeRefundStatus(payment.refundId);
        
        if (status.state !== "INITIATED") {
          payment.refundState = status.state;
          if (status.state === "COMPLETED") {
            payment.refundAt = new Date();
          }
          await payment.save();
        }
      } catch (error) {
        console.error(`Error checking refund ${payment.refundId}:`, error);
        // Continue to next refund
      }
    }
  } catch (error) {
    console.error("❌ Error polling pending refunds:", error);
  }
};

// Add to runScheduledCleanup():
export const runScheduledCleanup = async (): Promise<void> => {
  // ... existing code ...
  await pollPendingRefunds(); // Add this
};
```

---

## Payment Flow Diagram

### Booking Payment Flow
```
Player Books → Payment Initiated → PhonePe QR (10 min valid) → Payment Complete
                                                              ↓
                                                    Payment PENDING (24hrs)
                                                              ↓
                                                    Auto-Release to Coach (24hrs scheduled job)
                                                              ↓
                                                      Coach Gets Payout
```

### Refund Flow
```
Admin Initiates Refund ─→ Refund Method Selection
                            ├─ Original Card → PhonePe Reversal → 3-5 days
                            ├─ Bank Account → Manual Transfer → 2-3 days
                            └─ Store Credit → Instant Wallet Credit → Immediate
                                             ↓
                                    Polling Refund Status (every 5 mins)
                                             ↓
                                    Update Booking refundStatus
                                             ↓
                                    Notify Player
```

---

## Data Model Changes Required

### 1. BookingPayment Model Enhancement
```typescript
interface BookingPayment {
  // ... existing fields ...
  
  // Refund tracking
  refundMerchantId?: string;    // ✅ Exists
  refundId?: string;             // ✅ Exists
  refundState?: string;          // ✅ Exists (INITIATED, COMPLETED, FAILED)
  refundAmount?: number;         // ✅ Exists
  refundAt?: Date;               // ✅ Should exist (timestamp when refund completed)
  refundMethod?: IRefundMethod;  // NEW: Which method was used
}
```

### 2. User Model Enhancement
```typescript
interface User {
  // ... existing fields ...
  refundMethods?: IRefundMethod[]; // NEW: Player's refund destinations
}
```

---

## API Endpoints Needed

### 1. Get Player's Refund Methods
```
GET /api/players/:playerId/refund-methods
Response: IRefundMethod[]
```

### 2. Add Refund Method
```
POST /api/players/:playerId/refund-methods
Body: { type, accountHolderName?, accountNumber?, ifscCode?, bankName?, isDefault? }
Response: IRefundMethod
```

### 3. Set Default Refund Method
```
PUT /api/players/:playerId/refund-methods/:methodId/set-default
Response: { success: boolean }
```

### 4. Initiate Refund (Admin)
```
POST /api/admin/bookings/:bookingId/refund
Body: { 
  amount: number,
  refundMethod?: IRefundMethod,  // Optional - uses default if not provided
  reason?: string
}
Response: { refundId, status, message }
```

### 5. Get Refund Status
```
GET /api/bookings/:bookingId/refund-status
Response: { 
  state: string,
  amount: number,
  method: string,
  completedAt?: Date
}
```

---

## Implementation Priority

1. **🔴 CRITICAL FIRST**: Implement `getPhonePeRefundStatus()` in PhonePeService.ts
   - This is currently MISSING and blocks all refund workflows
   - Check SDK documentation for method name
   - Add error handling and timeout logic

2. **🔴 HIGH**: Add refund polling scheduler to scheduledJobs.ts

3. **🟡 MEDIUM**: Enhance User model with refundMethods array

4. **🟡 MEDIUM**: Create admin refund processing UI

5. **🟡 MEDIUM**: Create RefundService.ts with refund orchestration

---

## Key Implementation Notes

### Default Behavior (No Setup Required)
- When player cancels and refund is initiated, **default is to return to original card**
- No player setup needed for this flow
- PhonePe reversal is automatic

### Optional Setup (For Convenience)
- Players can optionally add bank account or enable store credit
- Refund method selection happens during refund processing (admin initiates)
- Player doesn't need to pre-configure unless they want specific method

### Backward Compatibility
- Existing refunds currently have `refundState` field
- Just need to add `refundAt` timestamp
- New `refundMethod` field is optional

---

## Testing Checklist

- [ ] PhonePe refund initiation works
- [ ] getPhonePeRefundStatus() retrieves correct status
- [ ] Refund polling updates status correctly
- [ ] Player can add bank account for refunds
- [ ] Admin can select refund method and confirm
- [ ] Store credit refund instantly credits wallet
- [ ] Email notifications sent on refund completion
- [ ] Booking refund fields update correctly
- [ ] Refund history is visible in player's account

---

## Security Considerations

1. **Bank Details**: Store encrypted in database
2. **Refund Amount Validation**: Never refund more than original payment amount
3. **Authorization**: Only admins can initiate refunds
4. **Audit Trail**: Log all refund actions with admin who initiated
5. **Rate Limiting**: Prevent duplicate refund requests within 1 minute

---

## PhonePe SDK Method Reference

Check your PhonePe SDK v2.0.5 documentation for:
- `refundStatusRequest()` method signature
- Return value fields
- Error codes
- Timeout recommendations

