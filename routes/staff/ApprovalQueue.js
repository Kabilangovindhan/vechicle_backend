// const express = require("express");
// const router = express.Router();
// const Estimate = require("../../models/estimate");
// const Job = require("../../models/job");
// const UserModel = require("../../models/user");

// // ------------------------------------------------------------------------------------------------------------------------

// router.get("/approvalQueue", async (req, res) => {

//     try {

//         const jobs = await Job.find()
//             .populate({
//                 path: "booking",
//                 populate: [
//                     {
//                         path: "vehicle",
//                         select: "vehicleNumber brand model"
//                     },
//                     {
//                         path: "customer",
//                         select: "name phone"
//                     }
//                 ]
//             })
//             .sort({ createdAt: -1 });

//         // attach estimate status
//         const result = await Promise.all(

//             jobs.map(async (job) => {

//                 const estimate = await Estimate.findOne({
//                     job: job._id
//                 });

//                 return {
//                     ...job.toObject(),
//                     estimateStatus: estimate?.approvalStatus || "Not Created"
//                 };

//             })

//         );

//         res.json(result);

//     }
//     catch (err) {

//         console.log(err);

//         res.status(500).json({
//             message: "Failed to fetch approval queue"
//         });

//     }

// });


// // ------------------------------------------------------------------------------------------------------------------------

// // START WORK
// router.put("/startWork/:jobId", async (req, res) => {

//     try {

//         const jobId = req.params.jobId;

//         await Job.findByIdAndUpdate(
//             jobId,
//             {
//                 jobStatus: "Working",
//                 startTime: new Date()
//             }
//         );

//         res.json({
//             message: "Work started successfully"
//         });

//     }
//     catch (err) {

//         console.log(err);

//         res.status(500).json({
//             message: "Failed to start work"
//         });

//     }

// });
// module.exports = router;

const express = require("express");
const router = express.Router();

const Job = require("../../models/job");
const Estimate = require("../../models/estimate");

// GET ONLY WAITING APPROVAL JOBS
router.get("/approvalQueue", async (req, res) => {

    try {

        const jobs = await Job.find({
            jobStatus: "Waiting Approval"
        })
        .populate({
            path: "booking",
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
        })
        .sort({ createdAt: -1 });

        // attach estimate status
        const result = await Promise.all(

            jobs.map(async (job) => {

                const estimate = await Estimate.findOne({
                    job: job._id
                });

                return {
                    ...job.toObject(),
                    estimateStatus: estimate?.approvalStatus || "Pending"
                };

            })

        );

        res.json(result);

    }
    catch (err) {

        console.log(err);

        res.status(500).json({
            message: "Failed to fetch approval queue"
        });

    }

});


// START WORK ROUTE
router.put("/startWork/:jobId", async (req, res) => {

    try {

        await Job.findByIdAndUpdate(
            req.params.jobId,
            {
                jobStatus: "Working",
                startTime: new Date()
            }
        );

        res.json({
            message: "Work started"
        });

    }
    catch (err) {

        res.status(500).json({
            message: "Failed"
        });

    }

});

module.exports = router;