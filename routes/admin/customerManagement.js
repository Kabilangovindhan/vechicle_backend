const express = require("express");
const router = express.Router();
const UserModel = require("../../models/user");

// ------------------------------------------------------------------------------------------------------------------------

// Get all users for User Management

router.get("/fetchUsers", async (req, res) => {

    try {
        const users = await UserModel.find().sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ------------------------------------------------------------------------------------------------------------------------

// Create users for User Management

router.post("/createUser", async (req, res) => {

    try {
        const newUser = await UserModel.create(req.body);
        res.json(newUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ------------------------------------------------------------------------------------------------------------------------

// Update users for User Management

router.put("/updateUser/:id", async (req, res) => {

    try {
        const updatedUser = await UserModel.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(updatedUser);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ------------------------------------------------------------------------------------------------------------------------

// Delete users for User Management

router.delete("/deleteUser/:id", async (req, res) => {

    try {
        await UserModel.findByIdAndDelete(req.params.id);
        res.json({ message: "User Deleted Successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ------------------------------------------------------------------------------------------------------------------------

module.exports = router;