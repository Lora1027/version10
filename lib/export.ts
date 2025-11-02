
export function downloadCSV(filename: string, rows: any[]) {
  if (!rows || rows.length === 0) { alert('No data to export.'); return; }
  const headers = Object.keys(rows[0]);
  const escape = (v:any) => {
    if (v === null || v === undefined) return '';
    const s = String(v).replace(/"/g, '""');
    if (/[",\n]/.test(s)) return '"' + s + '"';
    return s;
  };
  const csv = [headers.join(',')]
    .concat(rows.map(r => headers.map(h => escape((r as any)[h])).join(',')))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : filename + '.csv';
  link.click();
  URL.revokeObjectURL(url);
}
