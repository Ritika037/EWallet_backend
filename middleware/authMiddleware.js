const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const User = require("../models/userModal");
require("dotenv").config();

const protect = asyncHandler(async (req, res, next) => {
   const token = req.headers.authorization?.split(" ")[1];

   if (token) {
      try {
         const decoded = jwt.verify(token, process.env.JWT_SECRET);
         req.user = await User.findById(decoded.id).select("-password");
        //  console.log("req user in auth middleware", req.user);
         // Check if user is found
         if (!req.user) {
            res.status(404);
            throw new Error("User not found");
         }
         next();
      } catch (error) {
         console.error(error);
         res.status(401);
         throw new Error("Not authorized, invalid token");
      }
   }

   if (!token) {
      res.status(401);
      throw new Error("Not authorized, no token provided");
   }
});

const admin = (req, res, next) => {
   // Check if user is an admin
   if (req.user && req.user.isAdmin) {
      next();
   } else {
      // If user is not an admin, return 401 Unauthorized
      res.status(401);
      throw new Error("Not authorized as an admin");
   }
};

module.exports = { protect, admin };
