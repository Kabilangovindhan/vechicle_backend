const express = require("express");
const router = express.Router();
const mongoose = require("mongoose"); // ✅ IMPORTANT (You forgot this)

const Feedback = require("../../models/feedback");
const Job = require("../../models/job");

// =======================================
// GET FEEDBACK FOR STAFF (ONLY HIS JOBS)
// =======================================
router.get("/staff/:staffId", async (req, res) => {
    try {
        const { staffId } = req.params;

        // ✅ Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(staffId)) {
            return res.status(400).json({ message: "Invalid Staff ID" });
        }

        // ✅ Find Delivered jobs assigned to this staff
        const jobs = await Job.find({
            assignedStaff: staffId,
            jobStatus: "Delivered"
        }).select("_id");

        const jobIds = jobs.map(job => job._id);

        // ✅ Get feedback for those jobs
        const feedbacks = await Feedback.find({
            job: { $in: jobIds }
        })
            .populate("customer", "name phone")
            .populate({
                path: "job",
                populate: {
                    path: "booking",
                    populate: {
                        path: "vehicle",
                        select: "vehicleNumber"
                    }
                }
            })
            .sort({ createdAt: -1 });

        res.json(feedbacks);

    } catch (error) {
        console.error("Staff Feedback Error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;