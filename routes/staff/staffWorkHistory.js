const express = require("express");
const router = express.Router();

// Import models
const Job = require("../../models/job");
const Inspection = require("../../models/inspection");
const Estimate = require("../../models/estimate");
const Invoice = require("../../models/invoice");
const Booking = require("../../models/booking");
const Vehicle = require("../../models/vehicle");
const User = require("../../models/user");

// ------------------------------------------------------------------------------------------------------------------------
// GET /api/staffWorkHistory/:staffId - Get complete work history for a specific staff member
// ------------------------------------------------------------------------------------------------------------------------
router.get("/:staffId", async (req, res) => {
    try {
        const { staffId } = req.params;

        // Verify staff exists
        const staff = await User.findById(staffId);
        if (!staff) {
            return res.status(404).json({ 
                success: false, 
                message: "Staff member not found" 
            });
        }

        if (staff.role !== "staff") {
            return res.status(400).json({ 
                success: false, 
                message: "User is not a staff member" 
            });
        }

        // Fetch all jobs assigned to this staff member
        const jobs = await Job.find({ assignedStaff: staffId })
            .populate({
                path: 'booking',
                populate: [
                    { path: 'customer', select: 'name phone email' },
                    { path: 'vehicle', select: 'vehicleNumber brand model' }
                ]
            })
            .sort({ createdAt: -1 });

        // Get all job IDs for this staff
        const jobIds = jobs.map(job => job._id);

        // Fetch all related data for these jobs
        const [inspections, estimates, invoices] = await Promise.all([
            // Inspections done by this staff
            Inspection.find({ 
                $or: [
                    { job: { $in: jobIds } },
                    { inspectedBy: staffId }
                ]
            }).populate('job', 'jobStatus priority'),
            
            // Estimates for jobs handled by this staff
            Estimate.find({ job: { $in: jobIds } }),
            
            // Invoices for jobs handled by this staff
            Invoice.find({ job: { $in: jobIds } })
                .populate('estimate', 'grandTotal approvalStatus')
        ]);

        // Calculate statistics
        const stats = {
            totalJobs: jobs.length,
            completedJobs: jobs.filter(job => job.jobStatus === "Completed").length,
            deliveredJobs: jobs.filter(job => job.jobStatus === "Delivered").length,
            inProgressJobs: jobs.filter(job => 
                ["Assigned", "Inspection", "Waiting Approval", "Working"].includes(job.jobStatus)
            ).length,
            pendingBilling: jobs.filter(job => job.jobStatus === "Pending Billing").length,
            totalInspections: inspections.length,
            totalEstimates: estimates.length,
            totalInvoices: invoices.length,
            urgentJobs: jobs.filter(job => job.priority === "Urgent").length
        };

        // Calculate earnings (if applicable - from labour charges in estimates)
        let totalEarnings = 0;
        estimates.forEach(estimate => {
            if (estimate.items && estimate.items.length > 0) {
                estimate.items.forEach(item => {
                    totalEarnings += item.labourCharge || 0;
                });
            }
        });

        // Prepare detailed work history
        const workHistory = jobs.map(job => {
            const jobInspections = inspections.filter(insp => 
                insp.job && insp.job._id.toString() === job._id.toString()
            );
            
            const jobEstimates = estimates.filter(est => 
                est.job && est.job.toString() === job._id.toString()
            );
            
            const jobInvoices = invoices.filter(inv => 
                inv.job && inv.job.toString() === job._id.toString()
            );

            return {
                jobId: job._id,
                jobStatus: job.jobStatus,
                priority: job.priority,
                startTime: job.startTime,
                endTime: job.endTime,
                createdAt: job.createdAt,
                updatedAt: job.updatedAt,
                
                // Booking and customer details
                booking: job.booking ? {
                    bookingId: job.booking._id,
                    serviceType: job.booking.serviceType,
                    problemDescription: job.booking.problemDescription,
                    appointmentDate: job.booking.appointmentDate,
                    customer: job.booking.customer ? {
                        name: job.booking.customer.name,
                        phone: job.booking.customer.phone,
                        email: job.booking.customer.email
                    } : null,
                    vehicle: job.booking.vehicle ? {
                        vehicleNumber: job.booking.vehicle.vehicleNumber,
                        brand: job.booking.vehicle.brand,
                        model: job.booking.vehicle.model
                    } : null
                } : null,

                // Related inspections
                inspections: jobInspections.map(insp => ({
                    inspectionId: insp._id,
                    issuesFound: insp.issuesFound,
                    remarks: insp.remarks,
                    inspectedAt: insp.createdAt
                })),

                // Related estimates
                estimates: jobEstimates.map(est => ({
                    estimateId: est._id,
                    items: est.items,
                    tax: est.tax,
                    grandTotal: est.grandTotal,
                    approvalStatus: est.approvalStatus,
                    createdAt: est.createdAt
                })),

                // Related invoices
                invoices: jobInvoices.map(inv => ({
                    invoiceId: inv._id,
                    gst: inv.gst,
                    grandTotal: inv.grandTotal,
                    paymentStatus: inv.paymentStatus,
                    paymentMethod: inv.paymentMethod,
                    createdAt: inv.createdAt
                }))
            };
        });

        // Group jobs by status for easier analysis
        const groupedByStatus = {
            assigned: jobs.filter(job => job.jobStatus === "Assigned"),
            inspection: jobs.filter(job => job.jobStatus === "Inspection"),
            waitingApproval: jobs.filter(job => job.jobStatus === "Waiting Approval"),
            working: jobs.filter(job => job.jobStatus === "Working"),
            completed: jobs.filter(job => job.jobStatus === "Completed"),
            readyDelivery: jobs.filter(job => job.jobStatus === "Ready Delivery"),
            delivered: jobs.filter(job => job.jobStatus === "Delivered"),
            pendingBilling: jobs.filter(job => job.jobStatus === "Pending Billing"),
            billed: jobs.filter(job => job.jobStatus === "Billed"),
            verified: jobs.filter(job => job.jobStatus === "Verified")
        };

        res.json({
            success: true,
            staff: {
                id: staff._id,
                name: staff.name,
                phone: staff.phone,
                email: staff.email
            },
            statistics: {
                ...stats,
                totalEarnings: totalEarnings,
                averageJobTime: calculateAverageJobTime(jobs)
            },
            groupedByStatus: {
                assigned: groupedByStatus.assigned.length,
                inspection: groupedByStatus.inspection.length,
                waitingApproval: groupedByStatus.waitingApproval.length,
                working: groupedByStatus.working.length,
                completed: groupedByStatus.completed.length,
                readyDelivery: groupedByStatus.readyDelivery.length,
                delivered: groupedByStatus.delivered.length,
                pendingBilling: groupedByStatus.pendingBilling.length,
                billed: groupedByStatus.billed.length,
                verified: groupedByStatus.verified.length
            },
            workHistory: workHistory
        });

    } catch (error) {
        console.error("Error fetching staff work history:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to fetch work history",
            error: error.message 
        });
    }
});

