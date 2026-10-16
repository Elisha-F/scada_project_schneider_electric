// Builds the SCADA drawing set (A3 landscape) for Villa Somalia.
// Usage: node tools/build-drawings.js      -> drawings/*.svg, drawings/*.pdf
// Needs Playwright + Chromium for the PDF step and for the SLD capture on sheet 005.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, 'drawings');
fs.mkdirSync(OUT, { recursive: true });

/* ------------------------------------------------------------------ drawing kit */
const W = 1587, H = 1123;                 // A3 at 96 dpi (420 x 297 mm)
const DX0 = 20, DX1 = 1250, TX = 1262, TW = 305;
const FONT = 'Arial, "Liberation Sans", Helvetica, sans-serif';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const C = { ink: '#1d262e', mute: '#5d6a75', grid: '#9aa4ad', fill: '#f4f6f7', zone: '#eef2f5' };
const KIND = {
  eip:  { c: '#1b5fa8', w: 2.4, d: '',      l: 'EtherNet/IP (M580 RIO / DIO)' },
  tcp:  { c: '#2e8b3e', w: 1.8, d: '',      l: 'Ethernet copper – Modbus TCP / EIP' },
  fo:   { c: '#7a4fb0', w: 2.8, d: '',      l: 'Ethernet single-mode fibre (FO)' },
  rtu:  { c: '#d07a00', w: 1.8, d: '7 4',   l: 'RS485 – Modbus RTU' },
  hw:   { c: '#1d262e', w: 1.4, d: '2 3',   l: 'Hard-wired I/O (DI / DO)' },
  pwr:  { c: '#c9302c', w: 3,   d: '',      l: 'Power circuit' },
  dc:   { c: '#b07a12', w: 2.4, d: '',      l: 'DC circuit' },
  vnd:  { c: '#9aa4ad', w: 1.4, d: '4 3',   l: 'Vendor-internal link (not SCADA scope)' },
  wl:   { c: '#0b7a8f', w: 1.2, d: '1 3',   l: 'Wireless sensor link' },
};
const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-family='${FONT}' font-size="${o.s || 11}"${o.b ? ' font-weight="700"' : ''}${o.i ? ' font-style="italic"' : ''} text-anchor="${o.a || 'start'}" fill="${o.c || C.ink}"${o.r ? ` transform="rotate(${o.r} ${x} ${y})"` : ''}>${esc(s)}</text>`;
const R = (x, y, w, h, o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${o.f || 'none'}" stroke="${o.st || C.ink}" stroke-width="${o.sw || 1}"${o.d ? ` stroke-dasharray="${o.d}"` : ''}${o.rx ? ` rx="${o.rx}"` : ''}/>`;
const L = (pts, k = 'tcp', o = {}) => { const s = KIND[k]; return `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${o.c || s.c}" stroke-width="${o.w || s.w}"${s.d ? ` stroke-dasharray="${s.d}"` : ''} stroke-linejoin="round"/>`; };
const lbl = (x, y, s, o = {}) => { const w = s.length * (o.s || 9) * 0.55 + 6; const ax = o.a === 'middle' ? x - w / 2 : o.a === 'end' ? x - w : x; return `<rect x="${ax}" y="${y - (o.s || 9) - 1}" width="${w}" height="${(o.s || 9) + 5}" fill="#fff"/>` + T(ax + 3, y + 1, s, { s: o.s || 9, c: o.c || C.mute }); };
// device box: title + sub lines; stripe colour = interface kind to SCADA
function dev(x, y, w, h, title, lines = [], o = {}) {
  let s = R(x, y, w, h, { f: o.f || '#fff', st: o.st || C.ink, sw: o.sw || 1.1, d: o.d });
  if (o.k) s += `<rect x="${x}" y="${y}" width="5" height="${h}" fill="${KIND[o.k].c}"/>`;
  s += T(x + (o.k ? 10 : 6), y + 14, title, { s: o.ts || 11, b: true });
  lines.forEach((l, i) => s += T(x + (o.k ? 10 : 6), y + 27 + i * 12, l, { s: o.ls || 9.5, c: C.mute }));
  return s;
}
let ZT = [];
function zone(x, y, w, h, title, o = {}) { const tw = title.length * 6.1 + 10; ZT.push(`<rect x="${x + 3}" y="${y + 4}" width="${tw}" height="15" fill="${o.f || C.zone}"/>` + T(x + 8, y + 15, title, { s: 10.5, b: true, c: C.mute })); return R(x, y, w, h, { f: o.f || C.zone, st: C.grid, d: '6 4' }); }
function table(x, y, cols, rows, o = {}) {
  const rh = o.rh || 15, fs = o.fs || 9.5; let s = '', cx;
  rows.forEach((r, i) => {
    const yy = y + i * rh, head = o.head !== false && i === 0;
    if (head) s += `<rect x="${x}" y="${yy}" width="${cols.reduce((a, b) => a + b, 0)}" height="${rh}" fill="#dce3e8"/>`;
    cx = x; r.forEach((c, j) => { s += T(cx + 4, yy + rh - 4, c, { s: fs, b: head }); cx += cols[j]; });
  });
  const tw = cols.reduce((a, b) => a + b, 0), th = rows.length * rh;
  s += R(x, y, tw, th, { st: C.grid });
  for (let i = 1; i < rows.length; i++) s += `<line x1="${x}" y1="${y + i * rh}" x2="${x + tw}" y2="${y + i * rh}" stroke="${C.grid}" stroke-width="0.6"/>`;
  cx = x; cols.slice(0, -1).forEach(c => { cx += c; s += `<line x1="${cx}" y1="${y}" x2="${cx}" y2="${y + th}" stroke="${C.grid}" stroke-width="0.6"/>`; });
  return s;
}
const breaker = (x, y, o = {}) => R(x - 7, y - 7, 14, 14, { f: '#fff', st: KIND.pwr.c, sw: 2 }) + (o.l ? T(x + 12, y + 4, o.l, { s: 9.5 }) : '');
const xfmr = (x, y, l1, l2) => `<circle cx="${x}" cy="${y - 9}" r="12" fill="#fff" stroke="${KIND.pwr.c}" stroke-width="2"/><circle cx="${x}" cy="${y + 9}" r="12" fill="none" stroke="${KIND.pwr.c}" stroke-width="2"/>` + T(x + 18, y - 2, l1, { s: 9.5 }) + T(x + 18, y + 10, l2, { s: 9.5, c: C.mute });

