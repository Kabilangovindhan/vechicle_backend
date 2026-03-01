const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// Import models
const Booking = require("../../models/booking");
const Job = require("../../models/job");
const Inspection = require("../../models/inspection");
const Estimate = require("../../models/estimate");
const Invoice = require("../../models/invoice");
const Vehicle = require("../../models/vehicle");
const User = require("../../models/user");

// ------------------------------------------------------------------------------------------------------------------------
// GET /api/serviceHistory/:customerId - Get complete service history for a customer
// ------------------------------------------------------------------------------------------------------------------------
router.get("/:customerId", async (req, res) => {
    try {
        const { customerId } = req.params;

        // Verify customer exists
        const customer = await User.findById(customerId);
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        // Get all vehicles owned by this customer
        const vehicles = await Vehicle.find({ userId: customerId })
            .sort({ createdAt: -1 });

        const vehicleIds = vehicles.map(v => v._id);

        // Get all bookings for this customer's vehicles
        const bookings = await Booking.find({ 
            customer: customerId,
            vehicle: { $in: vehicleIds }
        })
        .populate('vehicle')
        .sort({ createdAt: -1 });

        const bookingIds = bookings.map(b => b._id);

        // Get all jobs from these bookings
        const jobs = await Job.find({ 
            booking: { $in: bookingIds } 
        })
        .populate('assignedStaff', 'name')
        .sort({ createdAt: -1 });

        const jobIds = jobs.map(j => j._id);

        // Get all related data
        const [inspections, estimates, invoices] = await Promise.all([
            Inspection.find({ job: { $in: jobIds } }),
            Estimate.find({ job: { $in: jobIds } }),
            Invoice.find({ job: { $in: jobIds } })
        ]);

        // Calculate customer statistics
        const stats = {
            totalVehicles: vehicles.length,
            totalBookings: bookings.length,
            totalJobs: jobs.length,
            completedJobs: jobs.filter(job => 
                job.jobStatus === "Completed" || job.jobStatus === "Delivered"
            ).length,
            inProgressJobs: jobs.filter(job => 
                ["Assigned", "Inspection", "Waiting Approval", "Working"].includes(job.jobStatus)
            ).length,
            totalSpent: invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0),
            pendingPayments: invoices
                .filter(inv => inv.paymentStatus !== "Paid")
                .reduce((sum, inv) => sum + (inv.grandTotal || 0), 0),
            totalEstimates: estimates.length,
            approvedEstimates: estimates.filter(est => est.approvalStatus === "Approved").length
        };

        // Group vehicles with their service history
        const vehiclesWithHistory = await Promise.all(vehicles.map(async (vehicle) => {
            const vehicleBookings = bookings.filter(b => 
                b.vehicle && b.vehicle._id.toString() === vehicle._id.toString()
            );
            
            const vehicleBookingIds = vehicleBookings.map(b => b._id);
            const vehicleJobs = jobs.filter(j => 
                vehicleBookingIds.includes(j.booking?.toString())
            );
            const vehicleJobIds = vehicleJobs.map(j => j._id);
            
            const vehicleInspections = inspections.filter(i => 
                vehicleJobIds.includes(i.job?.toString())
            );
            
            const vehicleEstimates = estimates.filter(e => 
                vehicleJobIds.includes(e.job?.toString())
            );
            
            const vehicleInvoices = invoices.filter(i => 
                vehicleJobIds.includes(i.job?.toString())
            );

            const vehicleStats = {
                totalBookings: vehicleBookings.length,
                totalJobs: vehicleJobs.length,
                completedJobs: vehicleJobs.filter(j => 
                    j.jobStatus === "Completed" || j.jobStatus === "Delivered"
                ).length,
                totalSpent: vehicleInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0),
                lastService: vehicleJobs.length > 0 
                    ? vehicleJobs.sort((a, b) => b.createdAt - a.createdAt)[0].createdAt 
                    : null
            };

            return {
                vehicleId: vehicle._id,
                vehicleNumber: vehicle.vehicleNumber,
                brand: vehicle.brand,
                model: vehicle.model,
                variant: vehicle.variant,
                fuelType: vehicle.fuelType,
                transmission: vehicle.transmission,
                color: vehicle.color,
                year: vehicle.year,
                lastServiceDate: vehicle.lastServiceDate,
                stats: vehicleStats,
                serviceHistory: vehicleBookings.map(booking => {
                    const bookingJobs = vehicleJobs.filter(j => 
                        j.booking?.toString() === booking._id.toString()
                    );
                    
                    return {
                        bookingId: booking._id,
                        bookingDate: booking.createdAt,
                        serviceType: booking.serviceType,
                        problemDescription: booking.problemDescription,
                        appointmentDate: booking.appointmentDate,
                        bookingStatus: booking.status,
                        jobs: bookingJobs.map(job => {
                            const jobInspections = vehicleInspections.filter(i => 
                                i.job?.toString() === job._id.toString()
                            );
                            const jobEstimates = vehicleEstimates.filter(e => 
                                e.job?.toString() === job._id.toString()
                            );
                            const jobInvoices = vehicleInvoices.filter(i => 
                                i.job?.toString() === job._id.toString()
                            );

                            return {
                                jobId: job._id,
                                jobStatus: job.jobStatus,
                                priority: job.priority,
                                assignedStaff: job.assignedStaff?.name || "Unassigned",
                                startTime: job.startTime,
                                endTime: job.endTime,
                                createdAt: job.createdAt,
                                inspections: jobInspections.map(insp => ({
                                    inspectionId: insp._id,
                                    issuesFound: insp.issuesFound,
                                    remarks: insp.remarks,
                                    inspectedAt: insp.createdAt
                                })),
                                estimates: jobEstimates.map(est => ({
                                    estimateId: est._id,
                                    items: est.items,
                                    tax: est.tax,
                                    grandTotal: est.grandTotal,
                                    approvalStatus: est.approvalStatus,
                                    createdAt: est.createdAt
                                })),
                                invoices: jobInvoices.map(inv => ({
                                    invoiceId: inv._id,
                                    gst: inv.gst,
                                    grandTotal: inv.grandTotal,
                                    paymentStatus: inv.paymentStatus,
                                    paymentMethod: inv.paymentMethod,
                                    createdAt: inv.createdAt
                                }))
                            };
                        })
                    };
                })
            };
        }));

        // Get recent activity (last 5 jobs)
        const recentActivity = jobs.slice(0, 5).map(job => {
            const booking = bookings.find(b => b._id.toString() === job.booking?.toString());
            const vehicle = vehicles.find(v => v._id.toString() === booking?.vehicle?.toString());
            
            return {
                jobId: job._id,
                jobStatus: job.jobStatus,
                priority: job.priority,
                date: job.createdAt,
                vehicleNumber: vehicle?.vehicleNumber,
                serviceType: booking?.serviceType,
                staffName: job.assignedStaff?.name
            };
        });

        res.json({
            success: true,
            customer: {
                id: customer._id,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                joinedDate: customer.createdAt
            },
            summary: stats,
            vehicles: vehiclesWithHistory,
            recentActivity,
            dateRange: {
                firstBooking: bookings.length > 0 ? bookings[bookings.length - 1].createdAt : null,
                lastBooking: bookings.length > 0 ? bookings[0].createdAt : null
            }
        });

    } catch (error) {
        console.error("Error fetching service history:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to fetch service history",
            error: error.message 
        });
    }
});

