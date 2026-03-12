// Generate PDF Report using a print-ready new window
async function generateReport() {
    const btn = document.querySelector('button[onclick="generateReport()"]');
    if (!btn) return;
    
    const origHTML = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Generating...';
    btn.disabled = true;

    try {
        const user     = window.authService.getUser();
        const vehicles = await window.dbService.getVehicles();
        const appts    = await window.dbService.getUserAppointments();
        const now      = new Date();
        const dateStr  = now.toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });
        const timeStr  = now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });

        const vehicleRows = vehicles.map(v => {
            const tyres      = v.tyres || {};
            const currentOdo = v.currentOdometer || 0;
            const avgDaily   = v.avgDailyKm || 40;

            const tyreRows = Object.values(tyres).map(t => {
                const installKm    = t.installationKm || 0;
                const expectedLife = t.expectedLifeKm || 35000;
                const kmDriven     = Math.max(0, currentOdo - installKm);
                const wear         = Math.min(100, (kmDriven / expectedLife) * 100);
                const remaining    = Math.round(Math.max(0, expectedLife - kmDriven) * 0.82);
                const months       = Math.floor(remaining / (avgDaily * 30));
                const condition    = wear >= 70 ? 'Critical' : wear >= 40 ? 'Moderate' : 'Good';
                const condColor    = wear >= 70 ? '#dc3545' : wear >= 40 ? '#e67e22' : '#198754';
                return `<tr>
                    <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">${t.position||'-'}</td>
                    <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">${t.brand||'Not set'}</td>
                    <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">${installKm.toLocaleString()} km</td>
                    <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <div style="flex:1;background:#f0f0f0;border-radius:99px;height:6px;">
                                <div style="width:${wear.toFixed(0)}%;background:${condColor};height:6px;border-radius:99px;"></div>
                            </div>
                            <span style="font-size:0.8rem;color:${condColor};font-weight:700;">${wear.toFixed(1)}%</span>
                        </div>
                    </td>
                    <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;color:${condColor};font-weight:700;">${condition}</td>
                    <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">${remaining.toLocaleString()} km</td>
                    <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">${months>0?'~'+months+' months':'Replace Now'}</td>
                </tr>`;
            }).join('');

            const repDate = v.replacementDueDate
                ? new Date(v.replacementDueDate).toLocaleDateString('en-IN',{month:'long',year:'numeric'})
                : 'Not calculated';

            return `<div style="background:#fff;border:1px solid #e8e8e8;border-radius:12px;padding:24px;margin-bottom:24px;page-break-inside:avoid;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
                    <div>
                        <h3 style="margin:0 0 4px 0;font-size:1.1rem;color:#1a1a1a;">${v.name||'Unnamed Vehicle'}</h3>
                        <span style="color:#888;font-size:0.85rem;">${v.plate||''} &nbsp;&middot;&nbsp; ${v.type||''}</span>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:0.8rem;color:#888;">Odometer</div>
                        <div style="font-weight:700;font-size:1rem;color:#1a1a1a;">${currentOdo.toLocaleString()} km</div>
                    </div>
                </div>
                <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                    <thead><tr style="background:#f8f9fa;">
                        <th style="padding:10px 12px;text-align:left;color:#555;font-weight:600;">Position</th>
                        <th style="padding:10px 12px;text-align:left;color:#555;font-weight:600;">Brand</th>
                        <th style="padding:10px 12px;text-align:left;color:#555;font-weight:600;">Installed At</th>
                        <th style="padding:10px 12px;text-align:left;color:#555;font-weight:600;min-width:130px;">Wear</th>
                        <th style="padding:10px 12px;text-align:left;color:#555;font-weight:600;">Condition</th>
                        <th style="padding:10px 12px;text-align:left;color:#555;font-weight:600;">KM Left</th>
                        <th style="padding:10px 12px;text-align:left;color:#555;font-weight:600;">Drive Time Left</th>
                    </tr></thead>
                    <tbody>${tyreRows||'<tr><td colspan="7" style="padding:12px;color:#aaa;text-align:center;">No tyre data</td></tr>'}</tbody>
                </table>
                <div style="margin-top:12px;padding:10px 12px;background:#f8f9fc;border-radius:8px;font-size:0.8rem;color:#555;">
                    📅 Est. replacement due: <strong>${repDate}</strong> &nbsp;&middot;&nbsp; Avg. daily: <strong>${avgDaily} km/day</strong>
                </div>
            </div>`;
        }).join('') || '<p style="color:#aaa;text-align:center;padding:24px;">No vehicles registered.</p>';

        const apptRows = appts.slice(0,5).map(a => {
            const sc = a.status==='confirmed'?'#198754':a.status==='cancelled'?'#dc3545':'#e67e22';
            return `<tr>
                <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">${a.date||'-'}</td>
                <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">${a.shopName||'-'}</td>
                <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">${a.service||'-'}</td>
                <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;color:${sc};font-weight:600;text-transform:capitalize;">${a.status||'Pending'}</td>
            </tr>`;
        }).join('') || '<tr><td colspan="4" style="padding:12px;color:#aaa;text-align:center;">No appointments.</td></tr>';

        const doc = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Tyre Health Report – ${dateStr}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;background:#fff;padding:40px;}
  @media print{
    body{padding:0;}
    .no-print{display:none!important;}
    @page{margin:18mm;size:A4;}
  }
  .print-btn{position:fixed;top:20px;right:20px;background:#1a1a1a;color:#fff;border:none;
    padding:12px 24px;border-radius:8px;font-size:0.95rem;font-weight:600;cursor:pointer;
    box-shadow:0 4px 12px rgba(0,0,0,0.2);display:flex;align-items:center;gap:8px;}
  .print-btn:hover{background:#333;}
</style>
</head><body>
<button class="print-btn no-print" onclick="window.print()">⬇ Save as PDF</button>

<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:36px;padding-bottom:20px;border-bottom:2px solid #1a1a1a;">
  <div>
    <div style="font-size:1.5rem;font-weight:800;letter-spacing:-0.5px;">&#9679; Tyre Pulse</div>
    <div style="color:#888;font-size:0.85rem;margin-top:4px;">Vehicle Tyre Health Report</div>
  </div>
  <div style="text-align:right;">
    <div style="font-weight:600;font-size:0.95rem;">${user?.displayName||user?.email||'User'}</div>
    <div style="color:#888;font-size:0.8rem;">${user?.email||''}</div>
    <div style="color:#888;font-size:0.8rem;margin-top:4px;">Generated: ${dateStr} at ${timeStr}</div>
  </div>
</div>

<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:32px;">
  <div style="background:#f8f9fa;border-radius:10px;padding:16px;">
    <div style="font-size:0.75rem;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Total Vehicles</div>
    <div style="font-size:2rem;font-weight:800;margin-top:4px;">${vehicles.length}</div>
  </div>
  <div style="background:#f8f9fa;border-radius:10px;padding:16px;">
    <div style="font-size:0.75rem;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Tyres Tracked</div>
    <div style="font-size:2rem;font-weight:800;margin-top:4px;">${vehicles.reduce((s,v)=>s+Object.keys(v.tyres||{}).length,0)}</div>
  </div>
  <div style="background:#f8f9fa;border-radius:10px;padding:16px;">
    <div style="font-size:0.75rem;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Appointments</div>
    <div style="font-size:2rem;font-weight:800;margin-top:4px;">${appts.length}</div>
  </div>
</div>

<h2 style="font-size:0.85rem;font-weight:700;margin-bottom:16px;color:#555;text-transform:uppercase;letter-spacing:0.5px;">&#128664; Vehicle Tyre Analysis</h2>
${vehicleRows}

<div style="background:#fff;border:1px solid #e8e8e8;border-radius:12px;padding:24px;margin-bottom:24px;page-break-inside:avoid;">
  <h2 style="font-size:0.85rem;font-weight:700;margin-bottom:16px;color:#555;text-transform:uppercase;letter-spacing:0.5px;">&#128197; Recent Appointments</h2>
  <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
    <thead><tr style="background:#f8f9fa;">
      <th style="padding:10px 12px;text-align:left;color:#555;font-weight:600;">Date</th>
      <th style="padding:10px 12px;text-align:left;color:#555;font-weight:600;">Shop</th>
      <th style="padding:10px 12px;text-align:left;color:#555;font-weight:600;">Service</th>
      <th style="padding:10px 12px;text-align:left;color:#555;font-weight:600;">Status</th>
    </tr></thead>
    <tbody>${apptRows}</tbody>
  </table>
</div>

<div style="border-top:1px solid #e8e8e8;padding-top:16px;display:flex;justify-content:space-between;font-size:0.75rem;color:#aaa;">
  <span>Tyre Pulse – Predictive Tyre Health Management</span>
  <span>Confidential | ${dateStr}</span>
</div>
</body></html>`;

        const win = window.open('', '_blank');
        win.document.write(doc);
        win.document.close();
        win.onload = () => setTimeout(() => win.print(), 400);

    } catch(err) {
        console.error('Report error:', err);
        alert('Could not generate report. Please try again.');
    } finally {
        btn.innerHTML = origHTML;
        btn.disabled = false;
    }
}
