import { IPayment } from "../types/index";

/**
 * Calculate split payment amounts for venue and optional coach
 * @param venuePrice - Price charged by the venue
 * @param venueOwnerId - User ID of the venue owner
 * @param coachPrice - Optional price charged by the coach
 * @param coachUserId - Optional user ID of the coach
 * @param commissionRate - Platform commission rate (0 = 0%, 0.10 = 10%). Defaults to 0.
 * @returns Array of payment objects
 */
export const calculateSplitAmounts = (
  venuePrice: number,
  venueOwnerId: string,
  coachPrice?: number,
  coachUserId?: string,
  commissionRate: number = 0,
): IPayment[] => {
  const payments: IPayment[] = [];
  let totalCommission = 0;

  // Venue payout (minus commission)
  const venueCommission = Math.round(venuePrice * commissionRate * 100) / 100;
  payments.push({
    userId: venueOwnerId,
    userType: "VENUE_LISTER",
    amount: Math.round((venuePrice - venueCommission) * 100) / 100,
    status: "PENDING",
  });
  totalCommission += venueCommission;

  // Coach payout (minus commission)
  if (coachPrice && coachUserId) {
    const coachCommission = Math.round(coachPrice * commissionRate * 100) / 100;
    payments.push({
      userId: coachUserId,
      userType: "COACH",
      amount: Math.round((coachPrice - coachCommission) * 100) / 100,
      status: "PENDING",
    });
    totalCommission += coachCommission;
  }

  // Track platform commission as a separate entry (only if non-zero)
  if (totalCommission > 0) {
    payments.push({
      userId: "PLATFORM",
      userType: "PLATFORM" as any,
      amount: Math.round(totalCommission * 100) / 100,
      status: "PENDING",
    });
  }

  return payments;
};

/**
 * Calculate split payment amounts for group booking (equal split among players)
 * @param totalAmount - Total booking amount including fees
 * @param venuePrice - Price charged by the venue (for venue owner payment)
 * @param venueOwnerId - User ID of the venue owner
 * @param participantIds - Array of participant user IDs (including organizer)
 * @param coachPrice - Optional price charged by the coach
 * @param coachUserId - Optional user ID of the coach
 * @param commissionRate - Platform commission rate (0 = 0%, 0.10 = 10%). Defaults to 0.
 * @returns Array of payment objects (venue/coach + player splits)
 */
export const calculateGroupPaymentSplits = (
  totalAmount: number,
  venuePrice: number,
  venueOwnerId: string,
  participantIds: string[],
  coachPrice?: number,
  coachUserId?: string,
  commissionRate: number = 0,
): IPayment[] => {
  const payments: IPayment[] = [];
  let totalCommission = 0;

  // Add venue owner payment (minus commission)
  const venueCommission = Math.round(venuePrice * commissionRate * 100) / 100;
  payments.push({
    userId: venueOwnerId,
    userType: "VENUE_LISTER",
    amount: Math.round((venuePrice - venueCommission) * 100) / 100,
    status: "PENDING",
  });
  totalCommission += venueCommission;

  // Add coach payment if applicable (minus commission)
  if (coachPrice && coachUserId) {
    const coachCommission = Math.round(coachPrice * commissionRate * 100) / 100;
    payments.push({
      userId: coachUserId,
      userType: "COACH",
      amount: Math.round((coachPrice - coachCommission) * 100) / 100,
      status: "PENDING",
    });
    totalCommission += coachCommission;
  }

  // Track platform commission as a separate entry
  if (totalCommission > 0) {
    payments.push({
      userId: "PLATFORM",
      userType: "PLATFORM" as any,
      amount: Math.round(totalCommission * 100) / 100,
      status: "PENDING",
    });
  }

  // Calculate equal split among participants
  const numParticipants = participantIds.length;
  if (numParticipants === 0) {
    throw new Error("At least one participant is required");
  }

  // Split total amount equally
  const amountPerPerson =
    Math.round((totalAmount / numParticipants) * 100) / 100;

  // Handle rounding - last person pays the difference
  const sumOfSplits = amountPerPerson * (numParticipants - 1);
  const lastPersonAmount = Math.round((totalAmount - sumOfSplits) * 100) / 100;

  // Add player payment splits
  participantIds.forEach((userId, index) => {
    payments.push({
      userId,
      userType: "PLAYER",
      amount:
        index === numParticipants - 1 ? lastPersonAmount : amountPerPerson,
      status: "PENDING",
    });
  });

  return payments;
};

/**
 * Check if all payments in a booking are paid
 * @param payments - Array of payment objects
 * @returns True if all payments are PAID, false otherwise
 */
export const validatePaymentStatus = (payments: IPayment[]): boolean => {
  if (payments.length === 0) {
    return false;
  }

  return payments.every((payment) => payment.status === "PAID");
};
