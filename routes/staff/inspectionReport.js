const express = require("express");
const router = express.Router();
const Inspection = require("../../models/inspection");
const Estimate = require("../../models/estimate");

// ------------------------------------------------------------------------------------------------------------------------

// Save inspection

router.post("/save/:jobId", async (req, res) => {
    const inspection = new Inspection({
        job: req.params.jobId,
        issuesFound: req.body.issuesFound,
        remarks: req.body.remarks
    });
    await inspection.save();
    res.json({ success: true });

});

// ------------------------------------------------------------------------------------------------------------------------

// Save estimate

router.post("/save-estimate/:jobId", async (req, res) => {
    const estimate = new Estimate({
        job: req.params.jobId,
        labourCharge: req.body.labourCharge,
        partsCost: req.body.partsCost,
        tax: req.body.tax,
        totalAmount: req.body.totalAmount
    });
    await estimate.save();
    res.json({ success: true });

});

// ------------------------------------------------------------------------------------------------------------------------

module.exports = router;