// ------------------------------------------------------------------------------------------------------------------------
// GET /api/serviceHistory/:customerId/summary - Get summary of customer service history
// ------------------------------------------------------------------------------------------------------------------------
router.get("/:customerId/summary", async (req, res) => {
    try {
        const { customerId } = req.params;

        // Get customer info
        const customer = await User.findById(customerId).select('name email phone createdAt');

        // Get vehicles
        const vehicles = await Vehicle.find({ userId: customerId });

        // Get bookings
        const bookings = await Booking.find({ customer: customerId });

        // Get jobs through bookings
        const bookingIds = bookings.map(b => b._id);
        const jobs = await Job.find({ booking: { $in: bookingIds } });

        // Get invoices
        const jobIds = jobs.map(j => j._id);
        const invoices = await Invoice.find({ job: { $in: jobIds } });

        // Calculate summary
        const summary = {
            customerInfo: customer,
            totalVehicles: vehicles.length,
            totalServices: bookings.length,
            completedServices: jobs.filter(j => 
                j.jobStatus === "Completed" || j.jobStatus === "Delivered"
            ).length,
            totalSpent: invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0),
            vehicles: vehicles.map(v => ({
                number: v.vehicleNumber,
                model: `${v.brand} ${v.model}`,
                serviceCount: bookings.filter(b => 
                    b.vehicle?.toString() === v._id.toString()
                ).length
            }))
        };

        res.json({
            success: true,
            summary
        });

    } catch (error) {
        console.error("Error fetching service summary:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to fetch service summary",
            error: error.message 
        });
    }
});

