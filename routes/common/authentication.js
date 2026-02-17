const express = require("express");
const router = express.Router();
const UserModel = require("../../models/user");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// ------------------------------------------------------------------------------------------------------------------------

// Register user from login menu

router.post("/register", async (req, res) => {

    try {

        const { fullName, email, phone, password } = req.body;

        const existingUser = await UserModel.findOne({ phone });
        if (existingUser) {
            return res.status(400).json({
                message: "Phone number already registered"
            });
        }

        const newUser = await UserModel.create({
            name: fullName, email,
            phone, password,
            role: "customer"
        });

        res.json({
            success: true,
            message: "Registration Successful",
            user: newUser
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Registration Failed",
            error: error.message
        });

    }

});

// ------------------------------------------------------------------------------------------------------------------------

// Login user from login menu

router.post("/login", async (req, res) => {

    try {

        const { phone, password } = req.body;

        const user = await UserModel.findOne({ phone });

        if (!user) { return res.status(400).json({ message: "User not found" }) }

        const isMatch = password === user.password;

        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            {
                id: user._id,
                phone: user.phone,
                role: user.role
            },
            process.env.JWT_SECRET || "secretkey",
            { expiresIn: "1d" }
        );

        res.json({
            token,
            user: {
                name: user.name,
                phone: user.phone,
                role: user.role
            }
        });

    } catch (error) {
        console.log('Error during login : ', error.message)
        res.status(500).json({ message: "Login Failed" });
    }
});

// ------------------------------------------------------------------------------------------------------------------------

module.exports = router;