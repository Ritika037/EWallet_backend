const express = require("express");
const { protect, admin } = require("../middleware/authMiddleware");
const router = express.Router();
const asyncHandler = require("express-async-handler");
const cloudinary = require("./cloudinary");
const User = require("../models/userModal");

const uploadImage = asyncHandler(async (req, res) => {
   const { photo } = req.body;
   try {
      const uploadedImage = await cloudinary.uploader.upload(
         photo,
         { folder: "profile", upload_preset: "my_media", use_filename: true },
         function (error, result) {
            if (error) {
               console.log(error);
               throw new Error("Image upload failed"); // Add error handling
            }
            console.log(result);
         }
      );
      const { secure_url } = uploadedImage;
console.log(secure_url)
      const newUser = await User.findByIdAndUpdate(
         req.params.id,
         {
            image: secure_url,
         },
         { new: true }
      );

      // newUser.image = secure_url
      res.status(201).json(newUser);
   } catch (error) {
      res.status(500).json({ error: error.message }); // Send error message in response
   }
});

router.route("/upload/:id").post(protect, admin, uploadImage); // Include protect middleware before uploadImage middleware

module.exports = router;
