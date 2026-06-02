import * as Print      from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as Sharing    from 'expo-sharing';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const safeFilename = (name) =>
  name.replace(/[^a-zA-Z0-9]/g, '_');

const dateStamp = () =>
  new Date().toISOString().split('T')[0]; // e.g. 2025-06-02

const groupByDate = (expenses) => {
  const map = {};
  expenses.forEach((e) => {
    const key = new Date(e.date).toLocaleDateString('en-ZA', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
    if (!map[key]) map[key] = [];
    map[key].push(e);
  });
  return Object.entries(map).sort(
    ([a], [b]) => new Date(b) - new Date(a)
  );
};

// ─── CSV Export ───────────────────────────────────────────────────────────────
export const exportAsCSV = async (expenses, categoryName) => {
  const sorted = [...expenses].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  const header = 'Date,Time,Description,Amount (R)\n';

  const rows = sorted
    .map((e) => {
      const d       = new Date(e.date);
      const dateStr = d.toLocaleDateString('en-ZA');
      const timeStr = d.toLocaleTimeString('en-ZA', {
        hour: '2-digit', minute: '2-digit',
      });
      // Wrap note in quotes to handle commas inside text
      const note    = `"${(e.note || 'No description').replace(/"/g, '""')}"`;
      return `${dateStr},${timeStr},${note},${e.amount}`;
    })
    .join('\n');

  const total   = expenses.reduce((s, e) => s + e.amount, 0);
  const summary = `\nTotal,,,${total}`;

  const csv      = header + rows + summary;
  const filename = `${safeFilename(categoryName)}_expenses_${dateStamp()}.csv`;
  const fileUri  = FileSystem.documentDirectory + filename;

  await FileSystem.writeAsStringAsync(fileUri, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('Sharing is not available on this device.');

  await Sharing.shareAsync(fileUri, {
    mimeType:    'text/csv',
    dialogTitle: `Export ${categoryName} Expenses`,
    UTI:         'public.comma-separated-values-text',
  });
};

// ─── PDF Export ───────────────────────────────────────────────────────────────
export const exportAsPDF = async (expenses, categoryName, budgetData, categoryId) => {
  const catBudget = budgetData?.categories?.[categoryId];
  const budgeted  = catBudget?.budgeted || 0;
  const spent     = expenses.reduce((s, e) => s + e.amount, 0);
  const remaining = budgeted - spent;
  const isOver    = remaining < 0;

  const generatedOn = new Date().toLocaleDateString('en-ZA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // ── Build table rows grouped by date ──
  const tableRows = groupByDate(expenses)
    .map(([dateLabel, items]) => {
      const dayTotal = items.reduce((s, e) => s + e.amount, 0);

      const itemRows = items
        .map((e) => {
          const time = new Date(e.date).toLocaleTimeString('en-ZA', {
            hour: '2-digit', minute: '2-digit',
          });
          const note = (e.note || 'No description')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          return `
            <tr>
              <td class="cell">${time}</td>
              <td class="cell">${note}</td>
              <td class="cell right bold">R&nbsp;${e.amount.toLocaleString('en-ZA')}</td>
            </tr>`;
        })
        .join('');

      return `
        <tr class="group-header">
          <td colspan="2" class="group-date">${dateLabel}</td>
          <td class="group-total">R&nbsp;${dayTotal.toLocaleString('en-ZA')}</td>
        </tr>
        ${itemRows}`;
    })
    .join('');

  // ── HTML template ──
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
      background: #fff;
      color: #0F172A;
      padding: 36px 40px;
      font-size: 13px;
    }

    /* ── Header ── */
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2.5px solid #1C1C1E;
      padding-bottom: 20px;
      margin-bottom: 28px;
    }
    .badge {
      display: inline-block;
      background: #1C1C1E;
      color: #fff;
      font-size: 10px;
      font-weight: 800;
      padding: 3px 10px;
      border-radius: 20px;
      margin-bottom: 8px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .report-title {
      font-size: 26px;
      font-weight: 800;
      color: #0F172A;
      letter-spacing: -0.5px;
      line-height: 1.1;
    }
    .report-meta {
      font-size: 12px;
      color: #64748B;
      margin-top: 5px;
    }
    .report-date {
      font-size: 12px;
      color: #94A3B8;
      text-align: right;
    }

    /* ── Summary Stats ── */
    .stats-grid {
      display: flex;
      gap: 12px;
      margin-bottom: 28px;
    }
    .stat-box {
      flex: 1;
      background: #F8FAFC;
      border-radius: 10px;
      padding: 14px 16px;
      border-left: 4px solid #1C1C1E;
    }
    .stat-label {
      font-size: 10px;
      font-weight: 700;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 6px;
    }
    .stat-value {
      font-size: 20px;
      font-weight: 800;
      color: #0F172A;
      letter-spacing: -0.5px;
    }
    .negative { color: #FF3B30; }
    .positive { color: #34C759; }

    /* ── Table ── */
    table {
      width: 100%;
      border-collapse: collapse;
    }
    thead tr {
      background: #1C1C1E;
    }
    thead th {
      padding: 10px 12px;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      text-align: left;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    thead th.right { text-align: right; }

    .group-header { background: #F1F5F9; }
    .group-date {
      padding: 9px 12px;
      font-size: 12px;
      font-weight: 800;
      color: #0F172A;
    }
    .group-total {
      padding: 9px 12px;
      font-size: 12px;
      font-weight: 700;
      color: #64748B;
      text-align: right;
    }

    .cell {
      padding: 9px 12px;
      font-size: 12px;
      color: #374151;
      border-bottom: 1px solid #F1F5F9;
    }
    .right { text-align: right; }
    .bold  { font-weight: 700; color: #0F172A; }

    /* ── Footer row ── */
    .total-row td {
      background: #1C1C1E;
      padding: 12px;
      font-size: 14px;
      font-weight: 800;
      color: #fff;
    }
    .total-row td.total-amount {
      text-align: right;
      color: #34C759;
      font-size: 16px;
    }

    /* ── Page footer ── */
    .page-footer {
      margin-top: 28px;
      padding-top: 14px;
      border-top: 1px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #94A3B8;
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="report-header">
    <div>
      <div class="badge">Student Budget App</div>
      <div class="report-title">${categoryName} Expenses</div>
      <div class="report-meta">${expenses.length} transaction${expenses.length !== 1 ? 's' : ''} recorded</div>
    </div>
    <div class="report-date">Generated on<br/>${generatedOn}</div>
  </div>

  <!-- Summary stats -->
  <div class="stats-grid">
    <div class="stat-box">
      <div class="stat-label">Total Spent</div>
      <div class="stat-value negative">R&nbsp;${spent.toLocaleString('en-ZA')}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Monthly Budget</div>
      <div class="stat-value">R&nbsp;${budgeted.toLocaleString('en-ZA')}</div>
    </div>
    <div class="stat-box">
      <div class="stat-label">${isOver ? 'Over by' : 'Remaining'}</div>
      <div class="stat-value ${isOver ? 'negative' : 'positive'}">
        R&nbsp;${Math.abs(remaining).toLocaleString('en-ZA')}
      </div>
    </div>
    <div class="stat-box">
      <div class="stat-label">Transactions</div>
      <div class="stat-value">${expenses.length}</div>
    </div>
  </div>

  <!-- Expenses table -->
  <table>
    <thead>
      <tr>
        <th style="width:70px">Time</th>
        <th>Description</th>
        <th class="right" style="width:100px">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="2">TOTAL</td>
        <td class="total-amount">R&nbsp;${spent.toLocaleString('en-ZA')}</td>
      </tr>
    </tfoot>
  </table>

  <!-- Page footer -->
  <div class="page-footer">
    <span>Student Budget App — For personal record keeping only</span>
    <span>${new Date().toLocaleDateString('en-ZA')}</span>
  </div>

</body>
</html>`;

  // ── Generate PDF ──
  const { uri } = await Print.printToFileAsync({ html, base64: false });

  // Rename to a meaningful filename
  const filename = `${safeFilename(categoryName)}_expenses_${dateStamp()}.pdf`;
  const newUri   = FileSystem.documentDirectory + filename;
  await FileSystem.moveAsync({ from: uri, to: newUri });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('Sharing is not available on this device.');

  await Sharing.shareAsync(newUri, {
    mimeType:    'application/pdf',
    dialogTitle: `Export ${categoryName} Expenses`,
    UTI:         'com.adobe.pdf',
  });
};