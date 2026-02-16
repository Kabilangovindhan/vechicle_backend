const express = require("express");
const router = express.Router();

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

// create
router.get("/staff", verifyToken, async (req, res) => {

    try {

        const staff = await UserModel.find({ role: "staff" })
            .select("_id name phone");

        res.json(staff);

    } catch (err) {

        res.status(500).json({
            message: "Failed to fetch staff"
        });

    }

});
//

router.post("/fetchbooking", async (req, res) => {

    try {

        const user = await UserModel.findOne({
            phone: req.body.customerPhone
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const booking = await BookingModel.create({
            customer: user._id,
            vehicle: req.body.vehicle,
            serviceType: req.body.serviceType,
            problemDescription: req.body.problemDescription,
            appointmentDate: req.body.appointmentDate
        });

        res.json(booking);

    } catch (err) {
        console.log("Booking Create Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Update booking status
router.put("/update:id", async (req, res) => {

    try {

        const { status } = req.body;

        const updated = await BookingModel.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        res.json(updated);

    } catch (err) {

        console.log(err);
        res.status(500).json({ message: "Failed to update status" });

    }

});



// Admin approve booking and assign staff
router.put("/approvebooking/:id/approve", verifyToken, async (req, res) => {

    try {

        const bookingId = req.params.id;
        const { mechanicId, priority } = req.body;

        // 1. Update booking status
        const booking = await BookingModel.findByIdAndUpdate(
            bookingId,
            { status: "Approved" },
            { new: true }
        );

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        // 2. Create Job and assign mechanic
        const job = await JobModel.create({
            booking: bookingId,
            assignedStaff: mechanicId,
            priority: priority || "Normal",
            jobStatus: "Assigned"
        });

        res.json({
            message: "Booking approved and job assigned",
            booking,
            job
        });

    } catch (err) {

        console.log(err);
        res.status(500).json({
            message: "Approval failed"
        });

    }

});

module.exports = router;