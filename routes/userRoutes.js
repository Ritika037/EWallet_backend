const express = require("express");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/userModal");
const { protect, admin } = require("../middleware/authMiddleware");

const router = express.Router();

// Register new user
const register = asyncHandler(async (req, res) => {
   const {
      name,
      email,
      phone,
      password,
      address,
      identificationType,
      balance,
      moneyReceived,
      moneySend,
      requestReceived,
   } = req.body;
   // console.log(req.body);
   if (
      !name ||
      !email ||
      !password ||
      !phone ||
      !address ||
      !identificationType
   ) {
      res.status(400);
      throw new Error("Please add all fields");
   }

   const userExists = await User.findOne({
      email,
   });

   if (userExists) {
      res.status(400);
      throw new Error("User already exists");
   }

   const salt = await bcrypt.genSalt(10);
   const hashedPassword = await bcrypt.hash(password, salt);

   const user = await User.create({
      name,
      email,
      balance,
      password: hashedPassword,
      phone,
      address,
      identificationType,
      moneySend,
      moneyReceived,
      requestReceived,
      identificationNumber: crypto.randomBytes(6).toString("hex"),
      isAdmin: false,
      isVerified: true,
   });

   if (user) {
      res.status(201).json({
         _id: user.id,
         name: user.name,
         balance: user.balance,
         email: user.email,
         phone: user.phone,
         address: user.address,
         moneySend: user.moneySend,
         moneyReceived: user.moneyReceived,
         requestReceived: user.requestReceived,
         identificationType: user.identificationType,
         identificationNumber: user.identificationNumber,
         isAdmin: user.isAdmin,
         isVerified: user.isVerified,
         token: generateToken(user._id),
      });
   } else {
      res.status(400);
      throw new Error("Invalid user data");
   }
});

// Login user
const login = asyncHandler(async (req, res) => {
   const { email, password } = req.body;
// console.log(req.body)
   const user = await User.findOne({
      email,
   });

   if (user && (await bcrypt.compare(password, user.password))) {
      var userObj = user.toObject();
      delete userObj.password;
      res.status(200).json({
         ...userObj,
         token: generateToken(user._id),
         msg: "User Logged In Success",
      });
   } else {
      res.status(401);
      throw new Error("Invalid credentials");
   }
});

// Get current user
const currentUser = asyncHandler(async (req, res) => {
   // console.log("user fro currentUser - ", req.user)

   res.status(200).json(req.user);
});

// Get all users
const getUsers = asyncHandler(async (req, res) => {
   // console.log("data from all users : -",req.user)
   const users = await User.find();
   let newUsers = users.filter((user) => {
      return user._id.toString() !== req.user._id.toString();
   });

   if (newUsers) {
      res.status(200).json(newUsers);
   } else {
      res.status(404);
      throw new Error("User not found");
   }
});

// Verify user
const verify = asyncHandler(async (req, res) => {
   const user = await User.findByIdAndUpdate(
      req.params.id,
      {
         isVerified: req.body.isVerified,
      },
      {
         new: true,
      }
   );
   if (user) {
      res.status(201).json({
         _id: user._id,
         name: user.name,
         isVerified: user.isVerified,
      });
   } else {
      res.status(404);
      throw new Error("User not found");
   }
});

// Get uploaded image
const getImage = asyncHandler(async (req, res) => {
   const user = await User.findById(req.user._id);
   if (user.image) {
      res.status(201).json(user.image);
   } else {
      res.status(404);
      throw new Error("No user image");
   }
});

const generateToken = (id) => {
   return jwt.sign(
      {
         id,
      },
      process.env.JWT_SECRET,
      {
         expiresIn: "30d",
      }
   );
};

const deposit = asyncHandler(async (req, res) => {
   const { amount, source, accountNumber, ifscCode, cardNumber, chequeNumber } =
      req.body;
   const user = await User.findById(req.user._id);
   console.log(req.body);
   if (!user) {
      res.status(400);
      throw new Error("User not found");
   }

   // Create a deposit log object
   let depositLog;

   switch (source) {
      case "bankTransfer":
         depositLog = {
            amount,
            source,
            accountNumber,
            ifscCode,
            timestamp: new Date(),
         };
         break;
      case "card":
         depositLog = {
            amount,
            source,
            cardNumber,
            timestamp: new Date(),
         };
         break;
      case "cheque":
         depositLog = {
            amount,
            source,
            chequeNumber,
            timestamp: new Date(),
         };
         break;
      default:
         depositLog = {
            amount,
            source: "Bank transfer", // Default to bank transfer if no source provided
            accountNumber,
            timestamp: new Date(),
         };
         break;
   }

   try {
      // Push the deposit log object into the deposits array of the user
      user.deposits.push(depositLog);
      await user.save();

      // Proceed with the deposit by updating the user's balance and moneyReceived field
      user.balance += Number(amount);
      user.moneyReceived += Number(amount);
      await user.save();

      res.status(200).json({ msg: `$${amount} added to your account` });
   } catch (error) {
      // Handle any errors that occur while saving the deposit log
      console.error("Error saving deposit log:", error);
      res.status(500).json({ msg: "Internal Server Error" });
   }
});

const getUserById = asyncHandler(async (req, res) => {
   const user = await User.findById(req.params.id);
  
   if (user) {
      res.status(200).json(user);
   } else {
      res.status(404);
      throw new Error("User not found");
   }
});

// Define routes
router.route("/deposit").post(protect, deposit);
router.route("/register").post(asyncHandler(register));
router.route("/login").post(asyncHandler(login));
router.route("/current_user").get(protect, asyncHandler(currentUser));
router.route("/get_users").get(protect, asyncHandler(getUsers));
router.route("/verify/:id").put(protect, admin, asyncHandler(verify));
router.route("/:id").get(asyncHandler(getUserById));
router.route("/get_image").get(protect, asyncHandler(getImage));

module.exports = router;
