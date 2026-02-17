const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const JobModel = require("../../models/job");

router.get("/fetch", async (req, res) => {

    console.log(req.body)

    try {

        const jobs = await JobModel
            .find({ assignedStaff: req.user.id })
            .populate({
                path: "booking",
                populate: ["customer", "vehicle"]
            })
            .populate("assignedStaff");

        res.json(jobs);

    } catch (err) {
        console.log("Error in fetching jobs for assingned staff : ", err)
        res.status(500).json({ message: "Fetch jobs failed" });

    }

});




module.exports = router;