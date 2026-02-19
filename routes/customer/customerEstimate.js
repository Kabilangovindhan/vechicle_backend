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

const User = require("../../models/user");
const Booking = require("../../models/booking");
const Job = require("../../models/job");
const Estimate = require("../../models/estimate");


// GET estimate report for customer

router.get("/:phone", async (req, res) => {

    try {

        const user = await User.findOne({
            phone: req.params.phone
        });

        if (!user)
            return res.json([]);

        // find bookings of customer
        const bookings = await Booking
            .find({
                customer: user._id
            })
            .populate("vehicle");

        const bookingIds = bookings.map(b => b._id);

        // find jobs
        const jobs = await Job.find({
            booking: { $in: bookingIds }
        });

        const jobIds = jobs.map(j => j._id);

        // find estimates
        const estimates = await Estimate
            .find({
                job: { $in: jobIds }
            })
            .populate({
                path: "job",
                populate: {
                    path: "booking",
                    populate: {
                        path: "vehicle"
                    }
                }
            });

        res.json(estimates);

    }
    catch (err) {

        console.log(err);

        res.status(500).json([]);

    }

});

module.exports = router;
