const mongoose = require("mongoose");

const OrderShema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true,
  },
  items: [
    {
      productId: { type: Number, required: true },
      name: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true },
      image: { type: String, required: true },
    },
  ],
  totalAmount: { type: Number, required: true },
  billingDetails: {
    firstName: { type: String, required: true },
    companyName: { type: String }, // optional
    streetAddress: { type: String, required: true },
    apartment: { type: String }, // optional
    city: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    saveInfo: { type: Boolean, default: false },
  },
  paymentMethod: { type: String, enum: ["stripe", "cash"], required: true },
  paymentIntentId: { type: String }, // only for Stripe
  paymentStatus: { type: String, enum: ["pending", "succeeded", "failed"],default: "pending",},
  date: {
    type: Date,
    default: Date.now,
  },
});
module.exports = mongoose.model("Order",OrderShema);