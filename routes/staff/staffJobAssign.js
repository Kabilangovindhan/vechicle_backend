const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const staffJObModel = require("../../models/job");


function verifyToken(req, res, next) {

    const bearerHeader = req.headers["authorization"];

    if (!bearerHeader) {
        return res.status(401).json({ message: "Access Denied. No Token Provided" });
    }

    const token = bearerHeader.split(" ")[1];

    jwt.verify(token, process.env.JWT_SECRET || "secretkey", (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Invalid Token" });
        }

        req.user = decoded;
        next();
    });
}



router.get("/fetch", verifyToken, async (req, res) => {

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

        res.status(500).json({ message: "Fetch jobs failed" });

    }

});




module.exports = router;