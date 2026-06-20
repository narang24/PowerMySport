const mongoose = require('mongoose');
require('dotenv').config();

async function seedData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    const db = mongoose.connection.db;

    // Grab the first user to act as the owner
    const user = await db.collection('users').findOne({});
    let userId = user ? user._id : new mongoose.Types.ObjectId();
    
    if (!user) {
      console.log("No user found. Creating dummy user...");
      await db.collection('users').insertOne({
        _id: userId,
        name: "Test Admin",
        email: "test@example.com",
        phone: "+919999999999",
        role: "VENUE_LISTER"
      });
    }

    const venue = {
      ownerName: user ? user.name || "Test Owner" : "Test Owner",
      ownerEmail: user ? user.email || "test@example.com" : "test@example.com",
      ownerPhone: user ? user.phone || "+919999999999" : "+919999999999",
      emailVerified: true,
      name: "PowerMySport Test Arena",
      ownerId: userId,
      location: {
        type: "Point",
        coordinates: [77.2197713, 28.6328027] // Delhi Long, Lat
      },
      sports: ["Basketball", "Tennis", "Badminton"],
      pricePerHour: 500,
      sportPricing: {
        "Basketball": 500,
        "Tennis": 800,
        "Badminton": 400
      },
      amenities: ["Parking", "Washroom", "Drinking Water"],
      address: "123 Test Avenue, Connaught Place, New Delhi",
      openingHours: {
        monday: { isOpen: true, openTime: "06:00", closeTime: "23:00", slots: [{ startTime: "06:00", endTime: "23:00" }] },
        tuesday: { isOpen: true, openTime: "06:00", closeTime: "23:00", slots: [{ startTime: "06:00", endTime: "23:00" }] },
        wednesday: { isOpen: true, openTime: "06:00", closeTime: "23:00", slots: [{ startTime: "06:00", endTime: "23:00" }] },
        thursday: { isOpen: true, openTime: "06:00", closeTime: "23:00", slots: [{ startTime: "06:00", endTime: "23:00" }] },
        friday: { isOpen: true, openTime: "06:00", closeTime: "23:00", slots: [{ startTime: "06:00", endTime: "23:00" }] },
        saturday: { isOpen: true, openTime: "06:00", closeTime: "23:00", slots: [{ startTime: "06:00", endTime: "23:00" }] },
        sunday: { isOpen: true, openTime: "06:00", closeTime: "23:00", slots: [{ startTime: "06:00", endTime: "23:00" }] }
      },
      description: "A premium sports arena injected automatically for testing payments.",
      generalImages: ["https://placehold.co/600x400?text=Venue+Image"],
      allowExternalCoaches: true,
      approvalStatus: "APPROVED",
      hasCoaches: true,
      venueCoaches: [],
      payoutMethods: [
        {
          type: "BANK_TRANSFER",
          accountHolderName: "Test Owner",
          accountNumber: "1234567890",
          ifscCode: "HDFC0001234",
          bankName: "HDFC Bank",
          isDefault: true,
          addedAt: new Date(),
          updatedAt: new Date()
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const venueResult = await db.collection('venues').insertOne(venue);
    console.log("Successfully injected Venue:", venueResult.insertedId);

    // Also inject a Coach
    const coach = {
      userId: userId,
      bio: "Test Coach ready for bookings.",
      sports: ["Basketball", "Tennis"],
      hourlyRate: 300,
      sportPricing: {
        "Basketball": 300,
        "Tennis": 400
      },
      isVerified: true,
      verificationStatus: "VERIFIED",
      baseLocation: {
        type: "Point",
        coordinates: [77.2197713, 28.6328027]
      },
      serviceRadiusKm: 15,
      payoutMethods: [
        {
          type: "UPI",
          upiId: "testcoach@ybl",
          isDefault: true,
          addedAt: new Date(),
          updatedAt: new Date()
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const coachResult = await db.collection('coaches').insertOne(coach);
    console.log("Successfully injected Coach:", coachResult.insertedId);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

seedData();