// ------------------------------------------------------------------------------------------------------------------------
// GET /api/staffWorkHistory/:staffId/summary - Get summary of staff work history
// ------------------------------------------------------------------------------------------------------------------------
router.get("/:staffId/summary", async (req, res) => {
    try {
        const { staffId } = req.params;

        const jobs = await Job.find({ assignedStaff: staffId })
            .select('jobStatus priority createdAt updatedAt startTime endTime')
            .sort({ createdAt: -1 });

        const jobIds = jobs.map(job => job._id);
        
        const [inspections, estimates] = await Promise.all([
            Inspection.countDocuments({ 
                $or: [{ job: { $in: jobIds } }, { inspectedBy: staffId }]
            }),
            Estimate.countDocuments({ job: { $in: jobIds } })
        ]);

        // Monthly breakdown
        const monthlyData = {};
        jobs.forEach(job => {
            const month = job.createdAt.toLocaleString('default', { month: 'long', year: 'numeric' });
            if (!monthlyData[month]) {
                monthlyData[month] = {
                    total: 0,
                    completed: 0,
                    urgent: 0
                };
            }
            monthlyData[month].total++;
            if (job.jobStatus === "Completed" || job.jobStatus === "Delivered") {
                monthlyData[month].completed++;
            }
            if (job.priority === "Urgent") {
                monthlyData[month].urgent++;
            }
        });

        res.json({
            success: true,
            summary: {
                totalJobs: jobs.length,
                totalInspections: inspections,
                totalEstimates: estimates,
                monthlyBreakdown: monthlyData,
                recentActivity: jobs.slice(0, 5).map(job => ({
                    jobId: job._id,
                    status: job.jobStatus,
                    priority: job.priority,
                    date: job.createdAt
                }))
            }
        });

    } catch (error) {
        console.error("Error fetching staff work summary:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to fetch work summary",
            error: error.message 
        });
    }
});

// ------------------------------------------------------------------------------------------------------------------------
// GET /api/staffWorkHistory/:staffId/date-range - Get work history within date range
// ------------------------------------------------------------------------------------------------------------------------
router.get("/:staffId/date-range", async (req, res) => {
    try {
        const { staffId } = req.params;
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: "Please provide both startDate and endDate"
            });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const jobs = await Job.find({
            assignedStaff: staffId,
            createdAt: { $gte: start, $lte: end }
        }).populate({
            path: 'booking',
            populate: [
                { path: 'customer', select: 'name phone' },
                { path: 'vehicle', select: 'vehicleNumber brand model' }
            ]
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            dateRange: {
                start: startDate,
                end: endDate
            },
            totalJobs: jobs.length,
            jobs: jobs.map(job => ({
                jobId: job._id,
                status: job.jobStatus,
                priority: job.priority,
                customerName: job.booking?.customer?.name,
                vehicleNumber: job.booking?.vehicle?.vehicleNumber,
                createdAt: job.createdAt,
                completedAt: job.endTime
            }))
        });

    } catch (error) {
        console.error("Error fetching staff work history by date range:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to fetch work history",
            error: error.message 
        });
    }
});

// ------------------------------------------------------------------------------------------------------------------------
// Helper function to calculate average job completion time
// ------------------------------------------------------------------------------------------------------------------------
function calculateAverageJobTime(jobs) {
    const completedJobs = jobs.filter(job => 
        job.startTime && job.endTime && 
        (job.jobStatus === "Completed" || job.jobStatus === "Delivered")
    );
    
    if (completedJobs.length === 0) return null;

    const totalTime = completedJobs.reduce((sum, job) => {
        const timeDiff = job.endTime - job.startTime; // in milliseconds
        return sum + timeDiff;
    }, 0);

    const avgTimeMs = totalTime / completedJobs.length;
    const avgTimeHours = avgTimeMs / (1000 * 60 * 60);
    
    return {
        hours: Math.round(avgTimeHours * 10) / 10,
        days: Math.round((avgTimeHours / 24) * 10) / 10
    };
}

module.exports = router;