/* ------------------------------------------------------------------ title block */
const DATE = '16-OCT-2026';
function sheet(no, title, sub, body, legend, notes) {
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#fff"/>`;
  s += R(10, 10, W - 20, H - 20, { sw: 2 }) + R(DX0 - 5, 15, DX1 - DX0 + 10, H - 30, { sw: 0.8 });
  s += body + ZT.join(''); ZT = [];
  // title column
  let y = 15; s += R(TX - 5, 15, TW + 10, H - 30, { sw: 0.8 });
  s += T(TX + 5, y + 18, 'LEGEND', { b: true, s: 12 }); y += 30;
  legend.forEach(k => {
    if (typeof k === 'string' && KIND[k]) { s += L([[TX + 8, y - 4], [TX + 48, y - 4]], k) + T(TX + 56, y, KIND[k].l, { s: 9.5 }); }
    else s += k.sym(TX + 8, y - 4) + T(TX + 56, y, k.l, { s: 9.5 });
    y += 17;
  });
  y += 6; s += `<line x1="${TX - 5}" y1="${y}" x2="${TX + TW + 5}" y2="${y}" stroke="${C.ink}" stroke-width="0.8"/>`;
  s += T(TX + 5, y + 18, 'NOTES', { b: true, s: 12 }); y += 32;
  notes.forEach((n, i) => { const words = n.split(' '); let line = `${i + 1}. `; const out = [];
    words.forEach(w => { if ((line + w).length > 58) { out.push(line); line = '    ' + w + ' '; } else line += w + ' '; }); out.push(line);
    out.forEach(l => { s += T(TX + 5, y, l, { s: 9.2 }); y += 11.5; }); y += 3; });
  // fixed title block
  let b = H - 15 - 478;
  const row = (h, cells) => { cells.forEach(c => s += c); s += `<line x1="${TX - 5}" y1="${b + h}" x2="${TX + TW + 5}" y2="${b + h}" stroke="${C.ink}" stroke-width="0.8"/>`; b += h; };
  s += `<line x1="${TX - 5}" y1="${b}" x2="${TX + TW + 5}" y2="${b}" stroke="${C.ink}" stroke-width="1.2"/>`;
  row(110, [table(TX, b + 6, [40, 175, 80], [['REV', 'DESCRIPTION', 'DATE'], ['A', 'Draft for internal review', DATE], ['', '', ''], ['', '', ''], ['', '', ''], ['', '', '']], { rh: 16, fs: 9 })]);
  row(60, [T(TX + 5, b + 16, 'CLIENT:', { s: 9, c: C.mute }), T(TX + 5, b + 32, 'MINISTRY OF ENERGY & WATER RESOURCES – SOMALIA', { s: 9.8, b: true }), T(TX + 5, b + 50, 'SITE: VILLA SOMALIA', { s: 9.8 })]);
  row(50, [T(TX + 5, b + 16, 'CONTRACTOR:', { s: 9, c: C.mute }), T(TX + 5, b + 36, 'BLUEFLAG ENERGY CO. LTD', { s: 11, b: true })]);
  row(50, [T(TX + 5, b + 16, 'PROJECT TITLE:', { s: 9, c: C.mute }), T(TX + TW / 2, b + 37, 'SOLARIZATION VILLA SOMALIA', { s: 12, b: true, a: 'middle' })]);
  row(70, [T(TX + 5, b + 16, 'SHEET TITLE:', { s: 9, c: C.mute }), T(TX + TW / 2, b + 40, title, { s: 15, b: true, a: 'middle' }), T(TX + TW / 2, b + 58, sub, { s: 10, a: 'middle', c: C.mute })]);
  row(24, [T(TX + 5, b + 16, 'SCALE: NTS', { s: 9.5 }), T(TX + 110, b + 16, `DATE: ${DATE}`, { s: 9.5 }), T(TX + 240, b + 16, 'SIZE: A3', { s: 9.5 })]);
  ['DESIGNED', 'DRAWN', 'CHECKED', 'APPROVED'].forEach(k => row(22, [T(TX + 5, b + 15, k, { s: 9.5 }), `<line x1="${TX + 100}" y1="${b}" x2="${TX + 100}" y2="${b + 22}" stroke="${C.ink}" stroke-width="0.6"/>`, `<line x1="${TX + 230}" y1="${b}" x2="${TX + 230}" y2="${b + 22}" stroke="${C.ink}" stroke-width="0.6"/>`, T(TX + 236, b + 15, 'SIGN', { s: 8.5, c: C.mute })]));
  row(26, [T(TX + 5, b + 17, 'DRW NO.', { s: 9.5 }), T(TX + 70, b + 17, `BFE/PR/26/01-${no}`, { s: 11, b: true }), T(TX + 250, b + 17, 'REV A', { s: 10, b: true })]);
  return s + '</svg>';
}

