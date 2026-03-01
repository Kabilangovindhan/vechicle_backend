const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// Import models
const User = require("../../models/user");
const Job = require("../../models/job");
const Booking = require("../../models/booking");
const Inspection = require("../../models/inspection");
const Estimate = require("../../models/estimate");
const Invoice = require("../../models/invoice");
const Vehicle = require("../../models/vehicle");

// ------------------------------------------------------------------------------------------------------------------------
// GET /api/reportAnalytics/staff-performance - Get performance metrics for all staff
// ------------------------------------------------------------------------------------------------------------------------
router.get("/staff-performance", async (req, res) => {
    try {
        // Get all staff members
        const staffMembers = await User.find({ role: "staff" }).select('name email phone createdAt');

        // Get date range from query params (default: last 30 days)
        const { startDate, endDate } = req.query;
        const dateFilter = {};
        
        if (startDate && endDate) {
            dateFilter.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // Fetch performance data for each staff member
        const staffPerformance = await Promise.all(staffMembers.map(async (staff) => {
            // Get all jobs assigned to this staff
            const jobs = await Job.find({ 
                assignedStaff: staff._id,
                ...dateFilter
            }).populate('booking');

            const jobIds = jobs.map(job => job._id);

            // Get inspections done by this staff
            const inspections = await Inspection.find({
                $or: [
                    { job: { $in: jobIds } },
                    { inspectedBy: staff._id }
                ]
            });

            // Get estimates for jobs handled by this staff
            const estimates = await Estimate.find({ job: { $in: jobIds } });

            // Get invoices for jobs handled by this staff
            const invoices = await Invoice.find({ job: { $in: jobIds } });

            // Calculate metrics
            const totalJobs = jobs.length;
            const completedJobs = jobs.filter(job => 
                job.jobStatus === "Completed" || job.jobStatus === "Delivered"
            ).length;
            
            const inProgressJobs = jobs.filter(job => 
                ["Assigned", "Inspection", "Waiting Approval", "Working"].includes(job.jobStatus)
            ).length;

            // Calculate average completion time
            const completedJobsWithTime = jobs.filter(job => 
                job.startTime && job.endTime && 
                (job.jobStatus === "Completed" || job.jobStatus === "Delivered")
            );
            
            let avgCompletionTime = null;
            if (completedJobsWithTime.length > 0) {
                const totalTime = completedJobsWithTime.reduce((sum, job) => {
                    return sum + (job.endTime - job.startTime);
                }, 0);
                avgCompletionTime = totalTime / completedJobsWithTime.length / (1000 * 60 * 60); // in hours
            }

            // Calculate total earnings from labour charges
            let totalEarnings = 0;
            estimates.forEach(estimate => {
                if (estimate.items) {
                    estimate.items.forEach(item => {
                        totalEarnings += item.labourCharge || 0;
                    });
                }
            });

            // Calculate customer satisfaction (based on approved estimates)
            const approvedEstimates = estimates.filter(est => est.approvalStatus === "Approved").length;
            const satisfactionRate = estimates.length > 0 
                ? (approvedEstimates / estimates.length) * 100 
                : 0;

            // Calculate urgent job ratio
            const urgentJobs = jobs.filter(job => job.priority === "Urgent").length;
            const urgentJobRatio = totalJobs > 0 ? (urgentJobs / totalJobs) * 100 : 0;

            return {
                staffId: staff._id,
                staffName: staff.name,
                staffEmail: staff.email,
                staffPhone: staff.phone,
                joinedDate: staff.createdAt,
                metrics: {
                    totalJobs,
                    completedJobs,
                    inProgressJobs,
                    pendingJobs: totalJobs - completedJobs - inProgressJobs,
                    totalInspections: inspections.length,
                    totalEstimates: estimates.length,
                    totalInvoices: invoices.length,
                    totalEarnings,
                    avgCompletionTime: avgCompletionTime ? Math.round(avgCompletionTime * 10) / 10 : null,
                    satisfactionRate: Math.round(satisfactionRate * 10) / 10,
                    urgentJobRatio: Math.round(urgentJobRatio * 10) / 10
                },
                recentJobs: jobs.slice(0, 5).map(job => ({
                    jobId: job._id,
                    status: job.jobStatus,
                    priority: job.priority,
                    createdAt: job.createdAt,
                    customerName: job.booking?.customerName || "N/A",
                    vehicleNumber: job.booking?.vehicleNumber || "N/A"
                }))
            };
        }));

        // Calculate overall statistics
        const overallStats = {
            totalStaff: staffMembers.length,
            totalJobs: staffPerformance.reduce((sum, staff) => sum + staff.metrics.totalJobs, 0),
            totalCompletedJobs: staffPerformance.reduce((sum, staff) => sum + staff.metrics.completedJobs, 0),
            totalEarnings: staffPerformance.reduce((sum, staff) => sum + staff.metrics.totalEarnings, 0),
            avgSatisfactionRate: staffPerformance.reduce((sum, staff) => sum + staff.metrics.satisfactionRate, 0) / staffMembers.length,
            avgCompletionTime: staffPerformance.reduce((sum, staff) => sum + (staff.metrics.avgCompletionTime || 0), 0) / staffMembers.length
        };

        // Sort staff by performance (completed jobs)
        const sortedByPerformance = [...staffPerformance].sort((a, b) => 
            b.metrics.completedJobs - a.metrics.completedJobs
        );

        res.json({
            success: true,
            overallStats,
            staffPerformance: sortedByPerformance,
            topPerformers: sortedByPerformance.slice(0, 3),
            dateRange: {
                startDate: startDate || "All time",
                endDate: endDate || "All time"
            }
        });

    } catch (error) {
        console.error("Error fetching staff performance:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to fetch staff performance",
            error: error.message 
        });
    }
});

