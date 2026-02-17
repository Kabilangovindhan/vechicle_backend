const express = require("express");
const router = express.Router();
const JobModel = require("../../models/job");
const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {

    const bearerHeader = req.headers["authorization"];

    if (!bearerHeader)
        return res.status(401).json({ message: "Token missing" });

    const token = bearerHeader.split(" ")[1];

    jwt.verify(token, process.env.JWT_SECRET || "secretkey",
        (err, decoded) => {

            if (err)
                return res.status(403).json({ message: "Invalid token" });

            req.user = decoded;
            next();
        });
}


// FETCH ASSIGNED JOBS
router.get("/fetch", verifyToken, async (req, res) => {

    try {

        const jobs = await JobModel.find({
            assignedStaff: req.user.id
        })
            .populate({
                path: "booking",
                populate: ["customer", "vehicle"]
            });

        res.json(jobs);

    } catch (err) {

        console.log(err);
        res.status(500).json({ message: "Fetch failed" });

    }

});


// UPDATE JOB STATUS
router.put("/update-status/:jobId", verifyToken, async (req, res) => {

    try {

        const job = await JobModel.findByIdAndUpdate(
            req.params.jobId,
            { jobStatus: req.body.status },
            { new: true }
        );

        res.json(job);

    } catch (err) {

        console.log(err);

        res.status(500).json({
            message: "Status update failed"
        });

    }

});



module.exports = router;