/* ================================================================== 001 ARCHITECTURE */
function sheet001() {
  let s = '';
  s += zone(30, 30, 1210, 120, 'LEVEL 3 · ENTERPRISE / REMOTE ACCESS (DMZ)', { f: '#f7f4fb' });
  s += zone(30, 160, 1210, 170, 'LEVEL 2 · SUPERVISORY – SCADA LAN, VLAN 10, 10.10.10.0/24 (CONTROL ROOM)');
  s += zone(30, 340, 1210, 200, 'LEVEL 1 · CONTROL – M580 PLANT CONTROLLER, VLAN 20, 10.10.20.0/24', { f: '#f2f7f2' });
  s += zone(30, 580, 1210, 510, 'LEVEL 0 · FIELD DEVICES – DEVICE NETWORK, VLAN 30, 10.10.30.0/24, AND SERIAL BUSES', { f: '#fbf9f2' });
  // L3
  s += dev(900, 62, 170, 54, 'FW-01 Industrial firewall', ['DMZ · read-only data mirror', 'Only Level 2 ↔ Level 3 conduit'], { k: 'tcp' });
  s += dev(1080, 62, 150, 54, 'Remote monitoring', ['Ministry / O&M', 'VPN + MFA (TBC by client)'], { d: '5 3' });
  s += L([[1070, 89], [1080, 89]], 'tcp') + lbl(1075, 132, 'VPN', { a: 'middle' });
  // L2 devices + LAN
  const l2 = [[50, 'HMI-01', ['Operator station 1', 'HMIP6 · MSE runtime 4K']], [215, 'HMI-02', ['Operator station 2', 'HMIP6 · MSE runtime 4K']], [380, 'SRV-01', ['SCADA server / historian', '13-month storage (TBC)']], [545, 'ENG-01', ['Engineering station', 'Control Expert · MSE BT']], [710, 'GPS-01', ['GPS master clock', 'NTP / PTP time source']]];
  l2.forEach(([x, t, ls]) => { s += dev(x, 190, 150, 54, t, ls, { k: 'tcp' }) + L([[x + 75, 244], [x + 75, 300]], 'tcp'); });
  s += dev(1040, 190, 180, 54, 'SW1 · MCSESM083F23F1', ['Managed switch 8TX, control room', 'VLAN 10 / 20, RSTP, SNMPv3'], { k: 'tcp' }) + L([[1130, 244], [1130, 300]], 'tcp');
  s += L([[125, 300], [1130, 300]], 'tcp', { w: 3 }) + lbl(560, 316, 'SCADA LAN – VLAN 10 (via SW1)');
  s += L([[985, 116], [985, 300]], 'tcp');
  // L1
  s += dev(50, 372, 340, 150, 'MAIN RACK – BMEXBP0800 (control room)', ['BMXCPS3020 power supply 24–48 V DC', 'BMEP582040 M580 CPU – plant controller / PPC', 'BMENOC0311 #1 – SCADA LAN (Modbus TCP server)', 'BMENOC0311 #2 – second SCADA LAN path', 'BMENOC0321 – device network scanner, IP forwarding', 'BMXDDI3202K ×2 · BMXDDO3202K ×2', 'Spare BMEP582040 held as cold spare (see note 3)', ''], { k: 'eip' });
  s += L([[160, 372], [160, 300]], 'tcp') + L([[200, 372], [200, 300]], 'tcp') + lbl(210, 366, 'NOC0311 #1 / #2');
  s += dev(470, 372, 300, 150, 'RACK 2 – BMEXBP1200 (11 kV GIS room)', ['BMXCPS3020 power supply', 'BMECRA31210 Ethernet drop adapter', 'BMXDDI3202K ×3 – breaker status, trips, fire', 'BMXDDO3202K ×2 – breaker / DG / BESS commands', 'BMXNOM0200 – RS485 ×2 (DG controllers)', 'MCSESM083F23F1 SW2 mounted in this panel'], { k: 'eip' });
  s += L([[390, 440], [470, 440]], 'eip') + lbl(430, 432, 'RIO', { a: 'middle' });
  s += dev(850, 400, 200, 60, 'SW2 · MCSESM083F23F1', ['Device network switch, VLAN 30', 'Fibre ring to field switches'], { k: 'tcp' });
  s += L([[220, 522], [220, 556], [950, 556], [950, 460]], 'tcp') + lbl(600, 552, 'NOC0321 → SW2 (device network, IP forwarding)', { a: 'middle' });
  // L0 groups
  const G = [
    [40, 290, 'CONTROL ROOM & 11 kV GIS ROOM', [['P5M30-AH1 … AH8', ['8 × Easergy P5M30, RSTP ring', 'Protection, measurement, events'], 'tcp'], ['GIS AH1–AH8 hard-wired', ['VCB / switch positions, trips, SF6,', 'L/R, VPI → Rack 2 DI; CLOSE/OPEN DO'], 'hw'], ['NECR (AH8)', ['Earthing TX trip, NER 63.5 Ω', 'temperature via P5M30-AH8'], 'hw'], ['UPS-01 + 110 V DC charger', ['Control room UPS, GIS DC system', 'Modbus TCP card'], 'tcp'], ['FACP-01 fire panel', ['GIS room, control room zones', 'Volt-free contacts → Rack 2'], 'hw'], ['AUX panel (AH5)', ['XRNT-3A fuse, 100 kVA TX, 200 A', 'Incomer status → Rack 2'], 'hw']]],
    [340, 190, 'BESS CONTAINER', [['BESS-EMS (vendor)', ['Energy management controller', 'Modbus TCP server to M580'], 'fo'], ['PCS-1 / PCS-2', ['Grid-forming PCS (qty TBC)', 'via EMS'], 'vnd'], ['BMS racks 1–8', ['3.34 MWh LFP 416S8P', 'via EMS'], 'vnd'], ['PM5320-BESS', ['BESS LV metering 0.69 kV'], 'tcp'], ['BESS ACB / fire / ESD', ['ACB 1000 A, fire, off-gas,', 'E-stop → Rack 2 DI / DO'], 'hw']]],
    [540, 160, 'DIESEL GENERATOR AREA', [['DGC-1 (DG1 550 kVA)', ['Genset controller', 'RS485 → BMXNOM0200 port 1'], 'rtu'], ['DGC-2 (DG2 660 kVA)', ['Genset controller', 'same bus, ID 2'], 'rtu'], ['PM5320-DG', ['DG LV bus metering'], 'tcp'], ['ACB Q2 / Q3, start/stop', ['Hard-wired → Rack 2'], 'hw']]],
    [710, 250, 'PV INVERTER STATION & ARRAY', [['NTS-PV1 … PV4', ['4 Edge I/O NTS islands with', 'NTSFMB0120K serial master each'], 'eip'], ['INV NB01 … NB04', ['Sungrow SG350HX 350 kW', 'RS485 → NTSFMB0120K'], 'rtu'], ['PAS600-PV1 … PV4', ['Panel servers + TH110 / CL110', 'enclosure temperature / humidity'], 'tcp'], ['WS-01 weather station', ["Meteocontrol blue'Log XM 5000", 'SMP12-A, WindSonic, Tamb, Tmod'], 'tcp'], ['PM5320-PV', ['PV LV metering 0.8 kV'], 'tcp'], ['PV ACB 1250 A', ['Status / command → Rack 2'], 'hw']]],
    [970, 135, 'PRESIDENT TX STATION', [['NTS-LVP1 / LVP2', ['RMU, TX, LVDB I/O'], 'eip'], ['PAS600-LVP1 / 2', ['TH110 / CL110'], 'tcp'], ['PM5320-LVP', ['LVDB metering'], 'tcp'], ['RMU ST260E', ['contacts → NTS'], 'hw'], ['UPS-02 2 kVA', ['RMU UPS card'], 'tcp']]],
    [1115, 125, 'PM TX STATION', [['NTS-LVM1', ['RMU, TX, LVDB'], 'eip'], ['PAS600-LVM1', ['TH110 / CL110'], 'tcp'], ['PM5320-LVM', ['LVDB metering'], 'tcp'], ['RMU ST260E', ['contacts → NTS'], 'hw'], ['UPS-03 2 kVA', ['RMU UPS card'], 'tcp']]],
  ];
  G.forEach(([x, w, t, items]) => {
    s += R(x, 610, w, 470, { f: '#fff', st: C.grid, d: '3 3' }) + T(x + 6, 626, t, { s: 10, b: true });
    items.forEach(([tt, ls, k], i) => s += dev(x + 6, 636 + i * 72, w - 12, 62, tt, ls, { k, ts: 10, ls: 9 }));
  });
  // backbone
  s += L([[950, 460], [950, 570], [1180, 570], [1180, 610]], 'fo') + L([[950, 570], [1040, 570], [1040, 610]], 'fo') + L([[950, 570], [835, 570], [835, 610]], 'fo') + L([[950, 570], [620, 570], [620, 610]], 'fo') + L([[950, 570], [435, 570], [435, 610]], 'fo');
  s += L([[900, 460], [900, 566], [185, 566], [185, 610]], 'tcp') + lbl(1100, 585, 'Fibre ring via field switches – see sheet 002', { a: 'middle' });
  s += L([[560, 522], [560, 600], [320, 600], [320, 610]], 'hw') + lbl(330, 596, 'Hard-wired to Rack 2');
  s += L([[700, 522], [700, 610]], 'rtu') + lbl(706, 600, 'RS485 to DGC-1/2');
  return sheet('SCADA-001', 'SCADA ARCHITECTURE', 'System overview by level and location', s,
    ['eip', 'tcp', 'fo', 'rtu', 'hw', 'vnd', { sym: (x, y) => `<rect x="${x}" y="${y - 7}" width="40" height="14" fill="#fff" stroke="${C.ink}"/><rect x="${x}" y="${y - 7}" width="5" height="14" fill="${KIND.tcp.c}"/>`, l: 'Device; stripe = interface type to SCADA' }, { sym: (x, y) => R(x, y - 7, 40, 14, { st: C.grid, d: '6 4', f: C.zone }), l: 'Network level / location boundary' }],
    ['Architecture follows the Schneider Electric offer (Villa Somalia v1) and drawing BFE/PR/26/01. Device names are used unchanged on sheets 002–005, the HMI and the I/O list.',
     'The M580 is the plant controller (PPC): it dispatches BESS, PV and DG setpoints. Protection relays trip independently of SCADA.',
     'BMEP582040 is not hot-standby capable. The second CPU in the BOM is shown as a cold spare. Change to an M580 hot-standby CPU if redundancy is required (TBC).',
     'SCADA server, historian, engineering station, GPS clock and firewall are not in the BOM and must be added (TBC).',
     'Field switches at remote locations, BESS EMS interface, DG controller interface and FACP interface are not in the BOM (TBC).',
     'Only the firewall conduit connects Level 2 to Level 3. Remote access is subject to client approval.',
     'Equipment locations and cable distances to be confirmed against the general layout.']);
}

