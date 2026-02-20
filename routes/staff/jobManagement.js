const express = require("express");
const router = express.Router();
const JobModel = require("../../models/job");
const UserModel = require("../../models/user");

// ------------------------------------------------------------------------------------------------------------------------

// GET jobs assigned to staff

router.get("/fetch/:phone", async (req, res) => {

    try {

        const phone = req.params.phone;

        const staff = await UserModel.findOne({ phone });

        if (!staff)
            return res.status(404).json({ message: "Staff not found" });

        const jobs = await JobModel.find({ assignedStaff: staff._id })
            .populate({
                path: "booking",
                populate: [
                    { path: "vehicle", select: "vehicleNumber brand model" },
                    { path: "customer", select: "name phone" }
                ]
            })
            .sort({ createdAt: -1 });

        res.json(jobs);

    } catch (err) {

        console.log(err);

        res.status(500).json({
            message: "Failed to fetch assigned jobs"
        });

    }

});

// ------------------------------------------------------------------------------------------------------------------------

// UPDATE JOB STATUS

router.put("/update/:jobId", async (req, res) => {

    try {

        const { jobId } = req.params;
        const { status } = req.body;

        const validStatus = [
            "Pending",
            "Assigned",
            "In Progress",
            "Completed"
        ];

        if (!validStatus.includes(status)) {

            return res.status(400).json({
                message: "Invalid status"
            });

        }

        const job = await JobModel.findByIdAndUpdate(
            jobId,
            { jobStatus: status },
            { new: true }
        );

        if (!job) {

            return res.status(404).json({
                message: "Job not found"
            });

        }

        res.json({
            message: "Status updated",
            job
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            message: "Update failed"
        });

    }

});

// ------------------------------------------------------------------------------------------------------------------------

// POST: Save both Inspection and Estimate

router.post("/save-full-report/:jobId", async (req, res) => {

    try {

        const { jobId } = req.params;
        const { issues, remarks, parts, labor, totalAmount } = req.body;

        const updatedJob = await Job.findByIdAndUpdate(
            jobId,
            { 
                inspection: { issues, remarks },
                estimate: { parts, labor, totalAmount },
                jobStatus: "In Progress" 
            },
            { new: true }
        );

        res.status(200).json({ success: true, job: updatedJob });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ------------------------------------------------------------------------------------------------------------------------

// Add this to your user routes

router.get("/fetch-staff", async (req, res) => {
    try {
        const staff = await User.find({ role: "staff" }).select("name _id phone");
        res.json(staff);
    } catch (err) {
        res.status(500).json({ message: "Error fetching staff" });
    }
});

// ------------------------------------------------------------------------------------------------------------------------
 
//assignedjob
// router.get("/assigned/:phone", async (req, res) => {
//      console.log("hello")
//      console.log(req.body)
//     try {

//         const phone = req.params.phone;

//         // find staff user
//         const staff = await UserModel.findOne({ phone });

//         if (!staff) {
             
//             return res.status(404).json({
//                 message: "Staff not found"
//             });

//         }

//         // fetch assigned jobs
//         const jobs = await JobModel.find({
//             assignedStaff: staff._id
//         })
//         .populate({
//             path: "booking",
//             populate: [
//                 {
//                     path: "vehicle",
//                     select: "vehicleNumber brand model"
//                 },
//                 {
//                     path: "customer",
//                     select: "name phone"
//                 }
//             ]
//         })
//         .sort({ createdAt: -1 });

//         res.json(jobs);

//     }
//     catch (err) {

//         console.error("Fetch Assigned Jobs Error:", err);

//         res.status(500).json({
//             message: "Error fetching jobs"
//         });

//     }

// });
module.exports = router;