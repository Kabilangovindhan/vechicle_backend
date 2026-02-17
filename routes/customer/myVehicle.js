const express = require("express");
const router = express.Router();
const VehicleModel = require("../../models/vehicle");
const User = require("../../models/user");

// ------------------------------------------------------------------------------------------------------------------------

// GET VEHICLES (ONLY LOGGED USER)

router.get("/getvehicle/:phone", async (req, res) => {

    try {

        const user = await User.findOne({ phone: req.params.phone });

        if (!user)
            return res.status(404).json({ message: "User not found" });

        const vehicles = await VehicleModel.find({ userId: user._id })
            .sort({ createdAt: -1 });

        res.json(vehicles);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ------------------------------------------------------------------------------------------------------------------------

// CREATE VEHICLE

router.post("/createvehicle", async (req, res) => {

    try {

        const { ownerPhone } = req.body;

        const user = await User.findOne({ phone: ownerPhone });

        if (!user)
            return res.status(404).json({ message: "User not found" });

        const newVehicle = await VehicleModel.create({
            ...req.body,
            userId: user._id
        });

        res.json(newVehicle);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ------------------------------------------------------------------------------------------------------------------------

// UPDATE VEHICLE (ONLY OWNER CAN UPDATE)

router.put("/updatevehicle/:id/:phone", async (req, res) => {

    try {

        const user = await User.findOne({ phone: req.params.phone });

        if (!user)
            return res.status(404).json({ message: "User not found" });

        const updated = await VehicleModel.findOneAndUpdate(
            { _id: req.params.id, userId: user._id },
            req.body,
            { new: true }
        );

        if (!updated)
            return res.status(403).json({ message: "Not authorized" });

        res.json(updated);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ------------------------------------------------------------------------------------------------------------------------

// DELETE VEHICLE (ONLY OWNER CAN DELETE)

router.delete("/deletevehicle/:id/:phone", async (req, res) => {

    try {

        const user = await User.findOne({ phone: req.params.phone });

        if (!user)
            return res.status(404).json({ message: "User not found" });

        const deleted = await VehicleModel.findOneAndDelete({
            _id: req.params.id,
            userId: user._id
        });

        if (!deleted)
            return res.status(403).json({ message: "Not authorized" });

        res.json({ message: "Vehicle deleted successfully" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ------------------------------------------------------------------------------------------------------------------------

module.exports = router;