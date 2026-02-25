const express = require("express");
const router = express.Router();

const Job = require("../../models/job");
const Estimate = require("../../models/estimate");

// GET ONLY WAITING APPROVAL JOBS
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

        // attach estimate status
        const result = await Promise.all(

            jobs.map(async (job) => {

                const estimate = await Estimate.findOne({
                    job: job._id
                });

                return {
                    ...job.toObject(),
                    estimateStatus: estimate?.approvalStatus || "Pending"
                };

            })

        );

        res.json(result);

    }
    catch (err) {

        console.log(err);

        res.status(500).json({
            message: "Failed to fetch approval queue"
        });

    }

});


// START WORK ROUTE
// START WORK ROUTE
router.put("/startWork/:jobId", async (req, res) => {
    try {
        const jobId = req.params.jobId;

        // 1. Verify if an approved estimate exists for this job
        const estimate = await Estimate.findOne({ job: jobId });

        if (!estimate || estimate.approvalStatus !== "Approved") {
            return res.status(400).json({
                message: "Work cannot start. Customer has not approved the estimate."
            });
        }

        // 2. Proceed with starting work
        await Job.findByIdAndUpdate(
            jobId,
            {
                jobStatus: "Working",
                startTime: new Date()
            }
        );

        res.json({ message: "Work started successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
module.exports = router;