// ------------------------------------------------------------------------------------------------------------------------
// GET /api/serviceHistory/:customerId/vehicle/:vehicleId - Get service history for specific vehicle
// ------------------------------------------------------------------------------------------------------------------------
router.get("/:customerId/vehicle/:vehicleId", async (req, res) => {
    try {
        const { customerId, vehicleId } = req.params;

        // Verify vehicle belongs to customer
        const vehicle = await Vehicle.findOne({ 
            _id: vehicleId, 
            userId: customerId 
        });

        if (!vehicle) {
            return res.status(404).json({
                success: false,
                message: "Vehicle not found or does not belong to customer"
            });
        }

        // Get bookings for this vehicle
        const bookings = await Booking.find({ 
            customer: customerId,
            vehicle: vehicleId 
        }).sort({ createdAt: -1 });

        const bookingIds = bookings.map(b => b._id);

        // Get jobs
        const jobs = await Job.find({ 
            booking: { $in: bookingIds } 
        }).populate('assignedStaff', 'name');

        const jobIds = jobs.map(j => j._id);

        // Get related data
        const [inspections, estimates, invoices] = await Promise.all([
            Inspection.find({ job: { $in: jobIds } }),
            Estimate.find({ job: { $in: jobIds } }),
            Invoice.find({ job: { $in: jobIds } })
        ]);

        // Calculate vehicle statistics
        const stats = {
            totalServices: bookings.length,
            completedServices: jobs.filter(j => 
                j.jobStatus === "Completed" || j.jobStatus === "Delivered"
            ).length,
            totalSpent: invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0),
            lastService: jobs.length > 0 
                ? jobs.sort((a, b) => b.createdAt - a.createdAt)[0].createdAt 
                : null,
            averageServiceCost: invoices.length > 0 
                ? invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0) / invoices.length 
                : 0
        };

        // Service timeline
        const serviceTimeline = bookings.map(booking => {
            const bookingJobs = jobs.filter(j => 
                j.booking?.toString() === booking._id.toString()
            );
            
            const bookingInvoices = invoices.filter(i => 
                bookingJobs.some(j => j._id.toString() === i.job?.toString())
            );

            return {
                bookingId: booking._id,
                date: booking.createdAt,
                serviceType: booking.serviceType,
                problemDescription: booking.problemDescription,
                status: booking.status,
                jobs: bookingJobs.map(job => ({
                    status: job.jobStatus,
                    priority: job.priority,
                    staff: job.assignedStaff?.name,
                    completedAt: job.endTime
                })),
                totalCost: bookingInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0),
                paymentStatus: bookingInvoices.some(inv => inv.paymentStatus === "Paid") ? "Paid" : "Pending"
            };
        });

        res.json({
            success: true,
            vehicle: {
                id: vehicle._id,
                number: vehicle.vehicleNumber,
                brand: vehicle.brand,
                model: vehicle.model,
                variant: vehicle.variant,
                fuelType: vehicle.fuelType,
                transmission: vehicle.transmission,
                color: vehicle.color,
                year: vehicle.year,
                registrationDate: vehicle.createdAt
            },
            stats,
            serviceTimeline,
            totalServices: bookings.length
        });

    } catch (error) {
        console.error("Error fetching vehicle service history:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to fetch vehicle service history",
            error: error.message 
        });
    }
});

