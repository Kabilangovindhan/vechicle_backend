const express = require("express");
const router = express.Router();
const Estimate = require("../../models/estimate");
const User = require("../../models/user");
const Inspection = require("../../models/inspection");

// ------------------------------------------------------------------------------------------------------------------------

router.get("/estimate/:phone", async (req, res) => {

    try {

        const phone = req.params.phone;

        const customer = await User.findOne({ phone });

        if (!customer) {
            return res.status(404).json({
                message: "Customer not found"
            });
        }

        const estimates = await Estimate.find()
            .populate({
                path: "job",
                populate: {
                    path: "booking",
                    match: { customer: customer._id },
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

        const filtered = estimates.filter(
            (est) => est.job && est.job.booking
        );

        const result = await Promise.all(
            filtered.map(async (est) => {
                const inspection = await Inspection.findOne({
                    job: est.job._id
                });

                return {
                    ...est.toObject(),
                    inspection
                };
            })
        );

        res.json(result);
    } catch (err) {
        console.log(err);

        res.status(500).json({
            message: "Failed to fetch estimates"
        });
    }
});

// ------------------------------------------------------------------------------------------------------------------------

// APPROVE

router.put("/approve/:id", async (req, res) => {
    await Estimate.findByIdAndUpdate(
        req.params.id,
        { approvalStatus: "Approved" }
    );

    res.json({ message: "Approved" });
});

// ------------------------------------------------------------------------------------------------------------------------

// REJECT

router.put("/reject/:id", async (req, res) => {
    await Estimate.findByIdAndUpdate(
        req.params.id,
        { approvalStatus: "Rejected" }
    );
    res.json({ message: "Rejected" });
});

// ------------------------------------------------------------------------------------------------------------------------

module.exports = router;