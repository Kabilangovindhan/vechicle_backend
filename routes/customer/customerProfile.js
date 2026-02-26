const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const User = require("../../models/user");


router.get("/user/:id", async (req, res) => {

    try {

        const id = req.params.id;

        // console.log("Received ID:", id); // DEBUG

        // prevent crash
        if (!id || id === "null" || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid user id"
            });
        }

        const user = await User.findById(id).select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.json(user);

    }
    catch (err) {
        console.error("fetch error:",err);
        res.status(500).json({
            message: "Server error"
        });
    }

});


// PUT update profile
// PUT update profile
router.put("/users/:id", async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        // Create an update object with the basic info
        let updateData = { name, email, phone };

        // If a password was provided, add it to the update object
        if (password && password.trim() !== "") {
            // NOTE: If you have a 'pre-save' hook in your User model for hashing, 
            // findByIdAndUpdate might bypass it depending on your setup.
            // It is safer to use the 'save()' method if you want hooks to run.
            updateData.password = password; 
        }

        // To ensure password hashing works correctly with findByIdAndUpdate, 
        // most developers use a manual hash here or use user.save()
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Apply changes
        user.name = name || user.name;
        user.email = email || user.email;
        user.phone = phone || user.phone;
        
        if (password) {
            user.password = password; // The .pre('save') hook in your model will hash this
        }

        await user.save();

        // Convert to object and remove password before sending back
        const updatedUser = user.toObject();
        delete updatedUser.password;

        res.json(updatedUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update profile" });
    }
});
module.exports = router;