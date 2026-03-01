const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Feedback = require("../../models/feedback");
const Job = require("../../models/job");
const Booking = require("../../models/booking");

// Validation middleware
const validateObjectId = (id, name = 'ID') => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error(`Invalid ${name} format`);
    }
};

// =======================================
// 1️⃣ CREATE FEEDBACK (Customer)
// =======================================
router.post("/create", async (req, res) => {
    try {
        const { customerId, jobId, rating, comment } = req.body;

        // Validate required fields
        if (!customerId || !jobId || !rating) {
            return res.status(400).json({ 
                message: "Missing required fields",
                required: ['customerId', 'jobId', 'rating']
            });
        }

        // Validate rating range
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ 
                message: "Rating must be between 1 and 5" 
            });
        }

        // Validate ObjectIds
        validateObjectId(jobId, 'Job ID');
        validateObjectId(customerId, 'Customer ID');

        // Find job with populated booking
        const job = await Job.findById(jobId)
            .populate({
                path: "booking",
                populate: { path: "vehicle" }
            });

        if (!job) {
            return res.status(404).json({ 
                message: "Job not found" 
            });
        }

        // Check if job belongs to customer
        if (!job.booking || job.booking.customer.toString() !== customerId) {
            return res.status(403).json({ 
                message: "Unauthorized: This job does not belong to you" 
            });
        }

        // Check job status
        if (job.jobStatus !== "Delivered") {
            return res.status(400).json({ 
                message: "Feedback can only be submitted for delivered jobs",
                currentStatus: job.jobStatus
            });
        }

        // Check for duplicate feedback
        const existingFeedback = await Feedback.findOne({ 
            job: jobId, 
            customer: customerId 
        });

        if (existingFeedback) {
            return res.status(400).json({ 
                message: "You have already submitted feedback for this job",
                existingFeedback: {
                    rating: existingFeedback.rating,
                    comment: existingFeedback.comment,
                    submittedAt: existingFeedback.createdAt
                }
            });
        }

        // Create new feedback
        const feedback = new Feedback({
            customer: customerId,
            job: jobId,
            rating,
            comment: comment ? comment.trim() : "",
            createdAt: new Date()
        });

        await feedback.save();

        // Populate feedback with related data
        await feedback.populate([
            { path: "customer", select: "name email phone" },
            { 
                path: "job", 
                populate: { 
                    path: "booking", 
                    populate: { 
                        path: "vehicle",
                        select: "vehicleNumber model make year"
                    } 
                } 
            }
        ]);

        res.status(201).json({ 
            message: "Feedback submitted successfully",
            feedback: {
                id: feedback._id,
                rating: feedback.rating,
                comment: feedback.comment,
                createdAt: feedback.createdAt
            }
        });

    } catch (error) {
        console.error("Error creating feedback:", error);
        
        if (error.message.includes('Invalid')) {
            return res.status(400).json({ message: error.message });
        }
        
        res.status(500).json({ 
            message: "Server error while submitting feedback",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// =======================================
// 2️⃣ GET DELIVERED JOBS FOR CUSTOMER
// =======================================
router.get("/customer/:customerId", async (req, res) => {
    try {
        const { customerId } = req.params;

        if (!customerId) {
            return res.status(400).json({ 
                message: "Customer ID is required" 
            });
        }

        validateObjectId(customerId, 'Customer ID');

        // First, find all bookings for this customer
        const customerBookings = await Booking.find({ customer: customerId })
            .select('_id')
            .lean();

        const bookingIds = customerBookings.map(booking => booking._id);

        // Find jobs that are delivered and belong to customer's bookings
        const jobs = await Job.find({ 
            booking: { $in: bookingIds },
            jobStatus: "Delivered" 
        })
        .populate({
            path: "booking",
            populate: { 
                path: "vehicle",
                select: "vehicleNumber model make year type"
            }
        })
        .sort({ updatedAt: -1 }); // Most recent first

        // Get feedback status for each job
        const jobsWithFeedbackStatus = await Promise.all(
            jobs.map(async (job) => {
                const feedback = await Feedback.findOne({ 
                    job: job._id, 
                    customer: customerId 
                }).select('rating comment createdAt');
                
                // Format the job data to ensure consistent structure
                const jobObject = job.toObject();
                
                return {
                    ...jobObject,
                    hasFeedback: !!feedback,
                    feedback: feedback || null
                };
            })
        );

        res.json(jobsWithFeedbackStatus);

    } catch (error) {
        console.error("Error fetching customer jobs:", error);
        
        if (error.message.includes('Invalid')) {
            return res.status(400).json({ message: error.message });
        }
        
        res.status(500).json({ 
            message: "Server error while fetching jobs",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// =======================================
// 3️⃣ GET FEEDBACK FOR SPECIFIC JOB
// =======================================
router.get("/job/:jobId/customer/:customerId", async (req, res) => {
    try {
        const { jobId, customerId } = req.params;

        validateObjectId(jobId, 'Job ID');
        validateObjectId(customerId, 'Customer ID');

        const feedback = await Feedback.findOne({ 
            job: jobId, 
            customer: customerId 
        }).select('rating comment createdAt');

        if (!feedback) {
            return res.status(404).json({ 
                message: "No feedback found for this job",
                error: "NOT_FOUND"
            });
        }

        res.json(feedback);

    } catch (error) {
        console.error("Error fetching feedback:", error);
        
        if (error.message.includes('Invalid')) {
            return res.status(400).json({ message: error.message });
        }
        
        res.status(500).json({ 
            message: "Server error while fetching feedback",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// =======================================
// 4️⃣ GET ALL FEEDBACK (Admin with pagination)
// =======================================
router.get("/all", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Build filter
        const filter = {};
        if (req.query.rating) {
            filter.rating = parseInt(req.query.rating);
        }
        if (req.query.fromDate && req.query.toDate) {
            filter.createdAt = {
                $gte: new Date(req.query.fromDate),
                $lte: new Date(req.query.toDate)
            };
        }

        // Get total count
        const total = await Feedback.countDocuments(filter);

        // Get feedbacks with pagination
        const feedbacks = await Feedback.find(filter)
            .populate("customer", "name email phone")
            .populate({
                path: "job",
                populate: {
                    path: "booking",
                    populate: { 
                        path: "vehicle",
                        select: "vehicleNumber model make year"
                    }
                }
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Calculate statistics
        const stats = await Feedback.aggregate([
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: "$rating" },
                    totalFeedbacks: { $sum: 1 },
                    ratingCounts: {
                        $push: "$rating"
                    }
                }
            }
        ]);

        // Format rating distribution
        const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        if (stats[0]?.ratingCounts) {
            stats[0].ratingCounts.forEach(r => {
                ratingDistribution[r] = (ratingDistribution[r] || 0) + 1;
            });
        }

        res.json({
            feedbacks,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1
            },
            stats: stats[0] ? {
                averageRating: stats[0].averageRating.toFixed(2),
                totalFeedbacks: stats[0].totalFeedbacks,
                ratingDistribution
            } : null
        });

    } catch (error) {
        console.error("Error fetching all feedbacks:", error);
        res.status(500).json({ 
            message: "Server error while fetching feedbacks",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// =======================================
// 5️⃣ UPDATE FEEDBACK (Optional - if allowed)
// =======================================
router.put("/update/:feedbackId", async (req, res) => {
    try {
        const { feedbackId } = req.params;
        const { rating, comment, customerId } = req.body;

        validateObjectId(feedbackId, 'Feedback ID');

        const feedback = await Feedback.findById(feedbackId);

        if (!feedback) {
            return res.status(404).json({ message: "Feedback not found" });
        }

        // Verify ownership
        if (feedback.customer.toString() !== customerId) {
            return res.status(403).json({ message: "Unauthorized to update this feedback" });
        }

        // Check if update is allowed (e.g., within 24 hours)
        const hoursSinceCreation = (Date.now() - feedback.createdAt) / (1000 * 60 * 60);
        if (hoursSinceCreation > 24) {
            return res.status(400).json({ 
                message: "Feedback can only be updated within 24 hours of submission" 
            });
        }

        // Update fields
        if (rating) {
            if (rating < 1 || rating > 5) {
                return res.status(400).json({ message: "Rating must be between 1 and 5" });
            }
            feedback.rating = rating;
        }
        
        if (comment !== undefined) {
            feedback.comment = comment.trim();
        }

        feedback.updatedAt = new Date();
        await feedback.save();

        res.json({ 
            message: "Feedback updated successfully",
            feedback: {
                id: feedback._id,
                rating: feedback.rating,
                comment: feedback.comment,
                updatedAt: feedback.updatedAt
            }
        });

    } catch (error) {
        console.error("Error updating feedback:", error);
        
        if (error.message.includes('Invalid')) {
            return res.status(400).json({ message: error.message });
        }
        
        res.status(500).json({ 
            message: "Server error while updating feedback",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;