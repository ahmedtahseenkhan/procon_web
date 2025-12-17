const { pool } = require('../config/db');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

async function exportFinancials(req, res) {
  try {
    const { format, dateRange, machineFilter, groupFilter } = req.query;
    const companyId = req.user.company_id;

    // Build query
    let query = `
      SELECT 
        fs.summary_date,
        fs.device_id,
        fs.total_cash_in,
        fs.transaction_count,
        d.nickname,
        d.group_name
      FROM financial_summary fs
      LEFT JOIN devices d ON fs.device_id = d.device_id
      WHERE fs.company_id = $1
    `;
    const params = [companyId];
    let paramCount = 2;

    // Date filter
    if (dateRange) {
      const now = new Date();
      let startDate;
      if (dateRange === 'last7days') {
        startDate = new Date(now.setDate(now.getDate() - 7));
      } else if (dateRange === 'last30days') {
        startDate = new Date(now.setDate(now.getDate() - 30));
      } else if (dateRange === 'last90days') {
        startDate = new Date(now.setDate(now.getDate() - 90));
      } else if (dateRange === 'lastyear') {
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      }

      if (startDate) {
        query += ` AND fs.summary_date >= $${paramCount++}`;
        params.push(startDate.toISOString().split('T')[0]);
      }
    }

    // Machine/Group filters
    if (machineFilter && machineFilter !== 'all') {
      // Assuming machineFilter is a group name for now based on frontend options, 
      // or we might need to adjust if it sends specific device IDs.
      // The frontend sends 'group-a', etc. for machineFilter too in the mock.
      // Let's assume it might send a device ID or we ignore if it's just 'all'
    }

    if (groupFilter && groupFilter !== 'all') {
      query += ` AND d.group_name = $${paramCount++}`;
      params.push(groupFilter);
    }

    query += ` ORDER BY fs.summary_date DESC`;

    const { rows } = await pool.query(query, params);

    if (format === 'pdf') {
      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=financial_report.pdf');

      doc.pipe(res);

      doc.fontSize(20).text('Financial Performance Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`);
      doc.text(`Company ID: ${companyId}`);
      doc.moveDown();

      // Table Header
      const tableTop = 150;
      let y = tableTop;

      doc.font('Helvetica-Bold');
      doc.text('Date', 50, y);
      doc.text('Device', 150, y);
      doc.text('Group', 250, y);
      doc.text('Trans. Count', 350, y);
      doc.text('Total Cash In', 450, y);

      y += 20;
      doc.font('Helvetica');
      doc.moveTo(50, y).lineTo(550, y).stroke();
      y += 10;

      let totalRevenue = 0;

      rows.forEach(row => {
        if (y > 700) {
          doc.addPage();
          y = 50;
        }

        doc.text(new Date(row.summary_date).toLocaleDateString(), 50, y);
        doc.text(row.nickname || row.device_id, 150, y);
        doc.text(row.group_name || '-', 250, y);
        doc.text(row.transaction_count.toString(), 350, y);
        doc.text(`$${Number(row.total_cash_in).toFixed(2)}`, 450, y);

        totalRevenue += Number(row.total_cash_in);
        y += 20;
      });

      doc.moveDown();
      doc.font('Helvetica-Bold').text(`Total Revenue: $${totalRevenue.toFixed(2)}`, 450, y + 20);

      doc.end();

    } else if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Financials');

      sheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Device ID', key: 'deviceId', width: 20 },
        { header: 'Nickname', key: 'nickname', width: 20 },
        { header: 'Group', key: 'group', width: 15 },
        { header: 'Transactions', key: 'count', width: 15 },
        { header: 'Cash In', key: 'cashIn', width: 15 },
      ];

      rows.forEach(row => {
        sheet.addRow({
          date: new Date(row.summary_date).toLocaleDateString(),
          deviceId: row.device_id,
          nickname: row.nickname || '',
          group: row.group_name || '',
          count: row.transaction_count,
          cashIn: Number(row.total_cash_in)
        });
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=financial_report.xlsx');

      await workbook.xlsx.write(res);
      res.end();
    } else {
      res.status(400).json({ error: 'invalid_format' });
    }

  } catch (e) {
    console.error('Export error:', e);
    res.status(500).json({ error: 'server_error' });
  }
}

async function getFinancialStats(req, res) {
  try {
    const companyId = req.user.company_id;
    const { year, month } = req.query;

    // Build date filter
    let dateFilter = '';
    const params = [companyId];
    let paramCount = 2;

    if (year && month) {
      // Specific month
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
      dateFilter = ` AND fs.summary_date >= $${paramCount++} AND fs.summary_date <= $${paramCount++}`;
      params.push(startDate, endDate);
    } else if (year) {
      // Entire year
      dateFilter = ` AND EXTRACT(YEAR FROM fs.summary_date) = $${paramCount++}`;
      params.push(year);
    }

    // Total Revenue and Vouchers
    const revenueQuery = `
      SELECT 
        SUM(total_cash_in) as total_revenue,
        SUM(total_vouchers) as total_vouchers,
        SUM(transaction_count) as total_transactions
      FROM financial_summary fs
      WHERE fs.company_id = $1 ${dateFilter}
    `;
    const revenueResult = await pool.query(revenueQuery, params);

    const totalRevenue = Number(revenueResult.rows[0]?.total_revenue || 0);
    const totalVouchers = Number(revenueResult.rows[0]?.total_vouchers || 0);
    const totalTransactions = Number(revenueResult.rows[0]?.total_transactions || 0);
    const netWin = totalRevenue - totalVouchers;
    const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Calculate payout rate (vouchers / revenue)
    const payoutRate = totalRevenue > 0 ? (totalVouchers / totalRevenue) * 100 : 0;

    res.json({
      totalRevenue,
      totalVouchers,
      netWin,
      totalTransactions,
      avgTransaction,
      payoutRate,
    });
  } catch (e) {
    console.error('Financial stats error:', e);
    res.status(500).json({ error: 'server_error' });
  }
}

async function getFinancialChart(req, res) {
  try {
    const companyId = req.user.company_id;
    const { year, month, groupBy = 'day' } = req.query;

    let dateFilter = '';
    const params = [companyId];
    let paramCount = 2;
    let groupByClause = '';

    if (year && month) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
      dateFilter = ` AND fs.summary_date >= $${paramCount++} AND fs.summary_date <= $${paramCount++}`;
      params.push(startDate, endDate);
      groupByClause = 'fs.summary_date';
    } else if (year) {
      dateFilter = ` AND EXTRACT(YEAR FROM fs.summary_date) = $${paramCount++}`;
      params.push(year);
      groupByClause = `TO_CHAR(fs.summary_date, 'YYYY-MM')`;
    } else {
      // Default: last 30 days
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      dateFilter = ` AND fs.summary_date >= $${paramCount++}`;
      params.push(startDate.toISOString().split('T')[0]);
      groupByClause = 'fs.summary_date';
    }

    const chartQuery = `
      SELECT 
        ${groupByClause} as period,
        SUM(total_cash_in) as cash_in,
        SUM(total_vouchers) as cash_out
      FROM financial_summary fs
      WHERE fs.company_id = $1 ${dateFilter}
      GROUP BY ${groupByClause}
      ORDER BY period ASC
    `;

    const { rows } = await pool.query(chartQuery, params);

    const chartData = rows.map(row => ({
      name: row.period,
      monthlyIn: Number(row.cash_in || 0),
      monthlyOut: Number(row.cash_out || 0),
      profit: Number(row.cash_in || 0) - Number(row.cash_out || 0),
      revenue: Number(row.cash_in || 0),
    }));

    res.json({ chartData });
  } catch (e) {
    console.error('Financial chart error:', e);
    res.status(500).json({ error: 'server_error' });
  }
}

