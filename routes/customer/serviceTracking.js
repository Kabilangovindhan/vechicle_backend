const express = require("express");
const router = express.Router();
const UserModel = require("../../models/user");
const BookingModel = require("../../models/booking");

// ------------------------------------------------------------------------------------------------------------------------

router.get("/:phone", async (req, res) => {

	try {

		const user = await UserModel.findOne({ phone: req.params.phone });
		if (!user) return res.json([]);

		const bookings = await BookingModel
			.find({ customer: user._id })
			.populate("vehicle").sort({ createdAt: -1 });

		res.json(bookings);

	} catch (err) {
		console.log("Booking Fetch Error:", err);
		res.status(500).json([]);
	}
})

// ------------------------------------------------------------------------------------------------------------------------

module.exports = router;