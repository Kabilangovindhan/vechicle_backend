const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// Import models
const User = require("../../models/user");
const Booking = require("../../models/booking");
const Job = require("../../models/job");
const Vehicle = require("../../models/vehicle");
const Inspection = require("../../models/inspection");
const Estimate = require("../../models/estimate");
const Invoice = require("../../models/invoice");

// ------------------------------------------------------------------------------------------------------------------------
// GET /api/dashboard/:userId - Get dashboard data based on user role
// ------------------------------------------------------------------------------------------------------------------------
router.get("/:userId", async (req, res) => {
    try {
        const { userId } = req.params;

        // Get user details
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        let dashboardData = {
            user: {
                id: user._id,
                name: user.name,
                role: user.role,
                phone: user.phone,
                email: user.email
            }
        };

        // Fetch data based on role
        switch (user.role.toLowerCase()) {
            case "admin":
                dashboardData = await getAdminDashboard(userId);
                break;
            case "staff":
                dashboardData = await getStaffDashboard(userId);
                break;
            case "customer":
                dashboardData = await getCustomerDashboard(userId);
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: "Invalid user role"
                });
        }

        dashboardData.user = {
            id: user._id,
            name: user.name,
            role: user.role,
            phone: user.phone,
            email: user.email
        };

        res.json({
            success: true,
            dashboard: dashboardData
        });

    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch dashboard data",
            error: error.message
        });
    }
});

