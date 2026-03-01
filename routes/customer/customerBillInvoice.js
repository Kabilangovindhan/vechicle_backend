const express = require("express");
const router = express.Router();

const Invoice = require("../../models/invoice");
const Job = require("../../models/job");
const Booking = require("../../models/booking");
const User = require("../../models/user");

// ======================================
// GET CUSTOMER INVOICES USING PHONE
// ======================================

router.get("/invoices/:phone", async (req, res) => {

    try {

        const phone = req.params.phone;

        // 1️⃣ Find customer using phone
        const customer = await User.findOne({ phone });

        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }

        // 2️⃣ Find bookings of this customer
        const bookings = await Booking.find({ customer: customer._id });
        const bookingIds = bookings.map(b => b._id);

        // 3️⃣ Find jobs linked to bookings
        const jobs = await Job.find({ booking: { $in: bookingIds } });
        const jobIds = jobs.map(j => j._id);

        // 4️⃣ Find invoices linked to jobs
        const invoices = await Invoice.find({ job: { $in: jobIds } })
            .populate({
                path: "job",
                populate: {
                    path: "booking",
                    populate: {
                        path: "vehicle",
                        select: "vehicleNumber brand model"
                    }
                }
            })
            .sort({ createdAt: -1 });

        res.json(invoices);

    } catch (err) {
        console.log("Error fetching invoices:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

// ======================================
// PROCESS PAYMENT FOR INVOICE
// ======================================

router.post("/pay/:invoiceId", async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const { paymentMethod, paymentDetails } = req.body;

        // Find the invoice
        const invoice = await Invoice.findById(invoiceId);
        
        if (!invoice) {
            return res.status(404).json({ message: "Invoice not found" });
        }

        if (invoice.paymentStatus === "Paid") {
            return res.status(400).json({ message: "Invoice already paid" });
        }

        // Update invoice with payment details
        invoice.paymentStatus = "Paid";
        invoice.paymentMethod = paymentMethod; // Now receives "Cash", "UPI", or "Card"
        
        // Store minimal payment details if needed (for audit)
        if (paymentMethod === 'UPI' && paymentDetails?.upiId) {
            invoice.paymentReference = paymentDetails.upiId;
        } else if (paymentMethod === 'Card' && paymentDetails?.cardNumber) {
            invoice.paymentReference = `Card ending in ${paymentDetails.cardNumber}`;
        }

        await invoice.save();

        // Optionally update the associated job status
        if (invoice.job) {
            await Job.findByIdAndUpdate(invoice.job, {
                paymentStatus: "Paid"
            });
        }

        // Return updated invoice with populated data
        const updatedInvoice = await Invoice.findById(invoiceId)
            .populate({
                path: "job",
                populate: {
                    path: "booking",
                    populate: {
                        path: "vehicle",
                        select: "vehicleNumber brand model"
                    }
                }
            });

        res.json({ 
            message: "Payment successful", 
            invoice: updatedInvoice 
        });

    } catch (err) {
        console.log("Error processing payment:", err);
        res.status(500).json({ message: "Server Error" });
    }
});

module.exports = router;