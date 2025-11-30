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

module.exports = { exportFinancials };
