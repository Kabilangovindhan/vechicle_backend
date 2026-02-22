// const express = require("express");
// const router = express.Router();

// const Estimate = require("../../models/estimate");
// const Job = require("../../models/job");
// const Booking = require("../../models/booking");
// const User = require("../../models/user");


// // GET estimates for customer

// router.get("/:phone", async (req, res) => {

//     try {

//         const user = await User.findOne({
//             phone: req.params.phone
//         });

//         if (!user)
//             return res.json([]);

//         // find bookings
//         const bookings = await Booking.find({
//             customer: user._id
//         });

//         const bookingIds = bookings.map(b => b._id);

//         // find jobs
//         const jobs = await Job.find({
//             booking: { $in: bookingIds }
//         });

//         const jobIds = jobs.map(j => j._id);

//         // find estimates
//         const estimates = await Estimate
//             .find({
//                 job: { $in: jobIds }
//             })
//             .populate({
//                 path: "job",
//                 populate: {
//                     path: "booking",
//                     populate: {
//                         path: "vehicle"
//                     }
//                 }
//             });

//         res.json(estimates);

//     }
//     catch (err) {

//         console.log(err);
//         res.status(500).json([]);

//     }

// });

// // APPROVE estimate

// router.put("/approve/:estimateId", async (req, res) => {

//     try {

//         const estimate = await Estimate.findById(
//             req.params.estimateId
//         );

//         estimate.approvalStatus = "Approved";

//         estimate.approvedDate = new Date();

//         await estimate.save();

//         await Job.findByIdAndUpdate(
//             estimate.job,
//             {
//                 jobStatus: "Working"
//             }
//         );

//         res.json({
//             success: true
//         });

//     }
//     catch (err) {

//         res.status(500).json({
//             success: false
//         });

//     }

// });

// // REJECT estimate

// router.put("/reject/:estimateId", async (req, res) => {

//     try {

//         const estimate = await Estimate.findById(
//             req.params.estimateId
//         );

//         estimate.approvalStatus = "Rejected";

//         await estimate.save();

//         await Job.findByIdAndUpdate(
//             estimate.job,
//             {
//                 jobStatus: "Rejected"
//             }
//         );

//         res.json({
//             success: true
//         });

//     }
//     catch (err) {

//         res.status(500).json({
//             success: false
//         });

//     }

// });


// module.exports = router;

const express = require("express");
const router = express.Router();

const Estimate = require("../../models/estimate");
const Job = require("../../models/job");
const User = require("../../models/user");
const Inspection = require("../../models/inspection");


// ==========================================
// GET CUSTOMER ESTIMATES WITH FULL DETAILS
// /api/customer/estimate/:phone
// ==========================================
router.get("/estimate/:phone", async (req, res) => {

    try {

        const phone = req.params.phone;

        const customer = await User.findOne({ phone });

        if (!customer)
            return res.status(404).json({ message: "Customer not found" });


        // find estimates belonging to customer
        const estimates = await Estimate.find()
            .populate({
                path: "job",
                populate: {
                    path: "booking",
                    match: { customer: customer._id },
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
                }
            })
            .sort({ createdAt: -1 });


        // remove unrelated estimates
        const filtered = estimates.filter(
            est => est.job && est.job.booking
        );


        // attach inspection data
        const result = await Promise.all(

            filtered.map(async (est) => {

                const inspection = await Inspection.findOne({
                    job: est.job._id
                });

                return {
                    ...est.toObject(),
                    inspection
                };

            })

        );


        res.json(result);

    }

    catch (err) {

        console.log(err);

        res.status(500).json({
            message: "Failed to fetch estimates"
        });

    }

});


// ==========================================
// APPROVE
// ==========================================
router.put("/approve/:id", async (req, res) => {

    await Estimate.findByIdAndUpdate(
        req.params.id,
        { approvalStatus: "Approved" }
    );

    res.json({ message: "Approved" });

});


// ==========================================
// REJECT
// ==========================================
router.put("/reject/:id", async (req, res) => {

    await Estimate.findByIdAndUpdate(
        req.params.id,
        { approvalStatus: "Rejected" }
    );

    res.json({ message: "Rejected" });

});


module.exports = router;
