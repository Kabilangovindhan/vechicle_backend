const express = require("express");
const router = express.Router();

const Job = require("../../models/job");

// ==========================================
// ADMIN - FETCH APPROVED ESTIMATES FOR BILLING
// ==========================================

// routes/billing.js (or added to your existing routes)

router.get("/billing-queue", async (req, res) => {
  
    try {
        const jobs = await Job.find({ jobStatus: "Pending Billing" })
            .populate({
                path: "booking",
                populate: [
                    { path: "vehicle", select: "vehicleNumber brand model" },
                    { path: "customer", select: "name phone email" }
                ]
            })
            .sort({ updatedAt: 1 }); // Oldest "Ready" jobs first
        res.json(jobs);
    } catch (err) {
      console.log("print error",err)
        res.status(500).json({ message: "Error fetching billing data" });
    }
});

module.exports = router;