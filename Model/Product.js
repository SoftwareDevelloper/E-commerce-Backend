const { color } = require("chart.js/helpers");
const mongoose = require("mongoose");

const ProductsShema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  image1: {
    type: String,
    required: true,
  },
  image2: {
    type: String,
    required: true,
  },
  image3: {
    type: String,
    required: true,
  },
  image4: {
    type: String,
    required: true,
  },
  image5: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
    enum: [
      "Phones", // electronics types
      "Tv",
      "Games",
      "Kids", // clothes types
      "Men's",
      "Women's",
    ],
  },

  color: [
    {
      name: { type: String},
      hex: { type: String},
    },
  ],

  oldprice: {
    type: Number,
    required: true,
  },
  newPrice: {
    type: Number,
    required: false,
  },
  solde: {
    type: Number,
    default: 0, // optional, but good to default to 0 if no discount
  },
  date: {
    type: Date,
    default: Date.now,
  },
  available: {
    type: Boolean,
    default: true,
  },
  Size: {
    type: [String],
    enum: ["XS", "S", "M", "L", "XL"],
    default: ["XS", "S", "M", "L", "XL"],
    validate: {
      validator: function (val) {
        const requiredSizes = ["XS", "S", "M", "L", "XL"];
        return (
          Array.isArray(val) &&
          val.length === requiredSizes.length &&
          requiredSizes.every((size) => val.includes(size))
        );
      },
      message: "Size must include all of: XS, S, M, L, XL",
    },
  },
});


// 2. Add pre-save hook to calculate discounted price
ProductsShema.pre("save", function (next) {
  if (this.solde && this.oldprice) {
    const discount = (this.oldprice * this.solde) / 100;
    this.newPrice = Math.round((this.oldprice - discount) * 100) / 100; // round to 2 decimal places
  } else {
    this.newPrice = 0;
  }
  next();
}

);

// 3. Export the model (correctly)

module.exports = mongoose.model("products",ProductsShema);