/* ================================================================== 002 NETWORK */
function sheet002() {
  let s = '';
  const sw = (x, y, name, sub, ports) => { let r = dev(x, y, 520, 64, name, [sub], { k: 'tcp', ts: 12 }); ports.forEach((p, i) => { const px = x + 30 + i * 60; r += R(px - 12, y + 40, 24, 18, { f: '#dce3e8', st: C.ink, sw: 0.8 }) + T(px, y + 53, `P${i + 1}`, { s: 9, a: 'middle', b: true }); }); return r; };
  // SW1
  s += zone(30, 30, 590, 250, 'CONTROL ROOM · SCADA LAN (SW1)');
  const p1 = [['HMI-01', '.10.11'], ['HMI-02', '.10.12'], ['SRV-01', '.10.21'], ['ENG-01', '.10.31'], ['GPS-01', '.10.5'], ['FW-01', '.10.1'], ['NOC0311#1', '.20.11'], ['NOC0311#2', '.20.12']];
  p1.forEach(([n, ip], i) => { const x = 70 + i * 60; s += dev(x - 28, 60, 56, 40, n, [ip], { ts: 8.5, ls: 8.5 }) + L([[x, 100], [x, 190]], 'tcp'); });
  s += sw(40, 190, 'SW1 · MCSESM083F23F1 · 10.10.99.1', 'VLAN 10 SCADA (P1–P6) · VLAN 20 control (P7–P8)', p1);
  s += lbl(330, 150, 'Cu Cat6 S/FTP, max. 90 m', { a: 'middle' });
  // SW2
  s += zone(640, 30, 600, 250, 'GIS ROOM · DEVICE NETWORK (SW2, in Rack 2 panel)');
  const p2 = [['NOC0321', '.20.13'], ['P5M30 A', 'ring end'], ['P5M30 B', 'ring end'], ['UPS-01', '.30.61'], ['FO ring A', 'to LS-BESS'], ['FO ring B', 'from LS-LVM'], ['FACP-GW', '.30.71'], ['spare', '']];
  p2.forEach(([n, ip], i) => { const x = 680 + i * 60; if (i !== 1 && i !== 2 && i !== 4 && i !== 5) s += dev(x - 28, 60, 56, 40, n, [ip], { ts: 8.5, ls: 8.5, d: n === 'spare' ? '3 3' : '' }) + (n !== 'spare' ? L([[x, 100], [x, 190]], 'tcp') : ''); });
  s += sw(650, 190, 'SW2 · MCSESM083F23F1 · 10.10.99.2', 'VLAN 30 device network · RSTP root bridge', p2);
  // P5M30 ring
  s += zone(30, 300, 1210, 130, 'GIS ROOM · P5M30 RELAY RING (RSTP, Cu Cat6)', { f: '#fff' });
  for (let i = 0; i < 8; i++) { const x = 60 + i * 145; s += dev(x, 340, 115, 44, `P5M30-AH${i + 1}`, [`10.10.30.${11 + i}`], { k: 'tcp', ts: 10 }); if (i < 7) s += L([[x + 115, 362], [x + 145, 362]], 'tcp'); }
  s += L([[740, 248], [740, 290], [117, 290], [117, 340]], 'tcp') + L([[800, 248], [800, 296], [1190, 296], [1190, 404], [1132, 404], [1132, 384]], 'tcp');
  s += lbl(450, 286, 'SW2 P2 → AH1', { a: 'middle' }) + lbl(1150, 418, 'AH8 → SW2 P3', { a: 'middle' });
  // fibre ring with field switches
  s += zone(30, 450, 1210, 380, 'SINGLE-MODE FIBRE RING (RSTP) · FIELD SWITCHES LS-xx (NOT IN BOM – TBC)', { f: '#faf8fd' });
  const ls = [
    ['LS-BESS', 'BESS container', [['P1/P2', 'FO ring in / out'], ['P3', 'BESS-EMS .30.41'], ['P4', 'PM5320-BESS .30.23'], ['P5', 'FACP-BESS (via EMS)']]],
    ['LS-DG', 'DG area', [['P1/P2', 'FO ring in / out'], ['P3', 'PM5320-DG .30.21'], ['—', 'DGC-1/2 on RS485 (table B)']]],
    ['LS-PV', 'PV inverter station', [['P1/P2', 'FO ring in / out'], ['P3', 'NTS-PV1→PV2→PV3→PV4 chain'], ['P4', 'PAS600-PV1→…→PV4 chain'], ['P5', 'PM5320-PV .30.22'], ['P6', "WS-01 blue'Log .30.51"], ['P7', 'Existing inverter PLC box']]],
    ['LS-LVP', 'President TX station', [['P1/P2', 'FO ring in / out'], ['P3', 'NTS-LVP1 → LVP2 chain'], ['P4', 'PAS600-LVP1 → LVP2'], ['P5', 'PM5320-LVP .30.24'], ['P6', 'UPS-02 .30.62']]],
    ['LS-LVM', 'Prime Minister TX station', [['P1/P2', 'FO ring in / out'], ['P3', 'NTS-LVM1'], ['P4', 'PAS600-LVM1'], ['P5', 'PM5320-LVM .30.25'], ['P6', 'UPS-03 .30.63']]],
  ];
  ls.forEach(([n, loc, ports], i) => {
    const x = 50 + i * 240;
    s += dev(x, 520, 190, 46, n, [loc + ` · 10.10.99.${10 + i}`], { k: 'fo', ts: 11 });
    ports.forEach(([p, d], j) => { s += T(x + 8, 590 + j * 16, p, { s: 9.5, b: true }) + T(x + 50, 590 + j * 16, d, { s: 9.5 }); });
    s += R(x, 576, 190, 8 + ports.length * 16 + 6, { st: C.grid });
    if (i < 4) s += L([[x + 190, 543], [x + 240, 543]], 'fo');
  });
  s += L([[920, 248], [920, 286], [915, 286], [915, 480], [145, 480], [145, 520]], 'fo') + L([[980, 248], [980, 280], [1060, 280], [1060, 470], [1225, 470], [1225, 543], [1200, 543]], 'fo');
  s += lbl(560, 476, 'SW2 P5 → LS-BESS (ring A)', { a: 'middle' }) + lbl(1110, 466, 'LS-LVM → SW2 P6 (ring B)', { a: 'middle' });
  s += T(50, 720, 'Chained devices use the two RJ45 ports of NTSNEC1200K and PAS600. Each local switch needs 2 × SFP single-mode ports and ≥ 6 copper ports. SW2 needs 2 SFP ports: MCSESM083F23F1 is copper only – add media converters or select an FO variant (TBC).', { s: 9.5, c: C.mute });
  s += T(50, 735, 'Fibre: 4-core single-mode armoured cable per link in the cable trenches (1200×1000 / 800×1000). Route lengths to be taken from the LV cable route drawings.', { s: 9.5, c: C.mute });
  s += T(50, 750, 'Ring recovery time with RSTP < 1 s. The M580 RIO link (main rack ↔ Rack 2) is a separate EtherNet/IP segment on NOC/CPU ports and does not pass through SW1 or SW2.', { s: 9.5, c: C.mute });
  // tables
  s += T(40, 848, 'TABLE A – VLAN AND IP ADDRESS PLAN', { b: true, s: 11 });
  s += table(40, 856, [70, 160, 180, 170], [
    ['VLAN', 'Subnet', 'Use', 'Gateway / routing'],
    ['10', '10.10.10.0/24', 'SCADA LAN (HMI, server, ENG)', 'FW-01 .1 (to DMZ only)'],
    ['20', '10.10.20.0/24', 'M580 control (CPU, NOC, CRA)', 'None'],
    ['30', '10.10.30.0/24', 'Field devices', 'BMENOC0321 IP forwarding'],
    ['99', '10.10.99.0/24', 'Switch management', 'ENG-01 only'],
  ], { rh: 15 });
  s += table(40, 940, [215, 185, 200], [
    ['Device', 'IP address', 'Remark'],
    ['FW-01 / GPS-01', '10.10.10.1 / .5', 'NTP server for all devices'],
    ['HMI-01 / HMI-02 / SRV-01 / ENG-01', '.10.11 / .12 / .21 / .31', 'Static addresses'],
    ['M580 CPU / NOC0311 #1 / #2 / NOC0321', '10.10.20.10 / .11 / .12 / .13', 'NOC0321 also 10.10.30.1'],
    ['BMECRA31210 (Rack 2)', '10.10.20.20', 'RIO drop'],
    ['NTS-PV1…PV4 / LVP1, LVP2 / LVM1', '10.10.30.101–104 / 105, 106 / 107', 'EtherNet/IP adapters'],
    ['P5M30-AH1 … AH8', '10.10.30.11 … 18', 'Modbus TCP, unit ID 1'],
    ['PM5320 DG / PV / BESS / LVP / LVM', '10.10.30.21 … 25', 'Modbus TCP'],
    ['PAS600-PV1…4 / LVP1, 2 / LVM1', '10.10.30.31 … 37', 'Modbus TCP gateway for sensors'],
    ['BESS-EMS / WS-01 / UPS-01…03 / FACP-GW', '.30.41 / .51 / .61–.63 / .71', 'Modbus TCP'],
  ], { rh: 14, fs: 9 });
  s += T(680, 848, 'TABLE B – RS485 MODBUS RTU BUSES', { b: true, s: 11 });
  s += table(680, 856, [120, 160, 100, 180], [
    ['Bus', 'Devices (Modbus ID)', 'Settings', 'Remark'],
    ['NOM0200 port 1', 'DGC-1 (1), DGC-2 (2)', '19200 8N1', 'Shielded twisted pair, 120 Ω ends'],
    ['NOM0200 port 2', 'Spare', '—', 'Reserved'],
    ['NTSFMB0120K PV1', 'INV NB01 (1)', '9600 8N1', 'Point-to-point, see note 4'],
    ['NTSFMB0120K PV2', 'INV NB02 (1)', '9600 8N1', 'Point-to-point'],
    ['NTSFMB0120K PV3', 'INV NB03 (1)', '9600 8N1', 'Point-to-point'],
    ['NTSFMB0120K PV4', 'INV NB04 (1)', '9600 8N1', 'Point-to-point'],
    ['NTSFMB0120K LV', 'Spare', '—', 'Future meters'],
  ], { rh: 15 });
  s += T(680, 990, 'TABLE C – CABLE TYPES', { b: true, s: 11 });
  s += table(680, 998, [120, 440], [
    ['Type', 'Specification'],
    ['Ethernet Cu', 'Cat6 S/FTP industrial, RJ45 shielded, ≤ 90 m'],
    ['Fibre', 'Single-mode OS2, 4-core armoured, LC duplex, 1310 nm'],
    ['RS485', '2-pair shielded twisted pair 120 Ω (e.g. Belden 3106A), shield earthed at master end'],
    ['Hard-wired I/O', 'Multicore 1.0 mm² screened, 24 V DC, separate from power cables'],
  ], { rh: 15 });
  return sheet('SCADA-002', 'COMMUNICATION NETWORK', 'Topology, ports, IP plan and serial buses', s,
    ['tcp', 'fo', 'rtu', 'eip', { sym: (x, y) => R(x + 8, y - 8, 24, 16, { f: '#dce3e8', st: C.ink, sw: 0.8 }), l: 'Switch port Pn' }],
    ['Read with sheet 001. Addresses are proposals for approval; final values to be fixed at FAT.',
     'All switches managed: unused ports shut down, port security (MAC binding), SNMPv3, syslog to SRV-01, RSTP with SW2 as root bridge.',
     'IP forwarding on BMENOC0321 is restricted to SCADA ↔ device traffic; no other routing between VLANs except via FW-01.',
     'Communication schematic BFE/PR/26/01 shows the 4 inverters daisy-chained to one PLC box. The offer provides one NTSFMB0120K per PV area, so point-to-point links are proposed for faster polling and fault isolation (TBC).',
     'Field switches LS-xx, SFP ports on SW2 and fibre cables are additions to the BOM (TBC).',
     'All devices take time from GPS-01 via NTP; P5M30 event time-stamps at 1 ms.']);
}

