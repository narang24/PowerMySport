/**
 * Refund Service - Handles all refund operations
 * Supports multiple refund methods:
 * 1. Return to original card (PhonePe reversal) - default
 * 2. Bank transfer (manual from admin)
 * 3. Store credit (instant wallet credit)
 */

import { Booking } from "../models/Booking";
import { BookingPaymentTransaction } from "../models/BookingPayment";
import { User } from "../models/User";
import {
  initiatePhonePeRefund,
  getPhonePeRefundStatus,
  PhonePeRefundResult,
  PhonePeRefundStatusResult,
} from "./PhonePeService";
import { NotificationService } from "./NotificationService";

export type RefundMethod = "ORIGINAL_CARD" | "BANK_TRANSFER" | "STORE_CREDIT";

export interface InitiateRefundPayload {
  bookingPaymentTransactionId: string;
  amount: number;
  reason?: string;
  refundMethod?: RefundMethod; // Defaults to ORIGINAL_CARD
  bankDetails?: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName?: string;
  };
}

export interface RefundStatusResponse {
  transactionId: string;
  refundId?: string;
  state: string; // INITIATED, COMPLETED, FAILED
  amount: number;
  method: RefundMethod;
  completedAt?: Date;
  failureReason?: string;
}

/**
 * Initiate a refund to a player
 * Creates a refund transaction and initiates based on selected method
 */
export async function initiateRefund(
  payload: InitiateRefundPayload,
): Promise<RefundStatusResponse> {
  const { bookingPaymentTransactionId, amount, reason, refundMethod = "ORIGINAL_CARD" } = payload;

  // Get the payment transaction
  const transaction = await BookingPaymentTransaction.findById(
    bookingPaymentTransactionId,
  );
  if (!transaction) {
    throw new Error("Payment transaction not found");
  }

  // Validate refund amount
  if (amount > transaction.amount) {
    throw new Error(
      `Refund amount (₹${amount}) cannot exceed original payment (₹${transaction.amount})`,
    );
  }

  // Validate refund not already processed
  if (transaction.refundState && transaction.refundState !== "FAILED") {
    throw new Error(
      `Refund already ${transaction.refundState.toLowerCase()} for this transaction`,
    );
  }

  let refundId: string | undefined;
  let state: string = "INITIATED";

  try {
    switch (refundMethod) {
      case "ORIGINAL_CARD":
        return await initiateCardRefund(transaction, amount);

      case "BANK_TRANSFER":
        if (!payload.bankDetails) {
          throw new Error("Bank details required for bank transfer refunds");
        }
        return await initiateBankTransferRefund(transaction, amount, payload.bankDetails);

      case "STORE_CREDIT":
        return await initiateStoreCreditRefund(transaction, amount);

      default:
        throw new Error(`Unknown refund method: ${refundMethod}`);
    }
  } catch (error) {
    console.error("Error initiating refund:", error);
    throw error;
  }
}

/**
 * Refund via PhonePe to original card (default method)
 */
async function initiateCardRefund(
  transaction: any,
  amount: number,
): Promise<RefundStatusResponse> {
  if (!transaction.merchantOrderId) {
    throw new Error("Merchant order ID not found for refund");
  }

  // Generate unique refund merchant ID
  const refundMerchantId = `REFUND-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  try {
    const refundResult = await initiatePhonePeRefund({
      merchantRefundId: refundMerchantId,
      originalMerchantOrderId: transaction.merchantOrderId,
      amount,
    });

    // Update transaction with refund details
    transaction.refundMerchantId = refundMerchantId;
    transaction.refundId = refundResult.refundId;
    transaction.refundState = refundResult.state || "INITIATED";
    transaction.refundAmount = amount;
    transaction.refundResponse = refundResult.raw;
    await transaction.save();

    const response: RefundStatusResponse = {
      transactionId: transaction._id.toString(),
      state: refundResult.state || "INITIATED",
      amount,
      method: "ORIGINAL_CARD",
    };

    if (refundResult.refundId) {
      response.refundId = refundResult.refundId;
    }

    return response;
  } catch (error) {
    console.error("PhonePe refund initiation failed:", error);
    transaction.refundState = "FAILED";
    transaction.refundAmount = amount;
    await transaction.save();
    throw error;
  }
}

/**
 * Refund via bank transfer (admin-initiated)
 * Stores bank details but requires manual transfer by finance team
 */
async function initiateBankTransferRefund(
  transaction: any,
  amount: number,
  bankDetails: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName?: string;
  },
): Promise<RefundStatusResponse> {
  const bankTransferId = `BANK-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  // Store bank transfer details
  transaction.refundMerchantId = bankTransferId;
  transaction.refundState = "INITIATED"; // Awaiting manual transfer
  transaction.refundAmount = amount;
  transaction.refundResponse = {
    method: "BANK_TRANSFER",
    bankDetails,
    initiatedAt: new Date(),
    status: "PENDING_MANUAL_TRANSFER",
  };
  await transaction.save();

  // TODO: Send notification to finance team for manual processing
  // notifyFinanceTeam(bankTransferId, bankDetails, amount);

  return {
    transactionId: transaction._id.toString(),
    refundId: bankTransferId,
    state: "INITIATED",
    amount,
    method: "BANK_TRANSFER",
  };
}

/**
 * Refund via instant store credit to player's wallet
 */
