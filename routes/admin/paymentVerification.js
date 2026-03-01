const express = require("express");
const router = express.Router();
const Invoice = require("../../models/invoice");
const Job = require("../../models/job");
const User = require("../../models/user");

// ======================================
// GET ALL INVOICES FOR VERIFICATION
// ======================================
router.get("/invoices/all", async (req, res) => {
    try {
        const invoices = await Invoice.find({})
            .populate({
                path: "job",
                populate: {
                    path: "booking",
                    populate: [
                        {
                            path: "customer",
                            model: "User",
                            select: "name email phone"
                        },
                        {
                            path: "vehicle",
                            select: "vehicleNumber brand model year"
                        }
                    ]
                }
            })
            .sort({ createdAt: -1 });

        res.json(invoices);
    } catch (err) {
        console.log("Error fetching all invoices:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// ======================================
// VERIFY PAYMENT (Admin/Staff only)
// ======================================
router.put("/verify-payment/:invoiceId", async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const { paymentStatus, verifiedBy, verifiedAt, notes } = req.body;

        const invoice = await Invoice.findById(invoiceId);
        
        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }

        // Update invoice status
        invoice.paymentStatus = paymentStatus;
        
        // Add verification metadata (you might want to add these fields to your schema)
        invoice.verifiedBy = verifiedBy;
        invoice.verifiedAt = verifiedAt || new Date();
        invoice.verificationNotes = notes;

        await invoice.save();

        // If payment is verified, update the associated job
        if (paymentStatus === "Paid" && invoice.job) {
            await Job.findByIdAndUpdate(invoice.job, {
                paymentStatus: "Paid",
                paymentVerifiedAt: new Date(),
                paymentVerifiedBy: verifiedBy
            });
        }

        // Return updated invoice with populated data
        const updatedInvoice = await Invoice.findById(invoiceId)
            .populate({
                path: "job",
                populate: {
                    path: "booking",
                    populate: [
                        {
                            path: "customer",
                            model: "User",
                            select: "name email phone"
                        },
                        {
                            path: "vehicle",
                            select: "vehicleNumber brand model year"
                        }
                    ]
                }
            });

        res.json({ 
            message: `Payment ${paymentStatus === 'Paid' ? 'verified' : 'rejected'} successfully`, 
            invoice: updatedInvoice 
        });

    } catch (err) {
        console.log("Error verifying payment:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// ======================================
// GET PAYMENT STATISTICS
// ======================================
router.get("/payment-stats", async (req, res) => {
    try {
        const stats = await Invoice.aggregate([
            {
                $group: {
                    _id: "$paymentStatus",
                    count: { $sum: 1 },
                    totalAmount: { $sum: "$grandTotal" }
                }
            }
        ]);

        const totalInvoices = await Invoice.countDocuments();
        const totalAmount = await Invoice.aggregate([
            { $group: { _id: null, total: { $sum: "$grandTotal" } } }
        ]);

        res.json({
            stats,
            totalInvoices,
            totalAmount: totalAmount[0]?.total || 0
        });
    } catch (err) {
        console.log("Error fetching payment stats:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;