// ------------------------------------------------------------------------------------------------------------------------
// Admin Dashboard
// ------------------------------------------------------------------------------------------------------------------------
async function getAdminDashboard(adminId) {
    // Get date ranges
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

    // Fetch all required data
    const [
        totalCustomers,
        totalStaff,
        totalVehicles,
        todayBookings,
        weekBookings,
        monthBookings,
        pendingJobs,
        inProgressJobs,
        completedJobs,
        todayRevenue,
        weekRevenue,
        monthRevenue,
        yearRevenue,
        recentBookings,
        popularServices,
        staffPerformance,
        revenueByDay,
        jobStatusDistribution
    ] = await Promise.all([
        // Counts
        User.countDocuments({ role: "customer" }),
        User.countDocuments({ role: "staff" }),
        Vehicle.countDocuments(),
        
        // Bookings
        Booking.countDocuments({ createdAt: { $gte: startOfDay } }),
        Booking.countDocuments({ createdAt: { $gte: startOfWeek } }),
        Booking.countDocuments({ createdAt: { $gte: startOfMonth } }),
        
        // Jobs by status
        Job.countDocuments({ jobStatus: { $in: ["Assigned", "Inspection", "Waiting Approval"] } }),
        Job.countDocuments({ jobStatus: { $in: ["Working"] } }),
        Job.countDocuments({ jobStatus: { $in: ["Completed", "Delivered"] } }),
        
        // Revenue calculations
        calculateRevenue(startOfDay),
        calculateRevenue(startOfWeek),
        calculateRevenue(startOfMonth),
        calculateRevenue(startOfYear),
        
        // Recent bookings
        Booking.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate('customer', 'name')
            .populate('vehicle', 'vehicleNumber brand model'),
        
        // Popular services
        Booking.aggregate([
            { $group: { _id: "$serviceType", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]),
        
        // Staff performance
        getStaffPerformance(),
        
        // Revenue by day for chart
        getRevenueByDay(7),
        
        // Job status distribution
        Job.aggregate([
            { $group: { _id: "$jobStatus", count: { $sum: 1 } } }
        ])
    ]);

    // Get pending approvals (estimates waiting for approval)
    const pendingApprovals = await Estimate.countDocuments({ 
        approvalStatus: "Pending" 
    });

    // Get unpaid invoices
    const unpaidInvoices = await Invoice.countDocuments({ 
        paymentStatus: { $ne: "Paid" } 
    });

    return {
        role: "admin",
        stats: {
            totalCustomers,
            totalStaff,
            totalVehicles,
            todayBookings,
            weekBookings,
            monthBookings,
            pendingJobs,
            inProgressJobs,
            completedJobs,
            pendingApprovals,
            unpaidInvoices,
            revenue: {
                today: todayRevenue,
                week: weekRevenue,
                month: monthRevenue,
                year: yearRevenue
            }
        },
        charts: {
            revenueByDay: revenueByDay.map(item => ({
                day: item._id,
                revenue: item.total
            })),
            jobStatusDistribution: jobStatusDistribution.map(item => ({
                status: item._id,
                count: item.count
            })),
            popularServices: popularServices.map(item => ({
                service: item._id || "Other",
                count: item.count
            }))
        },
        staffPerformance: staffPerformance.slice(0, 5),
        recentActivity: recentBookings.map(booking => ({
            id: booking._id,
            type: "booking",
            customer: booking.customer?.name,
            vehicle: `${booking.vehicle?.brand} ${booking.vehicle?.model}`,
            service: booking.serviceType,
            time: booking.createdAt,
            status: booking.status
        }))
    };
}

// ------------------------------------------------------------------------------------------------------------------------
// Staff Dashboard
// ------------------------------------------------------------------------------------------------------------------------
async function getStaffDashboard(staffId) {
    // Get date ranges
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));

    // Get all jobs assigned to this staff
    const assignedJobs = await Job.find({ assignedStaff: staffId })
        .populate({
            path: 'booking',
            populate: [
                { path: 'customer', select: 'name phone' },
                { path: 'vehicle', select: 'vehicleNumber brand model' }
            ]
        })
        .sort({ createdAt: -1 });

    const jobIds = assignedJobs.map(job => job._id);

    // Get counts
    const [
        totalJobs,
        pendingJobs,
        inProgressJobs,
        completedJobs,
        todayJobs,
        weekJobs,
        totalInspections,
        todayEarnings,
        weekEarnings,
        urgentJobs,
        recentInspections
    ] = await Promise.all([
        // Job counts
        assignedJobs.length,
        assignedJobs.filter(job => 
            ["Assigned", "Inspection", "Waiting Approval"].includes(job.jobStatus)
        ).length,
        assignedJobs.filter(job => job.jobStatus === "Working").length,
        assignedJobs.filter(job => 
            ["Completed", "Delivered"].includes(job.jobStatus)
        ).length,
        
        // Time-based counts
        assignedJobs.filter(job => job.createdAt >= startOfDay).length,
        assignedJobs.filter(job => job.createdAt >= startOfWeek).length,
        
        // Inspections
        Inspection.countDocuments({ 
            $or: [{ job: { $in: jobIds } }, { inspectedBy: staffId }] 
        }),
        
        // Earnings
        calculateStaffEarnings(staffId, startOfDay),
        calculateStaffEarnings(staffId, startOfWeek),
        
        // Urgent jobs
        assignedJobs.filter(job => job.priority === "Urgent").length,
        
        // Recent inspections
        Inspection.find({ 
            $or: [{ job: { $in: jobIds } }, { inspectedBy: staffId }] 
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate({
            path: 'job',
            populate: {
                path: 'booking',
                populate: 'vehicle'
            }
        })
    ]);

    // Get estimates created by this staff (through jobs)
    const estimates = await Estimate.find({ job: { $in: jobIds } });
    const approvedEstimates = estimates.filter(est => est.approvalStatus === "Approved").length;
    const approvalRate = estimates.length > 0 
        ? (approvedEstimates / estimates.length) * 100 
        : 0;

    // Calculate average job completion time
    const completedJobsWithTime = assignedJobs.filter(job => 
        job.startTime && job.endTime && 
        ["Completed", "Delivered"].includes(job.jobStatus)
    );
    
    let avgCompletionTime = 0;
    if (completedJobsWithTime.length > 0) {
        const totalTime = completedJobsWithTime.reduce((sum, job) => {
            return sum + (job.endTime - job.startTime);
        }, 0);
        avgCompletionTime = totalTime / completedJobsWithTime.length / (1000 * 60 * 60); // in hours
    }

    // Prepare current tasks (jobs in progress)
    const currentTasks = assignedJobs
        .filter(job => ["Assigned", "Inspection", "Working"].includes(job.jobStatus))
        .slice(0, 5)
        .map(job => ({
            id: job._id,
            jobId: job._id.toString().slice(-6),
            status: job.jobStatus,
            priority: job.priority,
            vehicle: `${job.booking?.vehicle?.brand} ${job.booking?.vehicle?.model}`,
            vehicleNumber: job.booking?.vehicle?.vehicleNumber,
            customer: job.booking?.customer?.name,
            serviceType: job.booking?.serviceType,
            createdAt: job.createdAt
        }));

    return {
        role: "staff",
        stats: {
            totalJobs,
            pendingJobs,
            inProgressJobs,
            completedJobs,
            todayJobs,
            weekJobs,
            totalInspections,
            urgentJobs,
            earnings: {
                today: todayEarnings,
                week: weekEarnings
            },
            approvalRate: Math.round(approvalRate * 10) / 10,
            avgCompletionTime: Math.round(avgCompletionTime * 10) / 10
        },
        currentTasks,
        recentInspections: recentInspections.map(insp => ({
            id: insp._id,
            vehicle: insp.job?.booking?.vehicle?.vehicleNumber,
            issues: insp.issuesFound?.length || 0,
            time: insp.createdAt
        })),
        performance: {
            jobsByStatus: {
                pending: pendingJobs,
                inProgress: inProgressJobs,
                completed: completedJobs
            },
            priority: {
                normal: assignedJobs.filter(job => job.priority !== "Urgent").length,
                urgent: urgentJobs
            }
        }
    };
}

// ------------------------------------------------------------------------------------------------------------------------
// Customer Dashboard
// ------------------------------------------------------------------------------------------------------------------------
async function getCustomerDashboard(customerId) {
    // Get customer's vehicles
    const vehicles = await Vehicle.find({ userId: customerId });

    // Get bookings
    const bookings = await Booking.find({ customer: customerId })
        .populate('vehicle')
        .sort({ createdAt: -1 });

    const bookingIds = bookings.map(b => b._id);

    // Get jobs from bookings
    const jobs = await Job.find({ booking: { $in: bookingIds } })
        .populate('assignedStaff', 'name');

    const jobIds = jobs.map(j => j._id);

    // Get invoices
    const invoices = await Invoice.find({ job: { $in: jobIds } });

    // Calculate stats
    const totalVehicles = vehicles.length;
    const totalServices = bookings.length;
    const activeServices = jobs.filter(job => 
        ["Assigned", "Inspection", "Waiting Approval", "Working"].includes(job.jobStatus)
    ).length;
    const completedServices = jobs.filter(job => 
        ["Completed", "Delivered"].includes(job.jobStatus)
    ).length;
    
    const totalSpent = invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
    const pendingPayments = invoices
        .filter(inv => inv.paymentStatus !== "Paid")
        .reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

    // Get upcoming appointments
    const upcomingAppointments = bookings
        .filter(booking => 
            booking.appointmentDate && 
            new Date(booking.appointmentDate) > new Date() &&
            booking.status === "Approved"
        )
        .slice(0, 3);

    // Get active services
    const activeServicesList = jobs
        .filter(job => ["Assigned", "Inspection", "Working"].includes(job.jobStatus))
        .slice(0, 3)
        .map(job => {
            const booking = bookings.find(b => b._id.toString() === job.booking?.toString());
            return {
                id: job._id,
                jobId: job._id.toString().slice(-6),
                status: job.jobStatus,
                vehicle: booking?.vehicle?.vehicleNumber,
                serviceType: booking?.serviceType,
                assignedStaff: job.assignedStaff?.name,
                startTime: job.startTime
            };
        });

    // Get recent activity
    const recentActivity = [
        ...bookings.slice(0, 3).map(booking => ({
            id: booking._id,
            type: "booking",
            description: `Service booked for ${booking.vehicle?.vehicleNumber}`,
            date: booking.createdAt,
            status: booking.status
        })),
        ...jobs.slice(0, 3).map(job => {
            const booking = bookings.find(b => b._id.toString() === job.booking?.toString());
            return {
                id: job._id,
                type: "job",
                description: `Service ${job.jobStatus.toLowerCase()} for ${booking?.vehicle?.vehicleNumber}`,
                date: job.updatedAt,
                status: job.jobStatus
            };
        })
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

    // Service history by vehicle
    const serviceByVehicle = vehicles.map(vehicle => {
        const vehicleBookings = bookings.filter(b => 
            b.vehicle?._id.toString() === vehicle._id.toString()
        );
        const vehicleBookingIds = vehicleBookings.map(b => b._id);
        const vehicleJobs = jobs.filter(j => 
            vehicleBookingIds.includes(j.booking?.toString())
        );
        const vehicleJobIds = vehicleJobs.map(j => j._id);
        const vehicleInvoices = invoices.filter(i => 
            vehicleJobIds.includes(i.job?.toString())
        );

        return {
            vehicleId: vehicle._id,
            vehicleNumber: vehicle.vehicleNumber,
            model: `${vehicle.brand} ${vehicle.model}`,
            serviceCount: vehicleBookings.length,
            totalSpent: vehicleInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0),
            lastService: vehicleJobs.length > 0 
                ? vehicleJobs.sort((a, b) => b.createdAt - a.createdAt)[0].createdAt
                : null
        };
    });

    return {
        role: "customer",
        stats: {
            totalVehicles,
            totalServices,
            activeServices,
            completedServices,
            totalSpent,
            pendingPayments,
            upcomingAppointments: upcomingAppointments.length
        },
        vehicles: vehicles.map(v => ({
            id: v._id,
            number: v.vehicleNumber,
            brand: v.brand,
            model: v.model,
            variant: v.variant,
            fuelType: v.fuelType
        })),
        serviceByVehicle,
        activeServices: activeServicesList,
        upcomingAppointments: upcomingAppointments.map(apt => ({
            id: apt._id,
            vehicle: apt.vehicle?.vehicleNumber,
            serviceType: apt.serviceType,
            date: apt.appointmentDate,
            status: apt.status
        })),
        recentActivity,
        charts: {
            spendingByVehicle: serviceByVehicle.map(item => ({
                vehicle: item.vehicleNumber,
                amount: item.totalSpent
            })),
            serviceStatus: {
                active: activeServices,
                completed: completedServices,
                pending: totalServices - activeServices - completedServices
            }
        }
    };
}

// ------------------------------------------------------------------------------------------------------------------------
// Helper Functions
// ------------------------------------------------------------------------------------------------------------------------

async function calculateRevenue(startDate) {
    const invoices = await Invoice.find({
        createdAt: { $gte: startDate },
        paymentStatus: "Paid"
    });
    return invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
}

async function calculateStaffEarnings(staffId, startDate) {
    const jobs = await Job.find({
        assignedStaff: staffId,
        endTime: { $gte: startDate },
        jobStatus: { $in: ["Completed", "Delivered"] }
    });
    
    const jobIds = jobs.map(job => job._id);
    const estimates = await Estimate.find({ job: { $in: jobIds } });
    
    let earnings = 0;
    estimates.forEach(estimate => {
        if (estimate.items) {
            estimate.items.forEach(item => {
                earnings += item.labourCharge || 0;
            });
        }
    });
    
    return earnings;
}

async function getStaffPerformance() {
    const staff = await User.find({ role: "staff" }).select('name');
    
    const performance = await Promise.all(staff.map(async (s) => {
        const jobs = await Job.find({ assignedStaff: s._id });
        const completedJobs = jobs.filter(job => 
            ["Completed", "Delivered"].includes(job.jobStatus)
        ).length;
        
        return {
            name: s.name,
            totalJobs: jobs.length,
            completedJobs,
            completionRate: jobs.length > 0 
                ? Math.round((completedJobs / jobs.length) * 100) 
                : 0
        };
    }));
    
    return performance.sort((a, b) => b.completedJobs - a.completedJobs);
}

async function getRevenueByDay(days) {
    const dates = [];
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        dates.push(date);
    }

    const revenueData = await Promise.all(dates.map(async (date) => {
        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);
        
        const invoices = await Invoice.find({
            createdAt: { $gte: date, $lt: nextDate },
            paymentStatus: "Paid"
        });
        
        const total = invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
        
        return {
            _id: date.toLocaleDateString('en-US', { weekday: 'short' }),
            total
        };
    }));

    return revenueData;
}

module.exports = router;