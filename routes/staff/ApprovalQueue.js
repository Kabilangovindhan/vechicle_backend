const express = require("express");
const router = express.Router();

const Estimate = require("../../models/estimate");
const Job = require("../../models/job");
const UserModel = require("../../models/user");



// ============================================
// GET WAITING APPROVAL JOBS
// /api/jobManagement/approvalQueue
// ============================================
router.get("/approvalQueue", async (req, res) => {


    try {

        const jobs = await Job.find({
            jobStatus: "Waiting Approval"
        })
            .populate({
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
            })
            .sort({ createdAt: -1 });


        res.json(jobs);

    }
    catch (err) {

        console.log("show error", err);

        res.status(500).json({
            message: "Failed to fetch approval queue"
        });

    }

});

module.exports = router;