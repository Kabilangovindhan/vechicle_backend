const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../../models/user");

// ======================================
// GET STAFF PROFILE
// ======================================
router.get("/staff/:id", async (req, res) => {
    try {
        const id = req.params.id;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid staff id" });
        }

        const staff = await User.findOne({ _id: id, role: "staff" }).select("-password");

        if (!staff) {
            return res.status(404).json({ message: "Staff not found" });
        }

        res.json(staff);

    } catch (err) {
        console.error("Staff Fetch Error:", err);
        res.status(500).json({ message: "Server error" });
    }
});


// ======================================
// UPDATE STAFF PROFILE
// ======================================
router.put("/staff/:id", async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        const staff = await User.findOne({ _id: req.params.id, role: "staff" });

        if (!staff) {
            return res.status(404).json({ message: "Staff not found" });
        }

        staff.name = name || staff.name;
        staff.email = email || staff.email;
        staff.phone = phone || staff.phone;

        if (password && password.trim() !== "") {
            staff.password = password; // will hash if you add pre-save hook
        }

        await staff.save();

        const updatedStaff = staff.toObject();
        delete updatedStaff.password;

        res.json(updatedStaff);

    } catch (err) {
        console.error("Staff Update Error:", err);
        res.status(500).json({ message: "Failed to update staff profile" });
    }
});

module.exports = router;