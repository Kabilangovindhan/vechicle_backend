const express = require("express");
const router = express.Router();

const Inspection = require("../../models/inspection");
const Estimate = require("../../models/estimate");

// ============================================
// ADMIN - GET ALL INSPECTION + ESTIMATES
// ============================================

router.get("/all-reports", async (req, res) => {

    try {

        const estimates = await Estimate.find()
            .populate({
                path: "job",
                populate: {
                    path: "booking",
                    populate: [
                        {
                            path: "vehicle",
                            select: "vehicleNumber brand model"
                        },
                        {
                            path: "customer",
                            select: "name phone"
                        }
                    ]
                }
            })
            .sort({ createdAt: -1 });

        const result = await Promise.all(
            estimates.map(async (estimate) => {

                const inspection = await Inspection.findOne({
                    job: estimate.job?._id
                });

                return {
                    estimate,
                    inspection
                };
            })
        );

        res.json(result);

    } catch (err) {
        console.log("Admin fetch error", err);
        res.status(500).json({
            message: "Server error"
        });
    }
});

module.exports = router;