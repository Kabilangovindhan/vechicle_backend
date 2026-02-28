const express = require("express");
const router = express.Router();
const Invoice = require("../../models/invoice");
const Job = require("../../models/job");
const Booking = require("../../models/booking");

// ======================================
// GET CUSTOMER INVOICES (ONLY HIS DATA)
// ======================================
router.get("/invoices/:customerId", async (req, res) => {
    try {
        const customerId = req.params.customerId;

        // 1️⃣ Find bookings of this customer
        const bookings = await Booking.find({ customer: customerId });

        const bookingIds = bookings.map(b => b._id);

        // 2️⃣ Find jobs of those bookings
        const jobs = await Job.find({ booking: { $in: bookingIds } });

        const jobIds = jobs.map(j => j._id);

        // 3️⃣ Find invoices of those jobs
        const invoices = await Invoice.find({ job: { $in: jobIds } })
            .populate({
                path: "job",
                populate: {
                    path: "booking",
                    populate: [
                        { path: "vehicle", select: "vehicleNumber brand model" }
                    ]
                }
            })
            .populate("estimate")
            .sort({ createdAt: -1 });

        res.json(invoices);

    } catch (err) {
        console.log("print error:",err)
        res.status(500).json({ message: "Error fetching invoices" });
    }
});

module.exports = router;