import axiosInstance from "@/lib/api/axios";
import { ApiResponse, IPayoutMethod } from "@/types";

const isNotFoundError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "response" in error &&
  typeof (error as { response?: { status?: number } }).response?.status ===
    "number" &&
  (error as { response?: { status?: number } }).response?.status === 404;

export const payoutApi = {
  // ── COACH ────────────────────────────────────────────────────────────────

  /** Fetch the currently-authenticated coach's saved payout method */
  getCoachPayoutMethod: async (): Promise<
    ApiResponse<{ payoutMethod: IPayoutMethod | null }>
  > => {
    try {
      const response = await axiosInstance.get(
        "/payouts/coach/my-payout-method",
      );
      return response.data;
    } catch (error) {
      if (isNotFoundError(error)) {
        return {
          success: true,
          message: "Payout method retrieved",
          data: { payoutMethod: null },
        };
      }

      throw error;
    }
  },

  /** Create or replace the coach's payout method */
  upsertCoachPayoutMethod: async (
    payload: Omit<IPayoutMethod, "addedAt" | "updatedAt">,
  ): Promise<ApiResponse<{ payoutMethod: IPayoutMethod }>> => {
    const response = await axiosInstance.put(
      "/payouts/coach/my-payout-method",
      payload,
    );
    return response.data;
  },

  /** Remove the coach's payout method */
  deleteCoachPayoutMethod: async (): Promise<
    ApiResponse<{ payoutMethod: null }>
  > => {
    const response = await axiosInstance.delete(
      "/payouts/coach/my-payout-method",
    );
    return response.data;
  },

  // ── VENUE ─────────────────────────────────────────────────────────────────

  /** Fetch the venue-lister's saved payout method */
  getVenuePayoutMethod: async (): Promise<
    ApiResponse<{ payoutMethod: IPayoutMethod | null; venueName?: string }>
  > => {
    try {
      const response = await axiosInstance.get(
        "/payouts/venue/my-payout-method",
      );
      return response.data;
    } catch (error) {
      if (isNotFoundError(error)) {
        return {
          success: true,
          message: "Payout method retrieved",
          data: { payoutMethod: null },
        };
      }

      throw error;
    }
  },

  /** Create or replace the venue-lister's payout method */
  upsertVenuePayoutMethod: async (
    payload: Omit<IPayoutMethod, "addedAt" | "updatedAt">,
  ): Promise<ApiResponse<{ payoutMethod: IPayoutMethod }>> => {
    const response = await axiosInstance.put(
      "/payouts/venue/my-payout-method",
      payload,
    );
    return response.data;
  },

  /** Remove the venue-lister's payout method */
  deleteVenuePayoutMethod: async (): Promise<
    ApiResponse<{ payoutMethod: null }>
  > => {
    const response = await axiosInstance.delete(
      "/payouts/venue/my-payout-method",
    );
    return response.data;
  },
};
