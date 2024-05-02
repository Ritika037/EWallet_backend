const express = require("express");
const asyncHandler = require("express-async-handler");
const User = require("../models/userModal");
const Transaction = require("../models/transactionModal");
const crypto = require("crypto");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Transfer money
const transferAmount = asyncHandler(async (req, res) => {
   const { amount, receiver, transactionType, reference } = req.body;
   const receiverUser = await User.findById(receiver);
   const senderUser = await User.findById(req.user._id);

   if (
      !receiverUser ||
      !senderUser ||
      !senderUser.isVerified ||
      !receiverUser.isVerified
   ) {
      res.status(400);
      throw new Error("Sender or receiver not verified or not found");
   }

   if (!amount || !receiver || !transactionType || !reference) {
      res.status(400);
      throw new Error("Please include all fields");
   }

   const transactionId = crypto.randomBytes(5).toString("hex");

   const transfer = await Transaction.create({
      amount,
      sender: senderUser._id,
      receiver,
      transactionType,
      reference,
      transactionId,
   });

   // Update sender's balance and moneySend field
   senderUser.balance -= amount;
   senderUser.moneySend += Number(amount);
   await senderUser.save();

   // Update receiver's balance and moneyReceived field
   receiverUser.balance += Number(amount);
   receiverUser.moneyReceived += Number(amount);
   await receiverUser.save();

   res.status(201).json({
      _id: transfer._id,
      amount: transfer.amount,
      sender: transfer.sender,
      receiver: transfer.receiver,
      transactionType: transfer.transactionType,
      reference: transfer.reference,
      transactionId,
   });
});

// Verify receiver
const verifyReceiver = asyncHandler(async (req, res) => {
   const user = await User.findById(req.body.receiver);

   if (user) {
      res.status(200).json(user);
   } else {
      res.status(404);
      throw new Error("Receiver not found");
   }
});

// Get all transactions from a user
const getTransactions = asyncHandler(async (req, res) => {
   const { id } = req.params;
   const transactions = await Transaction.find({
      $or: [{ sender: id }, { receiver: id }],
   })
      .sort({ createdAt: -1 })
      .populate([
         { path: "sender", select: "name image" },
         { path: "receiver", select: "name image" },
      ]);

   res.status(200).send(transactions);
});

// Get transactions where money was sent by the user
const getMoneySendTransactions = asyncHandler(async (req, res) => {
   const transactions = await Transaction.find({ sender: req.user._id })
      .sort({ createdAt: -1 })
      .populate([
         { path: "sender", select: "name image" },
         { path: "receiver", select: "name image" },
      ]);

   res.status(200).send(transactions);
});

// Get transactions where money was received by the user
const getMoneyReceiveTransactions = asyncHandler(async (req, res) => {
   const transactions = await Transaction.find({ receiver: req.user._id })
      .sort({ createdAt: -1 })
      .populate([
         { path: "sender", select: "name image" },
         { path: "receiver", select: "name image" },
      ]);

   res.status(200).send(transactions);
});

// Deposit money

const deposit = asyncHandler(async (req, res) => {
   const { amount, source, accountNumber } = req.body;
   const user = await User.findById(req.user._id);

   if (!user) {
      res.status(400);
      throw new Error("User not found");
   }

   // Create a deposit log object
   const depositLog = {
      amount,
      source: source || "Bank transfer",
      accountNumber,
      timestamp: new Date(),
   };

   try {
      // Push the deposit log object into the deposits array of the user
      user.deposits.push(depositLog);
      await user.save();
   } catch (error) {
      // Handle any errors that occur while saving the deposit log
      console.error("Error saving deposit log:", error);
      // You can choose to respond with an error or continue with the deposit process
   }

   // Proceed with the deposit by updating the user's balance and moneyReceived field
   user.balance += Number(amount);
   user.moneyDeposited += Number(amount);
   await user.save();

   res.status(200).json({ msg: `$${amount} added to your account` });
});

// Define routes
router.route("/transfer").post(protect, transferAmount);
router.route("/deposit").post(protect, deposit);
router.route("/verify-receiver").post(protect, verifyReceiver);
router.route("/get_money_send").get(protect, getMoneySendTransactions);
router.route("/get_money_receive").get(protect, getMoneyReceiveTransactions);
router.route("/get_transactions/:id").get(protect, getTransactions);

module.exports = router;
