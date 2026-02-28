const express = require("express");
const router = express.Router();

const Job = require("../../models/job");
const Invoice = require("../../models/invoice");

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
// ==========================================
// ADMIN - GET PARTICULAR JOB ESTIMATE FOR BILLING
// ==========================================
const Estimate = require("../../models/estimate");

router.get("/invoice/:jobId", async (req, res) => {
    try {

        const estimate = await Estimate.findOne({
            job: req.params.jobId,
            approvalStatus: "Approved"
        }).populate({
            path: "job",
            populate: {
                path: "booking",
                populate: [
                    { path: "vehicle", select: "vehicleNumber brand model" },
                    { path: "customer", select: "name phone email" }
                ]
            }
        });

        if (!estimate) {
            return res.status(404).json({ message: "Approved estimate not found" });
        }

        res.json(estimate);

    } catch (err) {
        console.log("Invoice fetch error", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ==========================================
// ADMIN - UPDATE ESTIMATE (SAVE CHANGES)
// ==========================================
router.put("/invoice/update/:estimateId", async (req, res) => {
    try {
        const { items } = req.body;

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ message: "Invalid items data" });
        }

        // Recalculate totals securely on server
        const updatedItems = items.map(item => {
            const labour = Number(item.labourCharge) || 0;
            const parts = Number(item.partsCost) || 0;

            return {
                ...item,
                labourCharge: labour,
                partsCost: parts,
                total: labour + parts
            };
        });

        const subTotal = updatedItems.reduce((acc, curr) => acc + curr.total, 0);
        const tax = Math.round(subTotal * 0.18);
        const grandTotal = subTotal + tax;

        const updatedEstimate = await Estimate.findByIdAndUpdate(
            req.params.estimateId,
            {
                items: updatedItems,
                tax,
                grandTotal
            },
            { new: true }
        );

        if (!updatedEstimate) {
            return res.status(404).json({ message: "Estimate not found" });
        }

        res.json(updatedEstimate);

    } catch (err) {
        console.log("Update error:", err);
        res.status(500).json({ message: "Server error while updating estimate" });
    }
});

// ==========================================
// ADMIN - CONFIRM & GENERATE FINAL BILL
// ==========================================
router.post("/confirm-bill", async (req, res) => {
    try {
        const { jobId, estimateId, tax, grandTotal, paymentMethod } = req.body;

        // 1. Create the new Invoice record
        const newInvoice = new Invoice({
            job: jobId,
            estimate: estimateId,
            gst: tax,
            grandTotal: grandTotal,
            paymentStatus: "Paid", // Assuming payment is collected at billing
            paymentMethod: paymentMethod || "Cash" 
        });

        await newInvoice.save();

        // 2. Update the Job status so it's removed from the "Pending Billing" queue
        await Job.findByIdAndUpdate(jobId, { 
            jobStatus: "Completed" 
        });

        res.status(201).json({ 
            success: true, 
            message: "Invoice generated and job completed",
            invoice: newInvoice 
        });

    } catch (err) {
        console.error("Billing Error:", err);
        res.status(500).json({ message: "Failed to finalize billing" });
    }
});
module.exports = router;