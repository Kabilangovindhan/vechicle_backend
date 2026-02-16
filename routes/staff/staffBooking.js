const express = require("express");
const router = express.Router();
const BookingModel = require("../../models/booking");


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



router.get("/fetchbook", verifyToken, async (req, res) => {

    try {

        const bookings = await BookingModel
            .find({ status: "Pending" })
            .populate("customer")
            .populate("vehicle")
            .sort({ createdAt: -1 });

        res.json(bookings);

    } catch (err) {

        res.status(500).json({ message: "Fetch failed" });

    }

});


router.put("/rejectbook/:id", verifyToken, async (req, res) => {

    try {

        const booking = await BookingModel.findByIdAndUpdate(
            req.params.id,
            { status: "Rejected" },
            { new: true }
        );

        res.json({
            message: "Booking rejected",
            booking
        });

    } catch (err) {

        res.status(500).json({ message: "Reject failed" });

    }

});

module.exports = router;