// ------------------------------------------------------------------------------------------------------------------------
// GET /api/reportAnalytics/workshop-overview - Get overall workshop analytics
// ------------------------------------------------------------------------------------------------------------------------
router.get("/workshop-overview", async (req, res) => {
    try {
        const { period = "month" } = req.query; // day, week, month, year
        
        // Calculate date range based on period
        const now = new Date();
        let startDate = new Date();
        
        switch(period) {
            case "day":
                startDate.setDate(now.getDate() - 1);
                break;
            case "week":
                startDate.setDate(now.getDate() - 7);
                break;
            case "month":
                startDate.setMonth(now.getMonth() - 1);
                break;
            case "year":
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            default:
                startDate.setMonth(now.getMonth() - 1);
        }

        // Fetch all data for the period
        const [jobs, bookings, inspections, estimates, invoices, vehicles] = await Promise.all([
            Job.find({ createdAt: { $gte: startDate } }).populate('assignedStaff', 'name'),
            Booking.find({ createdAt: { $gte: startDate } }),
            Inspection.find({ createdAt: { $gte: startDate } }),
            Estimate.find({ createdAt: { $gte: startDate } }),
            Invoice.find({ createdAt: { $gte: startDate } }),
            Vehicle.find({ createdAt: { $gte: startDate } })
        ]);

        // Calculate key metrics
        const metrics = {
            totalJobs: jobs.length,
            completedJobs: jobs.filter(job => job.jobStatus === "Completed").length,
            deliveredJobs: jobs.filter(job => job.jobStatus === "Delivered").length,
            pendingJobs: jobs.filter(job => 
                ["Assigned", "Inspection", "Waiting Approval", "Working"].includes(job.jobStatus)
            ).length,
            
            totalBookings: bookings.length,
            approvedBookings: bookings.filter(booking => booking.status === "Approved").length,
            pendingBookings: bookings.filter(booking => booking.status === "Pending").length,
            
            totalInspections: inspections.length,
            totalEstimates: estimates.length,
            approvedEstimates: estimates.filter(est => est.approvalStatus === "Approved").length,
            
            totalInvoices: invoices.length,
            paidInvoices: invoices.filter(inv => inv.paymentStatus === "Paid").length,
            
            totalVehicles: vehicles.length,
            
            // Revenue metrics
            totalRevenue: invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0),
            pendingRevenue: invoices
                .filter(inv => inv.paymentStatus !== "Paid")
                .reduce((sum, inv) => sum + (inv.grandTotal || 0), 0)
        };

        // Service type distribution
        const serviceTypeDistribution = {};
        bookings.forEach(booking => {
            const type = booking.serviceType || "Other";
            serviceTypeDistribution[type] = (serviceTypeDistribution[type] || 0) + 1;
        });

        // Daily/Monthly trend data
        const trendData = {};
        const groupedByDate = {};
        
        jobs.forEach(job => {
            const date = job.createdAt.toISOString().split('T')[0];
            if (!groupedByDate[date]) {
                groupedByDate[date] = { jobs: 0, completed: 0, revenue: 0 };
            }
            groupedByDate[date].jobs++;
            if (job.jobStatus === "Completed" || job.jobStatus === "Delivered") {
                groupedByDate[date].completed++;
            }
        });

        invoices.forEach(inv => {
            if (inv.paymentStatus === "Paid") {
                const date = inv.createdAt.toISOString().split('T')[0];
                if (groupedByDate[date]) {
                    groupedByDate[date].revenue += inv.grandTotal || 0;
                }
            }
        });

        // Convert to array for charts
        const trendArray = Object.entries(groupedByDate).map(([date, data]) => ({
            date,
            ...data
        })).sort((a, b) => a.date.localeCompare(b.date));

        // Staff workload distribution
        const staffWorkload = {};
        jobs.forEach(job => {
            if (job.assignedStaff) {
                const staffName = job.assignedStaff.name || "Unassigned";
                if (!staffWorkload[staffName]) {
                    staffWorkload[staffName] = 0;
                }
                staffWorkload[staffName]++;
            }
        });

        res.json({
            success: true,
            period,
            dateRange: {
                start: startDate,
                end: now
            },
            metrics,
            charts: {
                serviceTypeDistribution: Object.entries(serviceTypeDistribution).map(([name, value]) => ({
                    name,
                    value
                })),
                trendData: trendArray,
                staffWorkload: Object.entries(staffWorkload).map(([name, jobs]) => ({
                    name,
                    jobs
                }))
            }
        });

    } catch (error) {
        console.error("Error fetching workshop overview:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to fetch workshop overview",
            error: error.message 
        });
    }
});

