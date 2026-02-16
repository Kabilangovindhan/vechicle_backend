const express = require("express");
const router = express.Router();
const VehicleModel = require("../../models/vehicle");
// Get vehicle for Vechile Master

router.get("/getvehicle", async (req, res) => {

    try {
        const users = await VehicleModel.find();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ------------------------------------------------------------------------------------------------------------------------

// Create vehicle for Vechile Master

router.post("/createvehicle", async (req, res) => {



    try {
        const newUser = await VehicleModel.create(req.body);
        res.json(newUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});


// ------------------------------------------------------------------------------------------------------------------------

// Delete vehicle for Vechile Master

router.delete("/deletevehicle/:id", async (req, res) => {

    try {
        await VehicleModel.findByIdAndDelete(req.params.id);
        res.json({ message: "Deleted" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });

    }
});

// ------------------------------------------------------------------------------------------------------------------------

// Create vehicle for Vechile Master

router.post("/createnewvehicle", async (req, res) => {

    try {
        const newUser = await VehicleModel.create(req.body);
        res.json(newUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ------------------------------------------------------------------------------------------------------------------------

// Update vehicle for Vechile Master

router.put("/updatevehicle/:id", async (req, res) => {

    try {
        const updated = await VehicleModel.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
