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

        console.log("Received phone:", phone);

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

module.exports = router;