// ------------------------------------------------------------------------------------------------------------------------
// GET /api/reportAnalytics/financial-report - Get financial report
// ------------------------------------------------------------------------------------------------------------------------
router.get("/financial-report", async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        const dateFilter = {};
        if (startDate && endDate) {
            dateFilter.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // Get all invoices within date range
        const invoices = await Invoice.find(dateFilter)
            .populate({
                path: 'job',
                populate: {
                    path: 'booking',
                    populate: 'customer vehicle'
                }
            });

        // Get all estimates
        const estimates = await Estimate.find(dateFilter);

        // Calculate financial metrics
        const financialData = {
            totalRevenue: invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0),
            paidRevenue: invoices
                .filter(inv => inv.paymentStatus === "Paid")
                .reduce((sum, inv) => sum + (inv.grandTotal || 0), 0),
            pendingRevenue: invoices
                .filter(inv => inv.paymentStatus !== "Paid")
                .reduce((sum, inv) => sum + (inv.grandTotal || 0), 0),
            
            totalGST: invoices.reduce((sum, inv) => sum + (inv.gst || 0), 0),
            
            paymentMethodBreakdown: {
                Cash: invoices.filter(inv => inv.paymentMethod === "Cash").length,
                Card: invoices.filter(inv => inv.paymentMethod === "Card").length,
                UPI: invoices.filter(inv => inv.paymentMethod === "UPI").length,
                Pending: invoices.filter(inv => !inv.paymentMethod).length
            },

            // Labour vs Parts revenue
            labourRevenue: estimates.reduce((sum, est) => {
                return sum + (est.items?.reduce((s, item) => s + (item.labourCharge || 0), 0) || 0);
            }, 0),
            
            partsRevenue: estimates.reduce((sum, est) => {
                return sum + (est.items?.reduce((s, item) => s + (item.partsCost || 0), 0) || 0);
            }, 0),

            // Monthly breakdown
            monthlyBreakdown: {}
        };

        // Create monthly breakdown
        invoices.forEach(inv => {
            const month = inv.createdAt.toLocaleString('default', { month: 'long', year: 'numeric' });
            if (!financialData.monthlyBreakdown[month]) {
                financialData.monthlyBreakdown[month] = {
                    revenue: 0,
                    count: 0,
                    paid: 0
                };
            }
            financialData.monthlyBreakdown[month].revenue += inv.grandTotal || 0;
            financialData.monthlyBreakdown[month].count++;
            if (inv.paymentStatus === "Paid") {
                financialData.monthlyBreakdown[month].paid++;
            }
        });

        res.json({
            success: true,
            dateRange: { startDate, endDate },
            financialData
        });

    } catch (error) {
        console.error("Error fetching financial report:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to fetch financial report",
            error: error.message 
        });
    }
});

