const { pool } = require('../config/db');

async function getDashboardStats(req, res) {
    try {
        const companyId = req.user.company_id;
        const { dateRange, machineFilter, groupFilter, severityFilter } = req.query;

        // 1. Total Revenue (Financial Summary)
        // Default to current month if no dateRange provided, or handle 'month' filter
        let revenueQuery = `
      SELECT 
        SUM(total_cash_in) as total_revenue,
        SUM(total_vouchers) as total_vouchers
      FROM financial_summary fs
      LEFT JOIN devices d ON fs.device_id = d.device_id
      WHERE fs.company_id = $1
    `;
        const revenueParams = [companyId];
        let pCount = 2;

        if (dateRange) {
            const now = new Date();
            let startDate;

            if (dateRange === 'this_month') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            } else if (dateRange === 'last_month') {
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const endDate = new Date(now.getFullYear(), now.getMonth(), 0);
                revenueQuery += ` AND fs.summary_date >= $${pCount++} AND fs.summary_date <= $${pCount++}`;
                revenueParams.push(startDate.toISOString().split('T')[0]);
                revenueParams.push(endDate.toISOString().split('T')[0]);
                startDate = null; // Handled above
            } else if (dateRange === 'last_7_days') {
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
            } else if (dateRange === 'last_30_days') {
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 30);
            } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateRange)) {
                // Specific date
                startDate = new Date(dateRange);
                // If invalid date, ignore
                if (isNaN(startDate.getTime())) {
                    startDate = null;
                } else {
                    // For revenue (summary_date), exact match
                    revenueQuery += ` AND fs.summary_date = $${pCount++}`;
                    revenueParams.push(dateRange);
                    startDate = null; // Quary handled here
                }
            }

            if (startDate) {
                revenueQuery += ` AND fs.summary_date >= $${pCount++}`;
                revenueParams.push(startDate.toISOString().split('T')[0]);
            }
        } else {
            // Default to this month
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            revenueQuery += ` AND fs.summary_date >= $${pCount++}`;
            revenueParams.push(startOfMonth.toISOString().split('T')[0]);
        }

        if (groupFilter && groupFilter !== 'all') {
            revenueQuery += ` AND d.group_name = $${pCount++}`;
            revenueParams.push(groupFilter);
        }

        const revenueResult = await pool.query(revenueQuery, revenueParams);
        const totalRevenue = Number(revenueResult.rows[0]?.total_revenue || 0);
        const totalVouchers = Number(revenueResult.rows[0]?.total_vouchers || 0);
        const totalNetWin = totalRevenue - totalVouchers;


        // 2. Active Machines (Online count)
        let machinesQuery = `SELECT COUNT(*) as count FROM devices WHERE company_id = $1 AND is_online = true`;
        const machinesParams = [companyId];
        if (groupFilter && groupFilter !== 'all') {
            machinesQuery += ` AND group_name = $2`;
            machinesParams.push(groupFilter);
        }
        const machinesResult = await pool.query(machinesQuery, machinesParams);
        const activeMachines = Number(machinesResult.rows[0]?.count || 0);


        // 3. Active Alerts (Unacknowledged)
        let alertsQuery = `
        SELECT COUNT(*) as count 
        FROM device_events de
        LEFT JOIN devices d ON de.device_id = d.device_id
        WHERE de.company_id = $1 
        AND de.is_acknowledged = false 
    `;
        const alertsParams = [companyId];
        let aCount = 2;

        if (severityFilter && severityFilter !== 'all') {
            alertsQuery += ` AND de.severity = $${aCount++}`;
            alertsParams.push(severityFilter.toLowerCase());
        } else {
            if (!severityFilter || severityFilter === 'all') {
                alertsQuery += ` AND (de.severity = 'critical' OR de.severity = 'high')`;
            }
        }

        if (groupFilter && groupFilter !== 'all') {
            alertsQuery += ` AND d.group_name = $${aCount++}`;
            alertsParams.push(groupFilter);
        }

        // Date range for alerts
        if (dateRange) {
            const now = new Date();
            let startDate;
            if (dateRange === 'last_7_days') {
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
            } else if (dateRange === 'last_30_days') {
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 30);
            } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateRange)) {
                // Specific date for alerts (timestamp)
                // Match the whole day from 00:00 to 23:59:59
                const d = new Date(dateRange);
                if (!isNaN(d.getTime())) {
                    const nextDay = new Date(d);
                    nextDay.setDate(d.getDate() + 1);

                    alertsQuery += ` AND de.event_timestamp >= $${aCount++} AND de.event_timestamp < $${aCount++}`;
                    alertsParams.push(d.toISOString());
                    alertsParams.push(nextDay.toISOString());
                    startDate = null; // Handled
                }
            }

            if (startDate) {
                alertsQuery += ` AND de.event_timestamp >= $${aCount++}`;
                alertsParams.push(startDate.toISOString());
            }
        }

        const alertsResult = await pool.query(alertsQuery, alertsParams);
        const activeAlerts = Number(alertsResult.rows[0]?.count || 0);


        // 4. Live Players (Proxy: Unique devices with events in last 15 mins)
        let playersQuery = `
        SELECT COUNT(DISTINCT de.device_id) as count
        FROM device_events de
        LEFT JOIN devices d ON de.device_id = d.device_id
        WHERE de.company_id = $1
        AND de.event_timestamp >= NOW() - INTERVAL '15 minutes'
    `;
        const playersParams = [companyId];
        if (groupFilter && groupFilter !== 'all') {
            playersQuery += ` AND d.group_name = $2`;
            playersParams.push(groupFilter);
        }
        const playersResult = await pool.query(playersQuery, playersParams);
        const livePlayers = Number(playersResult.rows[0]?.count || 0);

        res.json({
            totalRevenue,
            totalVouchers,
            totalNetWin,
            activeMachines,
            activeAlerts,
            livePlayers,
            // Mock changes for now, or calculate if needed
            revenueChange: 12.5,
            machineChange: 3,
            alertChange: -2,
            playerChange: 5.4
        });

    } catch (e) {
        console.error('Dashboard stats error:', e);
        res.status(500).json({ error: 'server_error' });
    }
}

module.exports = { getDashboardStats };
