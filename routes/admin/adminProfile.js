const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../../models/user");

// ===============================
// GET ADMIN PROFILE
// ===============================
router.get("/admin/:id", async (req, res) => {
    try {
        const id = req.params.id;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid admin id" });
        }

        const admin = await User.findOne({ _id: id, role: "admin" }).select("-password");

        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        res.json(admin);

    } catch (err) {
        console.error("Admin Fetch Error:", err);
        res.status(500).json({ message: "Server error" });
    }
});


// ===============================
// UPDATE ADMIN PROFILE
// ===============================
router.put("/admin/:id", async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        const admin = await User.findOne({ _id: req.params.id, role: "admin" });

        if (!admin) {
            return res.status(404).json({ message: "Admin not found" });
        }

        admin.name = name || admin.name;
        admin.email = email || admin.email;
        admin.phone = phone || admin.phone;

        if (password && password.trim() !== "") {
            admin.password = password; // will hash if you add pre-save hook
        }

        await admin.save();

        const updatedAdmin = admin.toObject();
        delete updatedAdmin.password;

        res.json(updatedAdmin);

    } catch (err) {
        console.error("Admin Update Error:", err);
        res.status(500).json({ message: "Failed to update admin profile" });
    }
});

module.exports = router;