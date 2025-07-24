const mongoose = require("mongoose");
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
  },
  cartData: {
    type: Object,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  authProvider: { type: String, default: "local" }, // 'local' or 'google'
  WishlistData: {
    type: Object,
    required: true,
    default:{},
  },
});
module.exports = mongoose.model("Users", UserSchema);
