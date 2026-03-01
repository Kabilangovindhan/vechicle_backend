const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../../models/user");

// ------------------------------------------------------------------------------------------------------------------------

router.get("/user/:id", async (req, res) => {

    try {

        const id = req.params.id;

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

// ------------------------------------------------------------------------------------------------------------------------

// PUT update profile

router.put("/users/:id", async (req, res) => {

    try {

        const { name, email, phone, password } = req.body;
        let updateData = { name, email, phone };
        if (password && password.trim() !== "") {
            updateData.password = password; 
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.name = name || user.name;
        user.email = email || user.email;
        user.phone = phone || user.phone;
        
        if (password) {
            user.password = password;
        }

        await user.save();
        const updatedUser = user.toObject();
        delete updatedUser.password;
        res.json(updatedUser);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update profile" });
    }
});

// ------------------------------------------------------------------------------------------------------------------------

module.exports = router;