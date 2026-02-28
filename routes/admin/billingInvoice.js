const express = require("express");
const router = express.Router();
const Job = require("../../models/job");
const Estimate = require("../../models/estimate");
const Invoice = require("../../models/invoice");

// 1. Fetch Queue (Jobs ready for billing)
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
            .sort({ updatedAt: 1 });
        res.json(jobs);
    } catch (err) {
        res.status(500).json({ message: "Error fetching billing data" });
    }
});

// 2. Get specific approved estimate
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
        if (!estimate) return res.status(404).json({ message: "Approved estimate not found" });
        res.json(estimate);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// 3. Update estimate charges
router.put("/invoice/update/:estimateId", async (req, res) => {
    try {
        const { items } = req.body;
        const updatedItems = items.map(item => {
            const labour = Number(item.labourCharge) || 0;
            const parts = Number(item.partsCost) || 0;
            return { ...item, labourCharge: labour, partsCost: parts, total: labour + parts };
        });
        const subTotal = updatedItems.reduce((acc, curr) => acc + curr.total, 0);
        const tax = Math.round(subTotal * 0.18);
        const grandTotal = subTotal + tax;

        const updatedEstimate = await Estimate.findByIdAndUpdate(
            req.params.estimateId,
            { items: updatedItems, tax, grandTotal },
            { new: true }
        );
        res.json(updatedEstimate);
    } catch (err) {
        res.status(500).json({ message: "Server error while updating estimate" });
    }
});

// 4. Confirm Bill (Saves to DB as Pending)
router.post("/confirm-bill", async (req, res) => {
    try {
        const { jobId, estimateId, tax, grandTotal } = req.body;

        const newInvoice = new Invoice({
            job: jobId,
            estimate: estimateId,
            gst: tax,
            grandTotal: grandTotal,
            paymentStatus: "Pending" // Set to pending until customer pays
        });
        await newInvoice.save();

        // Update Job to "Billed" status
        await Job.findByIdAndUpdate(jobId, { jobStatus: "Billed" });

        res.status(201).json({ success: true, message: "Invoice created" });
    } catch (err) {
        res.status(500).json({ message: "Failed to finalize billing" });
    }
});

module.exports = router;