/* ================================================================== 003 PV INTERFACE */
function sheet003() {
  let s = '';
  s += zone(30, 30, 640, 1050, 'POWER AND SIGNAL INTERFACE – PV PLANT', { f: '#fff' });
  // power path
  const px = 150;
  s += dev(px - 70, 60, 140, 46, 'GIS PANEL AH2', ['QF12 VCB · P5M30-AH2'], { k: 'tcp' });
  s += L([[px, 106], [px, 150]], 'pwr') + xfmr(px, 170, '1.5 MVA 11/0.8 kV Dd0', 'PV step-up transformer');
  s += L([[px, 191], [px, 250]], 'pwr') + breaker(px, 225, { l: 'PV ACB 1250 A 20 kA' }) + L([[px - 110, 250], [px + 380, 250]], 'pwr', { w: 5 }) + T(px - 110, 243, '0.8 kV PV LV BUSBAR · PM5320-PV', { s: 9.5, b: true });
  for (let i = 0; i < 4; i++) {
    const x = 100 + i * 130;
    s += L([[x, 250], [x, 330]], 'pwr') + breaker(x, 290) + T(x - 12, 294, 'MCCB 400 A', { s: 9, a: 'end' });
    s += dev(x - 45, 330, 90, 60, `INV NB0${i + 1}`, ['SG350HX', '350 kW'], { k: 'rtu', ts: 10 });
    s += L([[x, 390], [x, 470]], 'dc') + T(x + 6, 420, 'DC SPD II', { s: 9 }) + T(x + 6, 432, 'DC switch', { s: 9 });
    s += dev(x - 50, 470, 100, 46, i < 3 ? '20 strings' : '21 strings', ['26 × 720 Wp', `NB0${i + 1}-01…`], { ts: 10 });
  }
  s += T(60, 540, 'PV ARRAY 1.516 MWp · 2106 × 720 Wp Jinko · 81 strings', { s: 10, b: true });
  // scope boundary
  s += R(40, 320, 620, 230, { st: '#c9302c', d: '8 4', sw: 1.2 }) + T(650, 314, 'PV / INVERTER VENDOR SCOPE', { s: 9.5, b: true, c: '#c9302c', a: 'end' });
  // SCADA side devices
  for (let i = 0; i < 4; i++) {
    const x = 50 + i * 155;
    s += dev(x, 620, 140, 92, `NTS-PV${i + 1}`, ['NTSNEC1200K + PSU', '3 × DI16 · 1 × DO16', 'NTSFMB0120K RS485', `PAS600-PV${i + 1}`, 'TH110 / CL110 sensors'], { k: 'eip', ts: 10, ls: 8.8 });
    const ix = 100 + i * 130;
    s += L([[ix + 45, 372], [ix + 56, 372], [ix + 56, 600], [x + 110, 600], [x + 110, 620]], 'rtu');
    s += L([[ix + 7, 290], [ix + 66, 290], [ix + 66, 595], [x + 30, 595], [x + 30, 620]], 'hw');
  }
  s += lbl(340, 590, 'MCCB / DC switch / SPD contacts → NTS DI (hard-wired)', { a: 'middle' }) + lbl(340, 610, 'RS485 Modbus RTU → NTSFMB0120K', { a: 'middle' });
  s += L([[120, 712], [120, 760], [585, 760], [585, 712]], 'tcp') + L([[275, 712], [275, 760]], 'tcp') + L([[430, 712], [430, 760]], 'tcp');
  s += dev(250, 790, 170, 46, 'LS-PV field switch', ['FO ring to SW2 (sheet 002)'], { k: 'fo' }) + L([[335, 760], [335, 790]], 'tcp') + L([[335, 836], [335, 870]], 'fo') + lbl(345, 866, 'FO to control room');
  s += dev(450, 790, 200, 70, 'WS-01 weather station', ["blue'Log XM 5000 + fieldbus ext.", 'SMP12-A irradiance, Gill WindSonic', 'ambient + module temperature'], { k: 'tcp' }) + L([[450, 812], [420, 812]], 'tcp');
  s += dev(50, 790, 170, 46, 'PM5320-PV', ['0.8 kV PV LV busbar'], { k: 'tcp' }) + L([[220, 812], [250, 812]], 'tcp');
  s += dev(50, 900, 250, 60, 'RACK 2 (GIS room)', ['DI: PV ACB closed / tripped', 'DO: PV ACB close / open'], { k: 'eip' });
  s += L([[px - 7, 225], [36, 225], [36, 930], [50, 930]], 'hw') + lbl(40, 880, 'ACB hard-wired', { r: 0 });
  s += dev(330, 900, 300, 60, 'M580 PLANT CONTROLLER (PPC)', ['Scans NTS-PV1…4 (EtherNet/IP), WS-01, PM5320,', 'PAS600 and P5M30-AH2 (Modbus TCP)'], { k: 'eip' });
  s += L([[px + 70, 83], [640, 83], [640, 930], [630, 930]], 'tcp') + lbl(600, 100, 'P5M30-AH2 Modbus TCP', { a: 'end' });
  s += T(50, 990, 'INTERFACE POINTS (SCADA SCOPE STARTS HERE):', { s: 10, b: true });
  ['① Inverter RS485 terminal (A/B/GND) in each SG350HX', '② MCCB auxiliary and trip contacts, DC switch and SPD alarm contacts', "③ blue'Log XM 5000 Ethernet port", '④ PV ACB auxiliary contacts and closing/opening coils in the PV LV board'].forEach((t, i) => s += T(60, 1006 + i * 14, t, { s: 9.5 }));
  // tables right
  s += T(690, 46, 'TABLE A – SIGNAL EXCHANGE (PER INVERTER UNLESS STATED)', { b: true, s: 11 });
  s += table(690, 54, [36, 230, 60, 120, 104], [
    ['Dir.', 'Signal', 'Type', 'Source', 'Rate'],
    ['IN', 'AC P, Q, U, I, f; DC P, U', 'AI comm', 'SG350HX', '2 s'],
    ['IN', 'Energy today / total', 'AI comm', 'SG350HX', '60 s'],
    ['IN', 'Internal temp., insulation resistance', 'AI comm', 'SG350HX', '10 s'],
    ['IN', 'Operating state, fault code', 'AI comm', 'SG350HX', '2 s'],
    ['IN', 'String currents (20 / 21 per inverter)', 'AI comm', 'SG350HX', '10 s'],
    ['OUT', 'Active power limit (% of 350 kW)', 'AO comm', 'PPC', 'on change'],
    ['OUT', 'Reactive power / PF setpoint', 'AO comm', 'PPC', 'on change'],
    ['OUT', 'Start / stop', 'AO comm', 'Operator', 'command'],
    ['IN', 'MCCB 400 A closed / tripped', 'DI', 'NTS-PVn', '20 ms'],
    ['IN', 'DC switch closed, AC/DC SPD failed', 'DI', 'NTS-PVn', '20 ms'],
    ['IN', 'Enclosure temperature / humidity', 'AI comm', 'PAS600-PVn', '60 s'],
    ['IN', 'POA irradiance, Tamb, Tmod, wind', 'AI comm', 'WS-01 (plant)', '5 s'],
    ['IN', 'PV LV P, Q, U, I, PF, energy, THD', 'AI comm', 'PM5320-PV', '1 s'],
    ['IN', 'PV ACB closed / tripped', 'DI', 'Rack 2', '20 ms'],
    ['OUT', 'PV ACB close / open', 'DO', 'Rack 2', 'command'],
    ['IN', 'AH2 protection, measurement, events', 'DI/AI comm', 'P5M30-AH2', '1 s'],
  ], { rh: 16 });
  s += T(690, 340, 'Signal count (I/O list, area PV): 18 DI · 1 DO · 155 AI comm · 12 AO comm · plus weather station 7 and AH2 relay points.', { s: 9.5, c: C.mute });
  s += T(690, 372, 'TABLE B – CONTROL FUNCTIONS AND BEHAVIOUR', { b: true, s: 11 });
  s += table(690, 380, [150, 400], [
    ['Function', 'Description'],
    ['Curtailment', 'PPC writes P limit to all inverters when BESS reaches charge limit or SOC ≥ 97 %.'],
    ['', 'Ramp rate 10 %/s (TBC with BESS vendor).'],
    ['Reactive power', 'Inverters at PF 1.0 by default; Q setpoint available to PPC.'],
    ['Close permissive AH2', 'Bus live (BESS or DG forming the grid). PV cannot energise the bus.'],
    ['Loss of grid former', 'Inverters trip on their own V / f protection (anti-islanding).'],
    ['Comms loss PLC ↔ inverter', 'Inverter comms watchdog 30 s → fallback P limit (vendor setting, TBC).'],
    ['', 'SCADA raises P2 alarm, values shown with bad quality.'],
    ['String monitoring', 'String current vs. array average: warn at −10 %, alarm at −30 %.'],
    ['Performance ratio', 'Calculated in SCADA from PV energy and WS-01 irradiation.'],
  ], { rh: 16 });
  s += T(690, 572, 'TABLE C – INTERFACE RESPONSIBILITY', { b: true, s: 11 });
  s += table(690, 580, [220, 165, 165], [
    ['Item', 'PV / inverter vendor', 'SCADA contractor'],
    ['Modbus register map SG350HX', 'Supply', 'Implement'],
    ['RS485 cable inverter → NTS', 'Terminate at inverter', 'Supply, lay, test'],
    ['Inverter Modbus ID / baud setting', 'Set', 'Verify'],
    ['Auxiliary contacts MCCB / SPD', 'Wire to terminal strip', 'Wire to NTS'],
    ['Weather station sensors & logger', 'Supply, install', 'Integrate (Modbus TCP)'],
    ['Curtailment test at SAT', 'Witness', 'Perform'],
  ], { rh: 16 });
  return sheet('SCADA-003', 'PV INTERFACE', 'Signal exchange, control and scope boundary', s,
    ['pwr', 'dc', 'rtu', 'eip', 'tcp', 'fo', 'hw', { sym: (x, y) => R(x, y - 6, 40, 12, { st: '#c9302c', d: '8 4' }), l: 'Vendor scope boundary' }],
    ['Ratings from Overall SLD and inverter wiring diagram BFE/PR/26/01.',
     'One NTS island and one PAS600 per PV area as per the offer (Inverter & DC combiner 1–4).',
     'The BOM line PVSCL60E (Schneider string inverter) does not apply: the plant uses Sungrow SG350HX. Remove from BOM.',
     'Modbus register map of SG350HX to be obtained from Sungrow before FAT.',
     'Signal names follow the I/O list (area PV, tags VS_PV_INV_NB0x_…).']);
}

