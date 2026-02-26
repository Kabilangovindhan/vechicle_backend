const express = require("express");
const router = express.Router();

const User = require("../../models/user");
const Inspection = require("../../models/inspection");
const Estimate = require("../../models/estimate");

// GET inspection + estimate by customer phone
router.get("/:phone", async (req, res) => {
    try {
        const phone = req.params.phone;

        // find customer
        const customer = await User.findOne({ phone });

        if (!customer) {
            return res.status(404).json({
                message: "Customer not found"
            });
        }

        // get estimates with full job info
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

        // filter only customer's jobs
        const filtered = estimates.filter(
            (est) => est.job && est.job.booking
        );

        // attach inspection data
        const result = await Promise.all(
            filtered.map(async (estimate) => {

                const inspection = await Inspection.findOne({
                    job: estimate.job._id
                });

                return {
                    estimate,
                    inspection
                };
            })
        );

        res.json(result);

    } catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Server error"
        });
    }
});

module.exports = router;