async function initiateStoreCreditRefund(
  transaction: any,
  amount: number,
): Promise<RefundStatusResponse> {
  const storeCreditId = `CREDIT-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  try {
    // Add credit to player's wallet
    await User.findByIdAndUpdate(
      transaction.userId,
      {
        $inc: { "playerProfile.walletBalance": amount },
        $push: {
          "playerProfile.walletTransactions": {
            id: storeCreditId,
            type: "CREDIT",
            amount,
            reason: "Booking Refund",
            timestamp: new Date(),
            bookingPaymentTransactionId: transaction._id,
          },
        },
      },
      { new: true },
    );

    // Update transaction
    transaction.refundMerchantId = storeCreditId;
    transaction.refundId = storeCreditId;
    transaction.refundState = "COMPLETED";
    transaction.refundAmount = amount;
    transaction.refundResponse = {
      method: "STORE_CREDIT",
      walletCredited: true,
      completedAt: new Date(),
    };
    await transaction.save();

    const response: RefundStatusResponse = {
      transactionId: transaction._id.toString(),
      state: "COMPLETED",
      amount,
      method: "STORE_CREDIT",
      completedAt: new Date(),
    };

    response.refundId = storeCreditId;
    return response;
  } catch (error) {
    console.error("Store credit refund failed:", error);
    transaction.refundState = "FAILED";
    transaction.refundAmount = amount;
    await transaction.save();
    throw error;
  }
}

/**
 * Check refund status for a payment transaction
 */
export async function checkRefundStatus(
  transactionId: string,
): Promise<RefundStatusResponse> {
  const transaction = await BookingPaymentTransaction.findById(transactionId);

  if (!transaction) {
    throw new Error("Payment transaction not found");
  }

  if (!transaction.refundId) {
    throw new Error("No refund found for this transaction");
  }

  // Handle store credit refunds (already completed)
  if (
    transaction.refundResponse?.method === "STORE_CREDIT" &&
    transaction.refundState === "COMPLETED"
  ) {
    const response: RefundStatusResponse = {
      transactionId: transaction._id.toString(),
      state: "COMPLETED",
      amount: transaction.refundAmount || 0,
      method: "STORE_CREDIT",
      completedAt: transaction.refundResponse.completedAt,
    };

    if (transaction.refundId) {
      response.refundId = transaction.refundId;
    }

    return response;
  }

  // Handle bank transfers (manual process)
  if (transaction.refundResponse?.method === "BANK_TRANSFER") {
    const response: RefundStatusResponse = {
      transactionId: transaction._id.toString(),
      state: transaction.refundState || "INITIATED",
      amount: transaction.refundAmount || 0,
      method: "BANK_TRANSFER",
      failureReason: transaction.refundResponse?.failureReason,
    };

    if (transaction.refundId) {
      response.refundId = transaction.refundId;
    }

    return response;
  }

  // For PhonePe refunds, check status with gateway
  if (!transaction.refundMerchantId) {
    throw new Error("No refund merchant ID found");
  }

  try {
    const status = await getPhonePeRefundStatus(transaction.refundMerchantId);

    // Update transaction with latest status
    if (status.state) {
      transaction.refundState = status.state;
    }
    if (status.state === "COMPLETED") {
      transaction.updatedAt = new Date();
    }
    await transaction.save();

    const response: RefundStatusResponse = {
      transactionId: transaction._id.toString(),
      state: status.state || "INITIATED",
      amount: status.amount || transaction.refundAmount || 0,
      method: "ORIGINAL_CARD",
    };

    if (status.refundId || transaction.refundId) {
      response.refundId = status.refundId || transaction.refundId;
    }

    return response;
  } catch (error) {
    console.error("Error checking refund status:", error);
    const response: RefundStatusResponse = {
      transactionId: transaction._id.toString(),
      state: transaction.refundState || "INITIATED",
      amount: transaction.refundAmount || 0,
      method: "ORIGINAL_CARD",
      failureReason: String(error),
    };

    if (transaction.refundId) {
      response.refundId = transaction.refundId;
    }

    return response;
  }
}

/**
 * Bulk check pending refunds and update their status
 * Used by scheduled jobs to poll refund statuses
 */
export async function updatePendingRefundStatuses(): Promise<{
  checked: number;
  completed: number;
  failed: number;
}> {
  const pendingRefunds = await BookingPaymentTransaction.find({
    refundState: "INITIATED",
    $or: [
      { "refundResponse.method": { $ne: "BANK_TRANSFER" } },
      { "refundResponse.method": { $exists: false } },
    ],
  });

  let completed = 0;
  let failed = 0;

  for (const transaction of pendingRefunds) {
    try {
      const status = await checkRefundStatus(transaction._id.toString());

      if (status.state === "COMPLETED") {
        completed++;
        // Send completion notification
        const user = await User.findById(transaction.userId);
        if (user) {
          await NotificationService.send(
            {
              userId: user._id.toString(),
              type: "PAYMENT_REFUND",
              title: "Refund completed",
              message: `Your refund of ₹${transaction.refundAmount || 0} has been completed.`,
              data: {
                amount: transaction.refundAmount || 0,
                method: "ORIGINAL_CARD",
                transactionId: transaction._id.toString(),
              },
            },
            { sendEmail: true, sendPush: true },
          );
        }
      } else if (status.state === "FAILED") {
        failed++;
      }
    } catch (error) {
      console.error(`Error updating refund ${transaction._id}:`, error);
    }
  }

  return {
    checked: pendingRefunds.length,
    completed,
    failed,
  };
}
