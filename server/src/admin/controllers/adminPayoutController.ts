import { Request, Response } from "express";
import { Booking } from "../../client/models/Booking";
import { Coach, IPayoutMethod } from "../../client/models/Coach";
import { Venue } from "../../client/models/Venue";
import { User } from "../../client/models/User";
import mongoose from "mongoose";
import { getPaginationParams } from "../../utils/pagination";

const getPrimaryPayoutMethod = (
  payoutMethods?: IPayoutMethod[],
): IPayoutMethod | null => {
  if (!payoutMethods || payoutMethods.length === 0) {
    return null;
  }

  return payoutMethods.find((method) => method.isDefault) ?? payoutMethods[0] ?? null;
};

/**
 * Admin: Get all pending payouts grouped by vendor
 * GET /api/admin/payouts/pending
 */
export const listPendingPayouts = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { page, limit, skip } = getPaginationParams(
      req.query.page as string,
      req.query.limit as string,
      20,
      100
    );

    // Use aggregation pipeline to prevent memory issues with large datasets
    const aggregationResult = await Booking.aggregate([
      {
        $match: {
          status: "COMPLETED",
          "payments.status": "PENDING",
          "payments.userType": { $in: ["VENUE_LISTER", "COACH"] },
        },
      },
      { $unwind: "$payments" },
      {
        $match: {
          "payments.status": "PENDING",
          "payments.userType": { $in: ["VENUE_LISTER", "COACH"] },
        },
      },
      {
        $group: {
          _id: {
            vendorId: "$payments.userId",
            vendorRole: "$payments.userType",
          },
          totalPendingAmount: { $sum: "$payments.amount" },
          bookingIds: { $push: "$_id" },
        },
      },
      {
        $project: {
          _id: 0,
          vendorId: "$_id.vendorId",
          vendorRole: "$_id.vendorRole",
          totalPendingAmount: 1,
          bookingIds: 1,
        },
      },
      {
        $sort: { totalPendingAmount: -1 }, // Highest pending amounts first
      },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: limit }],
        },
      },
    ]);

    const resultData = aggregationResult[0];
    const totalCount = resultData.metadata[0]?.total || 0;
    const pendingPayouts = resultData.data;

    // Populate vendor details and payout methods
    const populatedPayouts = await Promise.all(
      pendingPayouts.map(async (payout: any) => {
        const vendorIdStr = payout.vendorId.toString();
        const user = await User.findById(vendorIdStr).select("name email phone").lean();
        
        let payoutMethod: IPayoutMethod | null = null;
        if (payout.vendorRole === "COACH") {
          const coach = await Coach.findOne({ userId: vendorIdStr })
            .select("payoutMethods")
            .lean();
          payoutMethod = getPrimaryPayoutMethod(
            coach?.payoutMethods as IPayoutMethod[] | undefined,
          );
        } else if (payout.vendorRole === "VENUE_LISTER") {
          const venue = await Venue.findOne({ ownerId: vendorIdStr })
            .select("payoutMethods")
            .lean();
          payoutMethod = getPrimaryPayoutMethod(
            venue?.payoutMethods as IPayoutMethod[] | undefined,
          );
        }

        return {
          vendorId: vendorIdStr,
          vendorRole: payout.vendorRole,
          totalPendingAmount: payout.totalPendingAmount,
          bookingIds: payout.bookingIds,
          vendorName: user?.name || "Unknown",
          vendorEmail: user?.email || "Unknown",
          vendorPhone: user?.phone || "Unknown",
          payoutMethod,
        };
      })
    );

    res.status(200).json({
      success: true,
      message: "Pending payouts retrieved",
      data: {
        payouts: populatedPayouts,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    console.error("listPendingPayouts error:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to load payouts",
    });
  }
};

/**
 * Admin: Mark a vendor's pending payouts as paid
 * POST /api/admin/payouts/mark-paid
 */
export const markPayoutsAsPaid = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { vendorId, vendorRole, bookingIds, transferReference } = req.body;

    if (!vendorId || !vendorRole || !Array.isArray(bookingIds) || bookingIds.length === 0) {
      res.status(400).json({
        success: false,
        message: "vendorId, vendorRole, and an array of bookingIds are required",
      });
      return;
    }

    if (!transferReference) {
      res.status(400).json({
        success: false,
        message: "transferReference is required",
      });
      return;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const now = new Date();
      let updatedCount = 0;

      for (const bookingId of bookingIds) {
        const result = await Booking.updateOne(
          {
            _id: bookingId,
            status: "COMPLETED",
            "payments.userId": vendorId,
            "payments.userType": vendorRole,
            "payments.status": "PENDING"
          },
          {
            $set: {
              "payments.$[elem].status": "PAID",
              "payments.$[elem].paidAt": now,
              "payments.$[elem].transferReference": transferReference
            }
          },
          {
            arrayFilters: [
              { "elem.userId": vendorId, "elem.userType": vendorRole, "elem.status": "PENDING" }
            ],
            session
          }
        );

        if (result.modifiedCount > 0) {
          updatedCount++;
        }
      }

      await session.commitTransaction();

      res.status(200).json({
        success: true,
        message: `Successfully marked ${updatedCount} booking payments as PAID.`,
      });
    } catch (transactionError) {
      await session.abortTransaction();
      throw transactionError;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error("markPayoutsAsPaid error:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to process payout",
    });
  }
};
