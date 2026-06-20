const mongoose = require('mongoose');
require('dotenv').config();

async function seedPromo() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    const db = mongoose.connection.db;

    // Grab the first user to act as the creator
    const user = await db.collection('users').findOne({});
    let userId = user ? user._id : new mongoose.Types.ObjectId();

    const validFrom = new Date();
    validFrom.setDate(validFrom.getDate() - 1); // Yesterday

    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 1); // Next year

    const promoCode = {
      code: "TEST1",
      description: "Test promo code for minimal payment testing.",
      discountType: "FIXED_AMOUNT",
      discountValue: 499,
      applicableTo: "ALL",
      validFrom: validFrom,
      validUntil: validUntil,
      isActive: true,
      maxUsageTotal: 1000,
      maxUsagePerUser: 100,
      currentUsageCount: 0,
      usedBy: [],
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const promoResult = await db.collection('promocodes').insertOne(promoCode);
    console.log("Successfully injected Promo Code:", promoCode.code, "| ID:", promoResult.insertedId);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

seedPromo();