// ------------------------------------------------------------------------------------------------------------------------
// GET /api/reportAnalytics/staff/:staffId/detailed - Get detailed report for specific staff
// ------------------------------------------------------------------------------------------------------------------------
router.get("/staff/:staffId/detailed", async (req, res) => {
    try {
        const { staffId } = req.params;
        const { startDate, endDate } = req.query;

        // Verify staff exists
        const staff = await User.findById(staffId);
        if (!staff || staff.role !== "staff") {
            return res.status(404).json({
                success: false,
                message: "Staff member not found"
            });
        }

        const dateFilter = {};
        if (startDate && endDate) {
            dateFilter.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // Get all jobs for this staff
        const jobs = await Job.find({ 
            assignedStaff: staffId,
            ...dateFilter
        }).populate({
            path: 'booking',
            populate: [
                { path: 'customer', select: 'name phone' },
                { path: 'vehicle', select: 'vehicleNumber brand model' }
            ]
        }).sort({ createdAt: -1 });

        const jobIds = jobs.map(job => job._id);

        // Get related data
        const [inspections, estimates, invoices] = await Promise.all([
            Inspection.find({ 
                $or: [{ job: { $in: jobIds } }, { inspectedBy: staffId }]
            }),
            Estimate.find({ job: { $in: jobIds } }),
            Invoice.find({ job: { $in: jobIds } })
        ]);

        // Calculate detailed metrics
        const detailedReport = {
            staffInfo: {
                id: staff._id,
                name: staff.name,
                email: staff.email,
                phone: staff.phone,
                joinedDate: staff.createdAt
            },
            summary: {
                totalJobs: jobs.length,
                completedJobs: jobs.filter(j => j.jobStatus === "Completed" || j.jobStatus === "Delivered").length,
                inProgressJobs: jobs.filter(j => 
                    ["Assigned", "Inspection", "Waiting Approval", "Working"].includes(j.jobStatus)
                ).length,
                totalInspections: inspections.length,
                totalEstimates: estimates.length,
                totalInvoices: invoices.length
            },
            earnings: {
                totalLabour: estimates.reduce((sum, est) => {
                    return sum + (est.items?.reduce((s, item) => s + (item.labourCharge || 0), 0) || 0);
                }, 0),
                byMonth: {}
            },
            jobsByStatus: {},
            jobsByPriority: {
                Normal: jobs.filter(j => j.priority === "Normal").length,
                Urgent: jobs.filter(j => j.priority === "Urgent").length
            },
            detailedJobs: jobs.map(job => ({
                jobId: job._id,
                status: job.jobStatus,
                priority: job.priority,
                createdAt: job.createdAt,
                completedAt: job.endTime,
                customer: {
                    name: job.booking?.customer?.name,
                    phone: job.booking?.customer?.phone
                },
                vehicle: {
                    number: job.booking?.vehicle?.vehicleNumber,
                    model: `${job.booking?.vehicle?.brand} ${job.booking?.vehicle?.model}`
                }
            }))
        };

        // Group jobs by status
        jobs.forEach(job => {
            detailedReport.jobsByStatus[job.jobStatus] = 
                (detailedReport.jobsByStatus[job.jobStatus] || 0) + 1;
        });

        // Calculate monthly earnings
        jobs.forEach(job => {
            if (job.endTime) {
                const month = job.endTime.toLocaleString('default', { month: 'long', year: 'numeric' });
                if (!detailedReport.earnings.byMonth[month]) {
                    detailedReport.earnings.byMonth[month] = 0;
                }
                // Find associated estimate for this job
                const jobEstimate = estimates.find(est => 
                    est.job && est.job.toString() === job._id.toString()
                );
                if (jobEstimate && jobEstimate.items) {
                    const labourTotal = jobEstimate.items.reduce((sum, item) => 
                        sum + (item.labourCharge || 0), 0
                    );
                    detailedReport.earnings.byMonth[month] += labourTotal;
                }
            }
        });

        res.json({
            success: true,
            report: detailedReport
        });

    } catch (error) {
        console.error("Error fetching staff detailed report:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to fetch staff detailed report",
            error: error.message 
        });
    }
});