/* ================================================================== 004 BESS INTERFACE */
function sheet004() {
  let s = '';
  s += zone(30, 30, 640, 1050, 'POWER AND SIGNAL INTERFACE – BATTERY ENERGY STORAGE', { f: '#fff' });
  const px = 200;
  s += dev(px - 70, 60, 140, 46, 'GIS PANEL AH3', ['QF13 VCB · P5M30-AH3'], { k: 'tcp' });
  s += L([[px, 106], [px, 150]], 'pwr') + xfmr(px, 170, '1 MVA 11/0.69 kV Dd0', 'BESS transformer');
  s += L([[px, 191], [px, 260]], 'pwr') + breaker(px, 230, { l: 'BESS ACB 1000 A 15 kA' }) + L([[px - 110, 260], [px + 150, 260]], 'pwr', { w: 5 }) + T(px - 110, 253, '0.69 kV · PM5320-BESS', { s: 9.5, b: true });
  // vendor container
  s += R(40, 300, 620, 330, { st: '#c9302c', d: '8 4', sw: 1.2 }) + T(650, 318, 'BESS VENDOR SCOPE (CONTAINER)', { s: 9.5, b: true, c: '#c9302c', a: 'end' });
  [[120, 'PCS-1'], [280, 'PCS-2']].forEach(([x, n]) => { s += L([[x, 260], [x, 340]], 'pwr') + breaker(x, 290, { l: '400 A' }) + dev(x - 50, 340, 100, 50, n, ['grid-forming', 'qty / kW TBC'], { k: 'vnd', ts: 10 }) + L([[x, 390], [x, 440]], 'dc'); });
  s += dev(60, 440, 130, 60, 'Racks 1–4', ['BMS', 'LFP 3.2 V 314 Ah'], { k: 'vnd', ts: 10 }) + dev(220, 440, 130, 60, 'Racks 5–8', ['BMS', '416S8P'], { k: 'vnd', ts: 10 });
  s += dev(420, 340, 220, 70, 'BESS-EMS', ['Energy management controller', 'Modbus TCP server · 10.10.30.41', 'Heartbeat, setpoints, limits'], { k: 'fo' });
  s += L([[420, 365], [170, 365]], 'vnd') + L([[420, 380], [330, 380]], 'vnd') + L([[420, 470], [350, 470]], 'vnd') + L([[530, 410], [530, 470], [420, 470]], 'vnd');
  s += dev(420, 520, 220, 90, 'Container safety & HVAC', ['FACP-BESS: smoke, heat, H₂ / CO off-gas', 'Aerosol suppression, exhaust fan', 'E-stop push buttons', 'HVAC units (status via EMS)'], { k: 'hw' });
  s += T(60, 528, '3.34 MWh total', { s: 10, b: true }) + T(60, 542, '8 racks · 2 PCS (to be confirmed)', { s: 9.5, c: C.mute });
  // SCADA side
  s += dev(60, 700, 210, 46, 'LS-BESS field switch', ['FO ring to SW2 (sheet 002)'], { k: 'fo' });
  s += L([[530, 340], [530, 320], [660, 320], [660, 723], [270, 723]], 'tcp') + lbl(600, 700, 'EMS Ethernet', { a: 'middle' });
  s += dev(60, 790, 210, 46, 'PM5320-BESS', ['0.69 kV metering'], { k: 'tcp' }) + L([[165, 746], [165, 790]], 'tcp');
  s += L([[px - 7, 230], [50, 230], [50, 900], [330, 900]], 'hw') + lbl(55, 660, 'ACB contacts / coils');
  s += L([[530, 610], [530, 880], [330, 880]], 'hw') + lbl(540, 760, 'Fire, off-gas, suppression, E-stop');
  s += dev(330, 860, 300, 70, 'RACK 2 (GIS room)', ['DI: ACB closed / tripped, fire, off-gas,', 'suppression released, E-stop active, PCS fault', 'DO: ACB close / open, BESS emergency trip'], { k: 'eip' });
  s += dev(60, 960, 270, 50, 'M580 PLANT CONTROLLER (PPC)', ['Modbus TCP client to BESS-EMS, PM5320, P5M30-AH3'], { k: 'eip' });
  s += L([[px + 70, 83], [655, 83], [655, 300]], 'tcp') + lbl(640, 100, 'P5M30-AH3 Modbus TCP', { a: 'end' });
  s += T(350, 965, 'INTERFACE POINTS:', { s: 10, b: true });
  ['① EMS Ethernet port (RJ45 / FO) in container', '② Terminal strip X-BESS: volt-free contacts', '③ BESS ACB aux contacts and coils', '④ PM5320-BESS on LV busbar'].forEach((t, i) => s += T(350, 981 + i * 14, t, { s: 9.5 }));
  // tables
  s += T(690, 46, 'TABLE A – SIGNAL EXCHANGE SCADA ↔ BESS', { b: true, s: 11 });
  s += table(690, 54, [36, 260, 70, 90, 94], [
    ['Dir.', 'Signal', 'Type', 'Path', 'Rate'],
    ['IN', 'SOC, SOH, energy stored, charged / discharged', 'AI comm', 'EMS', '1 s'],
    ['IN', 'Max charge / discharge power allowed', 'AI comm', 'EMS', '200 ms'],
    ['IN', 'P, Q, U, f per PCS; DC U, I', 'AI comm', 'EMS', '200 ms'],
    ['IN', 'Rack V, I, SOC, max temp, cell V max/min', 'AI comm', 'EMS', '5 s'],
    ['IN', 'PCS running, grid-forming, fault, warning', 'DI comm', 'EMS', '200 ms'],
    ['IN', 'HVAC temp / humidity, container status', 'AI comm', 'EMS', '10 s'],
    ['IN', 'EMS heartbeat counter', 'AI comm', 'EMS', '1 s'],
    ['OUT', 'PLC heartbeat counter', 'AO comm', 'PPC', '1 s'],
    ['OUT', 'P / Q setpoint, mode GF / GFL, start/stop', 'AO comm', 'PPC', 'on change'],
    ['OUT', 'SOC limits (min / max) for PPC dispatch', 'AO comm', 'PPC', 'on change'],
    ['IN', 'ACB closed / tripped', 'DI', 'Rack 2', '20 ms'],
    ['IN', 'Fire alarm, off-gas alarm, suppression released', 'DI', 'Rack 2', '20 ms'],
    ['IN', 'E-stop active, PCS common fault (backup)', 'DI', 'Rack 2', '20 ms'],
    ['OUT', 'ACB close / open, BESS emergency trip', 'DO', 'Rack 2', 'command'],
    ['IN', 'LV P, Q, U, I, PF, energy', 'AI comm', 'PM5320', '1 s'],
    ['IN', 'AH3 protection, measurement, events', 'DI/AI comm', 'P5M30-AH3', '1 s'],
  ], { rh: 16 });
  s += T(690, 340, 'Signal count (I/O list, area BESS): 6 DI · 2 DO · 88 AI comm · 16 DI comm · 8 AO comm.', { s: 9.5, c: C.mute });
  s += T(690, 372, 'TABLE B – OPERATING MODES', { b: true, s: 11 });
  s += table(690, 380, [140, 140, 270], [
    ['Mode', 'V / f set by', 'PPC role'],
    ['Normal (islanded)', 'PCS grid-forming', 'Charge limit, SOC window, PV curtailment'],
    ['DG support', 'PCS grid-forming', 'DG base load, BESS charges from DG'],
    ['Black start', 'PCS grid-forming', 'Sequenced breaker closing (sheet 005 / HMI)'],
    ['BESS unavailable', 'DG controller', 'DG isochronous, PV limited to load'],
    ['Maintenance', '—', 'BESS ACB open, AH3 earthed, permit to work'],
  ], { rh: 16 });
  s += T(690, 496, 'TABLE C – FAILURE BEHAVIOUR', { b: true, s: 11 });
  s += table(690, 504, [170, 380], [
    ['Event', 'Response'],
    ['EMS loses PLC heartbeat > 10 s', 'PCS keeps grid-forming with local droop; setpoints frozen.'],
    ['PLC loses EMS heartbeat > 10 s', 'P1 alarm; DG auto-start; PV limit held at last value.'],
    ['Fire / off-gas alarm', 'Hard-wired trip: PCS stop, ACB open, HVAC recirc. off,'],
    ['', 'exhaust on. Works without communication.'],
    ['E-stop in container', 'PCS stop and ACB trip by vendor circuit; status to SCADA.'],
    ['SOC below minimum', 'Load shedding by LVDB priority if no DG available.'],
    ['AH3 protection trip', 'Bus dead unless DG running; black start from BESS.'],
  ], { rh: 16 });
  s += T(690, 646, 'TABLE D – INTERFACE RESPONSIBILITY', { b: true, s: 11 });
  s += table(690, 654, [220, 165, 165], [
    ['Item', 'BESS vendor', 'SCADA contractor'],
    ['EMS Modbus register map & heartbeat', 'Supply', 'Implement'],
    ['Terminal strip X-BESS (volt-free)', 'Supply, wire inside', 'Cable to Rack 2'],
    ['Fire / suppression system', 'Supply, commission', 'Monitor only'],
    ['PCS control modes & droop settings', 'Set, document', 'Verify at SAT'],
    ['Fibre patch panel in container', 'Space & power', 'Supply, install'],
  ], { rh: 16 });
  return sheet('SCADA-004', 'BESS INTERFACE', 'Signal exchange, modes and scope boundary', s,
    ['pwr', 'dc', 'tcp', 'fo', 'hw', 'eip', 'vnd', { sym: (x, y) => R(x, y - 6, 40, 12, { st: '#c9302c', d: '8 4' }), l: 'Vendor scope boundary' }],
    ['Ratings from Overall SLD BFE/PR/26/01: 3.34 MWh 416S8P, 1 MVA 11/0.69 kV, 2 × 400 A to the PCS.',
     'PCS quantity, rating and the EMS make are to be confirmed by the BESS vendor.',
     'SCADA never releases the fire suppression; it monitors only.',
     'Hard-wired trips act independently of the PLC and of communication.',
     'Signal names follow the I/O list (area BESS, tags VS_BESS_…).']);
}