// ------------------------------------------------------------------------------------------------------------------------
// GET /api/serviceHistory/:customerId/date-range - Get service history within date range
// ------------------------------------------------------------------------------------------------------------------------
router.get("/:customerId/date-range", async (req, res) => {
    try {
        const { customerId } = req.params;
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

        // Get bookings within date range
        const bookings = await Booking.find({
            customer: customerId,
            createdAt: { $gte: start, $lte: end }
        }).populate('vehicle');

        const bookingIds = bookings.map(b => b._id);

        // Get jobs
        const jobs = await Job.find({ 
            booking: { $in: bookingIds } 
        });

        const jobIds = jobs.map(j => j._id);

        // Get invoices
        const invoices = await Invoice.find({ 
            job: { $in: jobIds } 
        });

        const totalSpent = invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

        // Group by month
        const monthlyData = {};
        bookings.forEach(booking => {
            const month = booking.createdAt.toLocaleString('default', { month: 'long', year: 'numeric' });
            if (!monthlyData[month]) {
                monthlyData[month] = {
                    count: 0,
                    total: 0
                };
            }
            monthlyData[month].count++;
            
            // Find invoice for this booking's job
            const bookingJob = jobs.find(j => j.booking?.toString() === booking._id.toString());
            if (bookingJob) {
                const invoice = invoices.find(i => i.job?.toString() === bookingJob._id.toString());
                if (invoice) {
                    monthlyData[month].total += invoice.grandTotal || 0;
                }
            }
        });

        res.json({
            success: true,
            dateRange: { start: startDate, end: endDate },
            summary: {
                totalServices: bookings.length,
                totalSpent,
                averagePerService: bookings.length > 0 ? totalSpent / bookings.length : 0
            },
            bookings: bookings.map(booking => ({
                bookingId: booking._id,
                date: booking.createdAt,
                serviceType: booking.serviceType,
                vehicleNumber: booking.vehicle?.vehicleNumber,
                status: booking.status
            })),
            monthlyBreakdown: monthlyData
        });

    } catch (error) {
        console.error("Error fetching service history by date range:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to fetch service history",
            error: error.message 
        });
    }
});

// ------------------------------------------------------------------------------------------------------------------------
// GET /api/serviceHistory/:customerId/analytics - Get service analytics for customer
// ------------------------------------------------------------------------------------------------------------------------
router.get("/:customerId/analytics", async (req, res) => {
    try {
        const { customerId } = req.params;

        // Get all data
        const vehicles = await Vehicle.find({ userId: customerId });
        const bookings = await Booking.find({ customer: customerId });
        const bookingIds = bookings.map(b => b._id);
        const jobs = await Job.find({ booking: { $in: bookingIds } });
        const jobIds = jobs.map(j => j._id);
        const invoices = await Invoice.find({ job: { $in: jobIds } });

        // Service frequency analysis
        const serviceFrequency = {};
        vehicles.forEach(vehicle => {
            const vehicleBookings = bookings.filter(b => 
                b.vehicle?.toString() === vehicle._id.toString()
            );
            serviceFrequency[vehicle.vehicleNumber] = vehicleBookings.length;
        });

        // Service type preferences
        const serviceTypePreferences = {};
        bookings.forEach(booking => {
            const type = booking.serviceType || "Other";
            serviceTypePreferences[type] = (serviceTypePreferences[type] || 0) + 1;
        });

        // Spending trends by month
        const spendingTrends = {};
        invoices.forEach(invoice => {
            if (invoice.paymentStatus === "Paid") {
                const month = invoice.createdAt.toLocaleString('default', { month: 'long', year: 'numeric' });
                spendingTrends[month] = (spendingTrends[month] || 0) + (invoice.grandTotal || 0);
            }
        });

        // Average service cost by vehicle
        const avgCostByVehicle = {};
        vehicles.forEach(vehicle => {
            const vehicleBookings = bookings.filter(b => 
                b.vehicle?.toString() === vehicle._id.toString()
            );
            const vehicleBookingIds = vehicleBookings.map(b => b._id);
            const vehicleJobs = jobs.filter(j => 
                vehicleBookingIds.includes(j.booking?.toString())
            );
            const vehicleJobIds = vehicleJobs.map(j => j._id);
            const vehicleInvoices = invoices.filter(i => 
                vehicleJobIds.includes(i.job?.toString())
            );
            
            const total = vehicleInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
            avgCostByVehicle[vehicle.vehicleNumber] = vehicleInvoices.length > 0 
                ? total / vehicleInvoices.length 
                : 0;
        });

        res.json({
            success: true,
            analytics: {
                totalSpent: invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0),
                averageServiceCost: invoices.length > 0 
                    ? invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0) / invoices.length 
                    : 0,
                serviceFrequency,
                serviceTypePreferences,
                spendingTrends,
                avgCostByVehicle,
                vehiclesCount: vehicles.length,
                servicesCount: bookings.length,
                completedServices: jobs.filter(j => 
                    j.jobStatus === "Completed" || j.jobStatus === "Delivered"
                ).length
            }
        });

    } catch (error) {
        console.error("Error fetching service analytics:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to fetch service analytics",
            error: error.message 
        });
    }
});

module.exports = router;