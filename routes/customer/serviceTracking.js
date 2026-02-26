// module.exports = router;
const express = require("express");
const router = express.Router();

const UserModel = require("../../models/user");
const BookingModel = require("../../models/booking");
const JobModel = require("../../models/job");


// GET SERVICE TRACKING WITH CUSTOMER MESSAGE
router.get("/:phone", async (req, res) => {

    try {

        const user = await UserModel.findOne({
            phone: req.params.phone
        });

        if (!user) {
            return res.json([]);
        }

        const bookings = await BookingModel
            .find({ customer: user._id })
            .populate("vehicle")
            .sort({ createdAt: -1 })
            .lean();

        const enhancedBookings = await Promise.all(

            bookings.map(async (booking) => {

                // Default message
                booking.customerMessage = null;

                if (booking.status === "Pending") {

                    booking.displayStatus = "Pending";

                    booking.customerMessage =
                        "Your service request has been received and is waiting for manager approval.";

                }

                else if (booking.status === "Rejected") {

                    booking.displayStatus = "Rejected";

                    booking.customerMessage =
                        booking.rejectedReason ||
                        "Your service request was rejected by the manager.";

                }

                else if (booking.status === "Approved") {

                    const job = await JobModel.findOne({
                        booking: booking._id
                    });

                    if (!job) {

                        booking.displayStatus = "Checking Progress";

                        booking.customerMessage =
                            "Your booking has been approved. Technician assignment is in progress.";

                    }

                    else if (job.jobStatus === "Assigned") {

                        booking.displayStatus = "Checking Progress";

                        booking.customerMessage =
                            "A technician has been assigned. Service will begin shortly.";

                    }

                    else if (job.jobStatus === "In Progress") {

                        booking.displayStatus = "In Service";

                        booking.customerMessage =
                            "Your vehicle is currently being serviced.";

                    }

                    else if (job.jobStatus === "Completed") {

                        booking.displayStatus = "Completed";

                        booking.customerMessage =
                            "Service completed successfully. Vehicle ready for delivery.";

                    }

                    else {

                        booking.displayStatus = job.jobStatus;

                        booking.customerMessage =
                            "Your service is progressing.";

                    }

                }

                return booking;

            })

        );

        res.json(enhancedBookings);

    }

    catch (err) {

        console.log("Service Tracking Error:", err);

        res.status(500).json([]);

    }

});


module.exports = router;