const express = require("express");
const router = express.Router();
const JobModel = require("../../models/job");

// GET all jobs for Job Control Center
router.get("/fetch", async (req, res) => {
    try {

        const jobs = await JobModel.find()
            .populate({
                path: "booking",
                populate: [
                    {
                        path: "customer",
                        select: "name phone"
                    },
                    {
                        path: "vehicle",
                        select: "vehicleNumber brand model"
                    }
                ]
            })
            .populate("assignedStaff", "name phone")
            .sort({ createdAt: -1 });

        res.json(jobs);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            message: "Failed to fetch jobs"
        });

    }
});

module.exports = router;