/* ================================================================== 005 SLD OVERVIEW */
function sheet005(img) {
  let s = '';
  s += zone(30, 30, 1210, 520, 'SCADA OVERVIEW SCREEN – FOLLOWS OVERALL SLD BFE/PR/26/01 (VALUES ILLUSTRATIVE)', { f: '#fff' });
  s += `<image x="40" y="50" width="1190" height="${Math.round(1190 * img.h / img.w)}" href="data:image/png;base64,${img.b64}"/>`;
  s += T(40, 576, 'TABLE A – SYMBOL TO SIGNAL REFERENCE', { b: true, s: 11 });
  s += table(40, 584, [150, 260, 180], [
    ['Symbol', 'Status / measurement tags', 'Source'],
    ['AH1…AH8 VCB', 'VS_GIS_AHn_QF_CLS / _OPN / _TRP', 'Rack 2 DI (hard-wired)'],
    ['AH1…AH8 values', 'VS_GIS_AHn_P / _IA / _UAB', 'P5M30-AHn'],
    ['AH1…AH8 command', 'VS_GIS_AHn_CMD_CLS / _CMD_OPN', 'Rack 2 DO, SBO'],
    ['Earth switch', 'VS_GIS_AHn_QL_ES', 'Rack 2 DI'],
    ['DG ACB Q2 / Q3', 'VS_DG_DGn_ACB_CLS / _ACB_TRP', 'Rack 2 DI'],
    ['DG1 / DG2 block', 'VS_DG_DGn_P / _RUN / _AUTO', 'DGC-n (RS485)'],
    ['PV ACB', 'VS_PV_LV_ACB_CLS / _ACB_TRP', 'Rack 2 DI'],
    ['Inverter kW', 'VS_PV_INV_NB0n_PAC / _STATE', 'NTS-PVn (RS485)'],
    ['BESS ACB', 'VS_BESS_LV_ACB_CLS / _ACB_TRP', 'Rack 2 DI'],
    ['BESS block, SOC', 'VS_BESS_SYS_SOC / _P / PCSn_GF', 'BESS-EMS'],
    ['LVDB incomer', 'VS_LV_LVDB_PRES/PM_INC_CLS', 'NTS-LVP / NTS-LVM'],
    ['LVDB kW', 'VS_LV_LVDB_PRES/PM_P', 'PM5320-LVP / -LVM'],
    ['Aux panel', 'VS_AUX_PNL_INC_CLS · VS_AUX_TX_FUSE', 'Rack 2 DI'],
    ['NECR', 'VS_GIS_NECR_NER_TMP / _EFT_TRP', 'P5M30-AH8 / Rack 2'],
    ['Bus kV / Hz', 'VS_GIS_AH3_UAB / _F (bus calc.)', 'P5M30, PLC'],
  ], { rh: 15.5, fs: 9.2 });
  s += T(660, 576, 'TABLE B – SYMBOL AND COLOUR CONVENTIONS', { b: true, s: 11 });
  s += table(660, 584, [150, 420], [
    ['Element', 'Convention'],
    ['Breaker closed', 'Filled red square, text "Closed"'],
    ['Breaker open', 'Filled green square, text "Open"'],
    ['Breaker tripped', 'Filled amber square, text "TRIPPED", P1 alarm'],
    ['Energised conductor', 'Blue line'],
    ['De-energised conductor', 'Grey line'],
    ['Bad quality / comms lost', 'Value shown in magenta with "?" (to be added at detail design)'],
    ['Alarm priority', 'P1 red · P2 amber · P3 blue, shown in alarm banner'],
  ], { rh: 15.5, fs: 9.2 });
  s += T(660, 728, 'TABLE C – OPERATOR INTERACTION', { b: true, s: 11 });
  s += table(660, 736, [150, 420], [
    ['Action', 'Result'],
    ['Click breaker', 'Faceplate: status, values, interlocks, select-before-operate'],
    ['Click equipment', 'Opens detail screen (Generators, BESS, PV, Distribution, Aux)'],
    ['Command', 'Select → operate within 10 s; PLC checks permissives'],
    ['User level', 'Viewer: monitor only · Operator: commands · Engineer: setpoints'],
    ['Logging', 'Every command and setpoint stored with user and time'],
  ], { rh: 15.5, fs: 9.2 });
  s += T(660, 858, 'SCREEN HIERARCHY', { b: true, s: 11 });
  s += table(660, 866, [150, 420], [
    ['Level', 'Screens'],
    ['1 – Plant', 'Overview SLD (this sheet)'],
    ['2 – Area', '11 kV GIS · Generators · BESS · PV & Weather · Distribution · UPS & Fire'],
    ['3 – Function', 'Plant Control (PPC) · Alarms · Trends · Network · I/O List'],
    ['4 – Faceplates', 'Breaker, DG, PCS, inverter, MCCB pop-ups'],
  ], { rh: 15.5, fs: 9.2 });
  return sheet('SCADA-005', 'SCADA OVERVIEW SLD', 'HMI overview screen and signal reference', s,
    [{ sym: (x, y) => R(x + 13, y - 7, 14, 14, { f: '#c9302c', st: C.ink }), l: 'Breaker closed' }, { sym: (x, y) => R(x + 13, y - 7, 14, 14, { f: '#2e8b3e', st: C.ink }), l: 'Breaker open' }, { sym: (x, y) => R(x + 13, y - 7, 14, 14, { f: '#c98a00', st: C.ink }), l: 'Breaker tripped' }, { sym: (x, y) => `<line x1="${x}" y1="${y}" x2="${x + 40}" y2="${y}" stroke="#1b5fa8" stroke-width="3"/>`, l: 'Energised' }, { sym: (x, y) => `<line x1="${x}" y1="${y}" x2="${x + 40}" y2="${y}" stroke="#9aa4ad" stroke-width="3"/>`, l: 'De-energised' }],
    ['Screen captured from the HMI mock-up hmi/villa-somalia-scada.html. Values are simulated and for illustration only.',
     'Layout follows the Overall SLD and 11 kV switchgear configuration of BFE/PR/26/01.',
     'Tag names follow the I/O list docs/villa-somalia-io-list.csv.',
     'Breaker status is from hard-wired auxiliary contacts and confirmed by the relay. Operators must verify locally before working on equipment.']);
}

