import mongoose, { Document, Schema } from "mongoose";

export interface PlayerDocument extends Document {
  userId: mongoose.Types.ObjectId; // Master User who owns this profile
  type: "SELF" | "DEPENDENT";
  name: string;
  age?: number;
  dob?: Date;
  sportsFocus: string[];
  skillLevel?: string;
  paymentHistory?: Array<{
    bookingId: mongoose.Types.ObjectId;
    amount: number;
    date: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const playerSchema = new Schema<PlayerDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["SELF", "DEPENDENT"],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    age: {
      type: Number,
    },
    dob: {
      type: Date,
    },
    sportsFocus: {
      type: [String],
      default: [],
    },
    skillLevel: {
      type: String,
    },
    paymentHistory: [
      {
        bookingId: {
          type: Schema.Types.ObjectId,
          ref: "Booking",
        },
        amount: Number,
        date: Date,
      },
    ],
  },
  { timestamps: true }
);

export const Player = mongoose.model<PlayerDocument>("Player", playerSchema);