async function getMachinePerformance(req, res) {
  try {
    const companyId = req.user.company_id;
    const { year, month, groupFilter } = req.query;

    let dateFilter = '';
    const params = [companyId];
    let paramCount = 2;

    if (year && month) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
      dateFilter = ` AND fs.summary_date >= $${paramCount++} AND fs.summary_date <= $${paramCount++}`;
      params.push(startDate, endDate);
    } else if (year) {
      dateFilter = ` AND EXTRACT(YEAR FROM fs.summary_date) = $${paramCount++}`;
      params.push(year);
    }

    let groupFilterClause = '';
    if (groupFilter && groupFilter !== 'all' && groupFilter !== 'All Machines') {
      groupFilterClause = ` AND d.group_name = $${paramCount++}`;
      params.push(groupFilter);
    }

    const performanceQuery = `
      SELECT 
        fs.device_id,
        d.nickname,
        d.group_name,
        d.is_online,
        SUM(fs.total_cash_in) as total_revenue,
        SUM(fs.total_vouchers) as total_vouchers,
        SUM(fs.transaction_count) as transaction_count,
        COUNT(DISTINCT fs.summary_date) as days_active
      FROM financial_summary fs
      LEFT JOIN devices d ON fs.device_id = d.device_id
      WHERE fs.company_id = $1 ${dateFilter} ${groupFilterClause}
      GROUP BY fs.device_id, d.nickname, d.group_name, d.is_online
      ORDER BY total_revenue DESC
    `;

    const { rows } = await pool.query(performanceQuery, params);

    const machines = rows.map(row => {
      const totalRevenue = Number(row.total_revenue || 0);
      const totalVouchers = Number(row.total_vouchers || 0);
      const daysActive = Number(row.days_active || 1);
      const revenuePerDay = daysActive > 0 ? totalRevenue / daysActive : 0;

      // Mock uptime and efficiency for now (can be enhanced later)
      const uptime = row.is_online ? '98.5%' : '85.0%';
      const efficiency = '92%';

      return {
        id: row.device_id,
        name: row.nickname || row.device_id,
        groupName: row.group_name,
        uptime,
        efficiency,
        revenuePerDay: revenuePerDay.toFixed(2),
        totalRevenue: totalRevenue.toFixed(2),
        netWin: (totalRevenue - totalVouchers).toFixed(2),
        transactionCount: row.transaction_count,
      };
    });

    res.json({ machines });
  } catch (e) {
    console.error('Machine performance error:', e);
    res.status(500).json({ error: 'server_error' });
  }
}

module.exports = { exportFinancials, getFinancialStats, getFinancialChart, getMachinePerformance };