/* ------------------------------------------------------------------ build */
(async () => {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  // capture the SLD from the HMI in light theme
  const pg = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2, colorScheme: 'light' });
  // fix the simulated clock at 11:30 EAT so the capture shows a typical daytime operating state
  await pg.addInitScript(() => { const off = Date.UTC(2026, 9, 16, 8, 30) - Date.now(); const N = Date; class D extends N { constructor(...a) { a.length ? super(...a) : super(N.now() + off); } static now() { return N.now() + off; } } window.Date = D; });
  await pg.goto('file://' + path.join(ROOT, 'hmi/villa-somalia-scada.html') + '#overview');
  await pg.waitForTimeout(2500);
  const el = await pg.$('#main svg.sld');
  const png = await el.screenshot();
  const box = await el.boundingBox();
  await pg.close();
  const sheets = [['SCADA-001_Architecture', sheet001()], ['SCADA-002_Communication-Network', sheet002()], ['SCADA-003_PV-Interface', sheet003()], ['SCADA-004_BESS-Interface', sheet004()], ['SCADA-005_Overview-SLD', sheet005({ b64: png.toString('base64'), w: box.width, h: box.height })]];
  const page = await browser.newPage();
  for (const [name, svg] of sheets) {
    fs.writeFileSync(path.join(OUT, `BFE-PR-26-01-${name}.svg`), svg);
    await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
    await page.pdf({ path: path.join(OUT, `BFE-PR-26-01-${name}.pdf`), width: '420mm', height: '297mm', printBackground: true, pageRanges: '1' });
  }
  await page.setContent(`<html><head><style>@page{size:420mm 297mm;margin:0}body{margin:0}svg{display:block;width:420mm;height:297mm;page-break-after:always}</style></head><body>${sheets.map(x => x[1]).join('')}</body></html>`);
  await page.pdf({ path: path.join(OUT, 'BFE-PR-26-01-SCADA-Drawing-Set.pdf'), width: '420mm', height: '297mm', printBackground: true });
  await browser.close();
  console.log('wrote', sheets.length, 'sheets to', OUT);
})();
