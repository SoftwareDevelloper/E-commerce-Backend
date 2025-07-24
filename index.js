const port = process.env.PORT || 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const passport = require('passport');
const session = require('express-session');
const authRoutes = require('./routes/auth');
require('./Config/passport'); 
const Users = require("./Model/Users");
const products = require("./Model/Product");
const Orders =  require('./Model/Order');
const Order = require("./Model/Order");
const { measureMemory } = require("vm");
const Stripe = require("stripe");
const stripe = Stripe('sk_test_51RoCVCGar6ByhFT12p7py1neP4su4DT3ELNvskt7SHl9wRwAsYipJp7aljEFQ9EihAMuyQzsQBiTtDiA37ZGjdNo00qKsUO2na');
app.use(express.json());
app.use(cors());
app.use(
  session({
    secret: "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",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
mongoose.connect("mongodb+srv://ecommerce:hopehorizonEcommerce@cluster0.670b7.mongodb.net/ecommerce",{
  
}).then(()=>{
    console.log("MongoDB connected successfully");
}).catch((error)=>{
    console.error("Error connecting to MongoDB :" , error)
});
app.use("/auth", authRoutes);

app.get("/" ,(req,res) =>{
    res.send("Express App is running")
});

const storage = multer.diskStorage({
  destination: "./upload/images",
  filename: (req, file, cb) => {
    cb(
      null,
      `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({ storage });

app.use("/images", express.static("upload/images"));

// Upload multiple images at once (field name: images)
app.post("/upload-multiple", upload.array("images", 6), (req, res) => {
  if (!req.files) {
    return res
      .status(400)
      .json({ success: false, message: "No files uploaded" });
  }
  const image_urls = req.files.map(
    (file) => `http://localhost:${port}/images/${file.filename}`
  );
  res.json({ success: true, image_urls });
});

// Add product
app.post('/addProduct', async (req, res) => {
    try {
        const productList = await products.find({});
        let id;
        if (productList.length > 0) {
            let lastProduct = productList[productList.length - 1];
            id = lastProduct.id + 1;
        } else {
            id = 1;
        }
        const produit = new products({
          id: id,
          name: req.body.name,
          description:req.body.description,
          image: req.body.image,
          image1: req.body.image1,
          image2: req.body.image2,
          image3: req.body.image3,
          image4: req.body.image4,
          image5: req.body.image5,
          category: req.body.category,
          color:req.body.color,
          oldprice: req.body.oldprice,
          available:req.body.available,
          solde: req.body.solde,
          // newPrice will be auto-calculated if using pre-save hook
        });
        await produit.save();
        console.log("Product saved:", produit);

        res.json({
            success: true,
            product: produit
        });
    } catch (err) {
        console.error("Error saving product:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// remove product
app.post('/removeProduct',async (req,res) => {
    await products.findOneAndDelete({id: req.body.id});
    console.log('removed');
    res.json({
        success:true,
        name:req.body.name,
    })
})
app.get('/NewCollections' , async(req,res) =>{
    let product = await products.find({});
    let newCollection = product.slice(1).slice(-7);
    console.log("New Collection is Fetched");
    res.send(newCollection);
})
// fetch all product
app.get('/allProducts' , async (req,res) =>{
    let product = await products.find({});
    console.log("All product Fetched");
    res.send(product);
} )
app.get('/bestSellers', async (req, res) => {
    let product = await products.find({});
    let BSP = product.slice(1).slice(-4);
    console.log("Best Sellers Product is Fetched");
    res.send(BSP);
});



//register
app.post('/register',async(req,res)=>{
    let check = await Users.findOne({
        email:req.body.email
    })
    if(check){
        return res.status(400).json({success:false,errors:"existing user found with the same email address"})
    }
    let cart = {}
    for (let i =0 ; i<300; i++)
    {
        cart[i]=0;
    }
    const user = new Users({
        name:req.body.username,
        email:req.body.email,
        password:req.body.password,
        cartData:{},
    })
    await user.save();
    const data = {
        user :{
            id: user.id
        }
    }
    const token = jwt.sign(data,'secret_ecomm');
    res.json({success:true,token})
})


//login
app.post('/Login',async (req,res) =>{
    let user = await Users.findOne({email:req.body.email});
    if(user){
        const passCompare = req.body.password ===user.password;
        if(passCompare){
            const data ={
                user:{
                    id:user.id
                }
            }
            const token = jwt.sign(data,'secret_ecomm');
            res.json({success:true,token})
        }
        else{
            res.json({
                success:false,
                errors:"Wrong Password"
            })
        }
    }
    else{
        res.json({
            success:false,
            errors:"Wrong Email id"
        })
    }
})
//creating middlware to fetch user

const fetchUser = async (req, res, next) => {
  const authHeader = req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer")) {
    return res
      .status(401)
      .send({ errors: "Please authenticate using a valid token" });
  }

  const token = authHeader.split(" ")[1]; // extract token part

  try {
    const data = jwt.verify(token, "secret_ecomm");
    req.user = data.user;
    next();
  } catch (error) {
    res.status(401).send({ errors: "Please authenticate using a valid token" });
  }
};

// create order route
app.post("/createOrder",fetchUser,async(req,res)=>{
    try {
        const{
            items,
            totalAmount,
            billingDetails,
            paymentMethod,
            paymentIntentId,
        }= req.body
        // use authenticated userId
        const userId =  req.user.id;
        if (paymentMethod === "stripe") 
        {
            const paymentIntent = await stripe.paymentIntents.retrieve(
              paymentIntentId
            );
        //if (paymentIntent.status !== "succeeded") {
        //    return res.status(400).json({success:false,message:"Payment is failed"})
        //}
    }
    const newOrder = new Order({
      userId,
      items,
      totalAmount,
      billingDetails,
      paymentMethod,
      paymentIntentId,
      paymentStatus: paymentMethod === "stripe" ? "succeeded" : "pending",
    });
    const savedOrder = await newOrder.save();
    res.status(201).json({success:true,order:savedOrder});
    } catch (err) {
        res.status(500).json({success:false,message:err.message})
    }
});
// create payment intent
app.post("/createPaymentIntent",fetchUser,async(req,res)=>{
    try {
        const{totalAmount} = req.body;
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(totalAmount * 100),
          currency: "usd",
          payment_method_types: ["card"],
        });
        res
          .status(200)
          .json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
          });
    } catch (error) {
        res.status(500).json({error:error.message});
    }
});
//creating endpint for adding products in cartdata
app.post('/Addtocart', fetchUser, async (req, res) => {
    const { itemId } = req.body;

    if (!itemId) {
        return res.status(400).json({ success: false, error: 'Item ID is required' });
    }
    try {
        const user = await Users.findOne({ _id: req.user.id });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        if (!user.cartData) {
            user.cartData = {};
        }
        if (!user.cartData[itemId]) {
            user.cartData[itemId] = 0;
        }
        user.cartData[itemId] += 1;
        await Users.findOneAndUpdate(
            { _id: req.user.id },
            { cartData: user.cartData }
        );

        res.json({ success: true, message: 'Item added to cart' });
    } catch (error) {
        console.error("Error adding item to cart:", error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});


// create endpoind for fetch cart data into the cart page
app.get('/getCart', fetchUser, async (req, res) => {
    try {
        const userData = await Users.findOne({ _id:req.user.id});

        if (!userData || !userData.cartData) {
            return res.status(200).json({ success: true, cart: [] }); 
        }

        const cartData = userData.cartData;

        const cartItems = [];
        for (const itemId in cartData) {
            if (cartData[itemId] > 0) {
                const product = await products.findOne({ id: parseInt(itemId) });
                if (product) {
                    cartItems.push({
                        ...product._doc, 
                        quantity: cartData[itemId], 
                    });
                }
            }
        }

        res.json({ success: true, cart: cartItems });
    } catch (error) {
        console.error("Error fetching cart:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

// create endpoint for remove item from cart data
app.post('/RemoveFromCart', fetchUser, async (req, res) => {
    const { itemId } = req.body;

    if (!itemId) {
        return res.status(400).json({ success: false, error: 'Item ID is required' });
    }
    try {
        const user = await Users.findOne({ _id: req.user.id });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        if (!user.cartData) {
            user.cartData = {};
        }
        if (!user.cartData[itemId]) {
            user.cartData[itemId] = 0;
        }
        user.cartData[itemId] -= 1;
        await Users.findOneAndUpdate(
            { _id: req.user.id },
            { cartData: user.cartData }
        );

        res.json({ success: true, message: 'Item Removed from cart' });
    } catch (error) {
        console.error("Error Removed item from cart:", error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// create endpoint for Add an item to the wishlist 
app.post('/Addtowishlist', fetchUser, async (req, res) => {
    const { itemId } = req.body;

    if (!itemId) {
        return res.status(400).json({ success: false, error: 'Item ID is required' });
    }
    try {
        const user = await Users.findOne({ _id: req.user.id });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        if (!user.WishlistData) {
            user.WishlistData = {};
        }
        if (!user.WishlistData[itemId]) {
            user.WishlistData[itemId] = 0;
        }
        user.WishlistData[itemId] += 1;
        await Users.findOneAndUpdate(
            { _id: req.user.id },
            { WishlistData: user.WishlistData}
        );

        res.json({ success: true, message: 'Item added to Wishlist' });
    } catch (error) {
        console.error("Error adding item to  Wishlist:", error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
// create endpoint  for get item from wishlist
app.get('/getFromWishlist', fetchUser, async (req, res) => {
    try {
        const userData = await Users.findOne({ _id:req.user.id});

        if (!userData || !userData.WishlistData) {
            return res.status(200).json({ success: true, Wishlist: [] }); 
        }

        const WishlistData = userData.WishlistData;

        const WishlistItems = [];
        for (const itemId in WishlistData) {
            if (WishlistData[itemId] > 0) {
                const product = await products.findOne({ id: parseInt(itemId) });
                if (product) {
                    WishlistItems.push({
                        ...product._doc, 
                    });
                }
            }
        }

        res.json({ success: true, Wishlist: WishlistItems });
    } catch (error) {
        console.error("Error fetching Wishlist:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
}); 
//create endpoint for remove item from the wishlist
app.post('/RemoveFromWishlist', fetchUser, async (req, res) => {
    const { itemId } = req.body;

    if (!itemId) {
        return res.status(400).json({ success: false, error: 'Item ID is required' });
    }
    try {
        const user = await Users.findOne({ _id: req.user.id });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
       
        user.WishlistData[itemId] -= 1;
        await Users.findOneAndUpdate(
            { _id: req.user.id },
            { WishlistData: user.WishlistData }
        );

        res.json({ success: true, message: 'Item Removed from wishlist' });
    } catch (error) {
        console.error("Error Removed item from wishlist:", error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});
//create an endpoint for get all products by it's category
app.get('/Category/:category', async (req, res) => {
    try {
      const { category } = req.params;
      console.log('Requested category:', category); 
      const all_product = await products.find({ category });
      console.log('Fetched products:', all_product); 
      res.status(200).json(all_product);
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ errors: "Failed to fetch products" });
    }
  });





  

app.listen(port,(error)=>{
    if(!error){
        console.log("Server Running on Port " + port)
    }else{
        console.log("Error:"+error)
    }
});

    