// ------------------------------------------------------------------------------------------------------------------------
// GET /api/reportAnalytics/export - Export analytics data
// ------------------------------------------------------------------------------------------------------------------------
router.get("/export", async (req, res) => {
    try {
        const { type, startDate, endDate } = req.query;

        const dateFilter = {};
        if (startDate && endDate) {
            dateFilter.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        let exportData = {};

        switch(type) {
            case "staff":
                const staff = await User.find({ role: "staff" }).select('-password');
                exportData = { staff };
                break;
            
            case "jobs":
                const jobs = await Job.find(dateFilter)
                    .populate('assignedStaff', 'name')
                    .populate({
                        path: 'booking',
                        populate: [
                            { path: 'customer', select: 'name phone' },
                            { path: 'vehicle', select: 'vehicleNumber' }
                        ]
                    });
                exportData = { jobs };
                break;
            
            case "financial":
                const invoices = await Invoice.find(dateFilter)
                    .populate({
                        path: 'job',
                        populate: {
                            path: 'booking',
                            populate: 'customer'
                        }
                    });
                exportData = { invoices };
                break;
            
            case "complete":
                const [allStaff, allJobs, allInvoices, allEstimates] = await Promise.all([
                    User.find({ role: "staff" }).select('-password'),
                    Job.find(dateFilter).populate('assignedStaff', 'name'),
                    Invoice.find(dateFilter),
                    Estimate.find(dateFilter)
                ]);
                exportData = {
                    staff: allStaff,
                    jobs: allJobs,
                    invoices: allInvoices,
                    estimates: allEstimates,
                    exportedAt: new Date(),
                    dateRange: { startDate, endDate }
                };
                break;
            
            default:
                return res.status(400).json({
                    success: false,
                    message: "Invalid export type"
                });
        }

        res.json({
            success: true,
            exportType: type,
            data: exportData
        });

    } catch (error) {
        console.error("Error exporting data:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to export data",
            error: error.message 
        });
    }
});

module.exports = router;