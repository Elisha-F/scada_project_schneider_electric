// Builds docs/Villa-Somalia-SCADA-Client-Requirements.docx
// Usage: node tools/build-requirements-docx.js
const fs = require('fs'), path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  HeadingLevel, AlignmentType, LevelFormat, BorderStyle, Header, Footer, PageNumber,
  PageBreak,
} = require('docx');

const FONT = 'Calibri', ACCENT = '1F3442', HEAD_FILL = 'DCE3E8', ZEBRA = 'F3F5F6';
const CONTENT_W = 9638; // A4 with 2 cm margins

const t = (text, o = {}) => new TextRun({ text, font: FONT, size: o.size || 20, bold: o.bold, italics: o.italics, color: o.color });
const p = (text, o = {}) => new Paragraph({ spacing: { after: 120 }, alignment: o.align, children: Array.isArray(text) ? text : [t(text, o)] });
const h1 = s => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 140 }, children: [new TextRun({ text: s })] });
const h2 = s => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 220, after: 100 }, children: [new TextRun({ text: s })] });
const bullet = (s, lvl = 0) => new Paragraph({ numbering: { reference: 'bul', level: lvl }, spacing: { after: 60 }, children: Array.isArray(s) ? s : [t(s)] });
const quote = s => new Paragraph({ spacing: { after: 120 }, indent: { left: 360 }, border: { left: { style: BorderStyle.SINGLE, size: 12, color: '0B7A8F', space: 8 } }, children: [t(s, { italics: true })] });

function table(headers, rows, widths) {
  const sum = widths.reduce((a, b) => a + b, 0);
  widths = widths.map(w => Math.round(w / sum * CONTENT_W));
  widths[widths.length - 1] += CONTENT_W - widths.reduce((a, b) => a + b, 0);
  const border = { style: BorderStyle.SINGLE, size: 4, color: 'B9C1C8' };
  const borders = { top: border, bottom: border, left: border, right: border };
  const cell = (txt, i, head, zebra) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA }, borders,
    shading: head ? { type: ShadingType.CLEAR, fill: HEAD_FILL, color: 'auto' } : zebra ? { type: ShadingType.CLEAR, fill: ZEBRA, color: 'auto' } : undefined,
    margins: { top: 50, bottom: 50, left: 90, right: 90 },
    children: String(txt).split('\n').map(line => new Paragraph({ children: [t(line, { bold: head, size: 18 })] })),
  });
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: widths,
    rows: [new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, i, true)) }),
      ...rows.map((r, k) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, i, false, k % 2 === 1)) }))],
  });
}
const gap = () => new Paragraph({ spacing: { after: 80 }, children: [] });

// ---------------------------------------------------------------- content
const docControl = table(['Item', 'Detail'], [
  ['Project', 'Solarization Villa Somalia – Power Plant Control & SCADA System'],
  ['Client', 'Ministry of Energy & Water Resources – Somalia'],
  ['EPC contractor', 'Blueflag Energy Co. Ltd'],
  ['Automation vendor', 'Schneider Electric (offer "Villa Somalia", version 1, 16/10/2026)'],
  ['Reference drawings', 'BFE/PR/26/01 – general layout, overall SLD, 11 kV switchgear configuration, communication schematic, weather station mast, transformer stations'],
  ['Document', 'Client Requirements Register & Compliance Matrix'],
  ['Revision', 'Rev A – issued for internal review, 16 October 2026'],
], [2, 5]);

const sources = table(['Ref', 'Source document', 'Used for'], [
  ['S1', 'Client comment sheet – SCADA requirements (extract)', 'Formal client demands R1–R5'],
  ['S2', 'Sample SCADA screen – DHYBRID Universal Power Platform, plant overview', 'Expected HMI look, navigation and content'],
  ['S3', 'Schneider Electric offer proposal "Villa Somalia" (42 pages)', 'Proposed architecture, PLC, HMI, network, cybersecurity'],
  ['S4', 'Bill of material for Villa Somalia (xlsx)', 'Hardware quantities, topology, I/O capacity'],
  ['S5', 'Drawing set VILLA SOMALIA 05/10/2026 (25 sheets, BFE/PR/26/01)', 'Plant equipment, ratings and communication schematic'],
], [1, 5, 4]);

const demands = table(['ID', 'Client demand (as stated)', 'Expected deliverable'], [
  ['R1', 'Please submit for approval.', 'Formal SCADA design submission package for client approval, with revision control and a transmittal.'],
  ['R2', 'Provide complete SCADA design to align with the BESS and PV side, and the rest of the equipment, including the GIS Combiner Panel, LVDBs, Generators, etc.', 'SCADA functional design specification; HMI screen set (overview SLD and equipment screens); control philosophy covering BESS, PV, GIS combiner panel, LVDBs and generators.'],
  ['R3', 'The I/O list should be complete with all analogue and digital signals of the entire plant, clearly monitored and controlled as expected. The scope coverage shall include all VCB breakers, relays of the GIS combiner panel, Inverter Transformers, RMU, DGs, combiner panels, weather stations, UPS, Auxiliary Power sources, fire detection and fire suppression systems, among others.', 'Complete I/O and signal list (hard-wired DI/DO/AI/AO and communicated points) per equipment, with tag, description, source module, protocol, units and alarm class.'],
  ['R4', 'Submit communication architecture, protocols, network topology, cybersecurity provisions, and integration with GIS, LVDBs, generators, PV, and BESS.', 'Communication architecture drawing, network topology with IP plan, protocol and interface table, cybersecurity concept (IEC 62443), integration description per subsystem.'],
  ['R5', 'Provide data sheets for all the PPC controllers, field devices, servers, HMI, and operational sequence for approval.', 'Datasheet book for PPC/PLC, field devices, servers and HMI; written operational sequences (start-up, black start, DG dispatch, load shedding, fault response).'],
], [0.7, 4.6, 4.2]);

const ioScope = table(['Equipment (client scope)', 'Plant data (drawings)', 'Minimum monitoring & control', 'Signals in I/O list'], [
  ['VCB breakers – 11 kV GIS combiner panel', '8 panels AH1–AH8, VCB 630 A 31.5 kA, 3-position switch 630 A 20 kA, DXN-12Q VPI, 1250 A busbar', 'Open/closed, tripped/lockout, spring charged, earth switch, L/R, SF6 low, VPI; remote open/close with select-before-operate', 'GIS: 81 DI, 16 DO'],
  ['Relays of the GIS combiner panel', '8 × Easergy P5M30 (Ethernet, RSTP)', 'Relay healthy, pickup and trip per function (50/51, 50N/51N, 27/59, 81, 46, 49), I, U, P, Q, PF, f, energy, THD, breaker wear', 'GIS: 120 DI (comm), 137 AI (comm)'],
  ['Inverter transformers', 'PV TX 1.5 MVA 11/0.8 kV Dd0; BESS TX 1 MVA 11/0.69 kV Dd0; DG TX 1.5 MVA 11/0.4 kV Dyn11', 'Winding/oil temperature, Buchholz/PRD trip, LV ACB status and trip', 'Included in PV, BESS and DG counts'],
  ['RMU', '2 × GIS-12 RMU (President, Prime Minister), ST260E relay, 2 kVA UPS each, 630 kVA 11/0.4 kV TX', 'QL1/QL2/QF11/QK11 positions, ST260E trip, UPS fault, TX temperature and trip', 'LV: part of 58 DI, 22 DO'],
  ['Diesel generators (DGs)', 'DG1 550 kVA (Q2 800 A), DG2 660 kVA (Q3 1000 A)', 'Electrical values, engine data (rpm, oil, coolant, fuel, battery, hours), run/auto/alarm/shutdown, remote start/stop, ACB control, kW setpoint', 'DG: 5 DI, 6 DO, 57 AI (comm), 12 DI (comm), 2 AO (comm)'],
  ['Combiner panels / PV inverters', '4 × Sungrow SG350HX (NB01–NB04), 81 strings × 26 modules, 1.516 MWp, MCCB 400 A, DC/AC SPD', 'Inverter state, AC/DC values, energy, temperature, insulation, string currents, MCCB/DC switch/SPD status, curtailment and Q setpoints', 'PV: 18 DI, 1 DO, 155 AI (comm), 12 AO (comm)'],
  ['Weather station', 'Meteocontrol blue\'Log XM 5000, SMP12-A pyranometer, Gill WindSonic, ambient and module temperature', 'Irradiance, irradiation, temperatures, wind speed/direction, logger comms', 'MET: 6 AI (comm), 1 DI (comm)'],
  ['UPS', 'Control room UPS, 2 × RMU UPS 2 kVA, GIS 110 V DC charger', 'Online/on battery/bypass/fault, battery %, load %, autonomy', 'AUX: 12 DI (comm), 12 AI (comm)'],
  ['Auxiliary power sources', 'Aux feeder AH5, XRNT-3A fuse, 100 kVA 11/0.4 kV TX, 200 A aux panel', 'Fuse blown, incomer status, load, voltage', 'AUX: 2 DI'],
  ['Fire detection & fire suppression', 'GIS room, BESS container, PCS/TX, DG enclosures, control room, LVDB rooms', 'Fire, pre-alarm, zone fault, disabled, suppression released/inhibited; fire trips of HVAC/BESS', 'FIRE: 42 DI, 1 DO'],
  ['BESS (among others)', '3.34 MWh LFP 416S8P 314 Ah, 8 racks, 2 PCS (to be confirmed), 1000 A ACB', 'SOC, SOH, limits, PCS status/power/mode, rack values, HVAC, off-gas, E-stop, setpoints', 'BESS: 6 DI, 2 DO, 88 AI (comm), 16 DI (comm), 8 AO (comm)'],
  ['LVDBs (among others)', '2 × 10-way LVDB, incomer ACB 1000 A, MCCB 250 A, PM5320, PAS600 + TH110/CL110', 'Incomer and MCCB status/trip, load-shed trips, power quality, enclosure temperature/humidity', 'LV: incl. 36 AI (comm)'],
  ['Neutral earthing (NECR)', 'Earthing transformer + NER 63.5 Ω, 100 A / 10 s on AH8', 'NER temperature, earthing TX protection trip', 'GIS'],
  ['Control system diagnostics', 'M580, NOC modules, CRA drop, switches, NOM0200, Edge I/O islands', 'Module health and communication status of each device', 'SYS: 23 DI (diag)'],
], [2.2, 3, 3.6, 2]);

const ioTotals = table(['Signal type', 'Count', 'Comment'], [
  ['DI – hard-wired', '212', 'X80 BMXDDI3202K and Edge I/O NTSDDI1602XK'],
  ['DO – hard-wired', '48', 'X80 BMXDDO3202K and Edge I/O NTSDDO1602K'],
  ['AI – communicated', '491', 'Modbus TCP / RTU from relays, meters, inverters, BESS, DGs, weather station, UPS'],
  ['DI – communicated', '161', 'Status and protection flags read over communication'],
  ['AO – communicated', '22', 'Setpoints: PCS P/Q/mode, inverter P limit and Q, DG kW'],
  ['DI – diagnostics / calculated', '24', 'Device health, communication status, bus live'],
  ['Total', '958', 'Full list: docs/villa-somalia-io-list.csv'],
], [3, 1.2, 6]);

const comms = table(['Client demand', 'Content to submit', 'Basis in the offer / drawings'], [
  ['Communication architecture', 'Layered architecture drawing: Level 3 enterprise/DMZ, Level 2 SCADA LAN, Level 1 M580 control ring, Level 0 field devices', 'M580 BMEP582040, BMENOC0311 ×2, BMENOC0321, BMECRA31210, 2 × MCSESM083F23F1'],
  ['Protocols', 'Interface table with protocol, medium, poll rate, register map owner', 'EtherNet/IP, Modbus TCP, Modbus RTU (BMXNOM0200, NTSFMB0120K); RS485 from inverters (communication schematic)'],
  ['Network topology', 'Topology with switches, ring/RSTP, fibre routes between buildings, IP and VLAN plan', 'RSTP on P5M30; managed switches; drawing "To Powerplant RTU" link from inverter PLC box and weather station switch'],
  ['Cybersecurity provisions', 'Zones and conduits (IEC 62443), firewall/DMZ, role-based access, audit trail, hardening, patch and backup policy, remote access with MFA', 'Offer section "Cyber Security"; BMENOC0321 IP forwarding; Achilles-certified M580'],
  ['Integration with GIS', 'P5M30 Modbus TCP map, hard-wired breaker status and commands, interlocks', '8 × P5M30, X80 I/O on Rack 2'],
  ['Integration with LVDBs', 'Edge I/O NTS, PM5320, PAS600 integration; RMU signals', 'Edge I/O NTS islands at LVDB 1/2, PAS600, TH110/CL110'],
  ['Integration with generators', 'DG controller register map, start/stop and ACB control, synchronising responsibility', 'Modbus RTU via BMXNOM0200 (controller make to be confirmed)'],
  ['Integration with PV', 'SG350HX register map, curtailment and reactive power control, string monitoring, weather station', 'NTSFMB0120K serial masters; blue\'Log XM 5000'],
  ['Integration with BESS', 'EMS/BMS register map, PCS grid-forming control, SOC limits, fire interlocks', 'BESS EMS Modbus TCP (interface not yet in BOM)'],
], [2.2, 4, 3.6]);

const datasheets = table(['Category (client wording)', 'Items requiring datasheets', 'Reference'], [
  ['PPC controllers', 'Modicon M580 CPU; X80 power supply, backplanes, DI/DO, serial module; Ethernet scanner and drop adapter', 'BMEP582040, BMXCPS3020, BMEXBP0800/1200, BMXDDI3202K, BMXDDO3202K, BMXNOM0200, BMENOC0311/0321, BMECRA31210'],
  ['Field devices', 'Protection relays, power meters, distributed I/O, panel servers, environment sensors, network switches', 'Easergy P5M30 (REL50458), PM5320 (METSEPM5320), Edge I/O NTS (NTSNEC1200K, NTSPFB1002HK, NTSDDI1602XK, NTSDDO1602K, NTSFMB0120K), PAS600, TH110 (EMS59440), CL110 (130729), MCSESM083F23F1'],
  ['Third-party field devices', 'Inverters, BESS EMS/PCS, DG controllers, weather station, RMU relay, fire panel, UPS', 'Sungrow SG350HX, BESS EMS/PCS, DG controller, Meteocontrol blue\'Log XM 5000, ST260E, FACP, UPS cards'],
  ['Servers', 'SCADA server/historian, engineering station, NTP/GPS clock, firewall', 'To be specified (not in BOM)'],
  ['HMI', 'Operator panels and SCADA software licences', 'HMIP67GD0F88BE7N00 ×2, EcoStruxure Machine SCADA Expert runtime 4K ×2, build-time 4K ×1'],
  ['Operational sequence', 'Black start from BESS, normal dispatch, DG auto start/stop, PV curtailment, load shedding, fault and fire response, return to normal', 'Draft sequence on HMI "Plant Control" screen; to be issued as a written document'],
], [2, 3.8, 4]);

const hmiExpect = [
  'Top navigation by plant area, as in the sample: Overview, Generator, Battery, PV System, Load, Plant Information, UPS.',
  'Overall single-line diagram showing every source and feeder with live kW, V and breaker state (Closed/Open) next to each breaker.',
  'Breaker action buttons (ON/OFF) available from the SLD, restricted by user level.',
  'Source summary blocks: generator rating, loading %, kW, V, Hz; BESS rated power/energy, SOC %, kWh, PCS mode (grid forming).',
  'Inverter tiles showing kW for every PV inverter.',
  'Source availability lamps (PV, BAT, DG) and day/night indication.',
  'Logged-in user level, date/time, firmware/system ID and logout in the footer.',
  'Operator notice that breaker status comes over communication and must be checked locally before work.',
];

const compliance = table(['ID', 'Requirement', 'Status in offer', 'Covered by SCADA design package', 'Action required'], [
  ['R1', 'Submission for approval', 'Not yet submitted', 'This register, HMI mock-up, I/O list', 'Compile package and transmit for approval'],
  ['R2', 'Complete SCADA design (BESS, PV, GIS, LVDB, DG)', 'Partial – narrative only', '12 HMI screens incl. overview SLD, GIS, generators, BESS, PV, distribution', 'Write functional design specification; client review of screens'],
  ['R3', 'Complete I/O list incl. VCBs, GIS relays, inverter TX, RMU, DGs, combiner panels, weather station, UPS, aux power, fire', 'Gap – 128 DI / 96 DO configured, no analogue or communicated points listed', '958-signal list across all named equipment', 'Recheck X80 DI spare capacity (~139 DI on racks vs 160 available); add interfaces missing from BOM'],
  ['R4', 'Communication architecture, protocols, topology, cybersecurity, integration', 'Partial – architecture and protocols described', 'Network screen with topology, protocol table and cybersecurity provisions', 'Issue topology drawing with IP/VLAN plan and IEC 62443 zone register'],
  ['R5', 'Datasheets (PPC, field devices, servers, HMI) and operational sequence', 'Gap – not provided', 'Datasheet list (section 6), draft black-start sequence', 'Collect datasheets; specify servers; write operational sequences'],
], [0.6, 2.4, 2.1, 2.5, 2.4]);

const openItems = [
  'BOM lists Schneider PVSCL60E string inverters; the site uses 4 × Sungrow SG350HX. Correct the BOM and confirm the SG350HX Modbus register map.',
  'No interface items in the BOM for BESS EMS/BMS, DG controllers, fire alarm control panel or UPS communication cards.',
  'Weather station and the President/Prime Minister transformer stations (RMU, ST260E) are not described in the offer.',
  'Two BMEP582040 CPUs are listed; this CPU is not hot-standby capable. Confirm spare or change to an M580 hot-standby CPU.',
  'SCADA server, historian, engineering station and GPS time server are not in the BOM.',
  'Confirm BESS PCS quantity and rating (2 PCS assumed for the 1 MVA transformer).',
  'Confirm DG controller make and who performs synchronising of DG1/DG2 to the BESS-formed bus.',
  'Remove wastewater-plant boilerplate from the offer text before submission.',
];

const plantBasis = table(['System', 'Key data'], [
  ['PV generator', '2106 × 720 Wp Jinko (1.516 MWp), 26 modules per string, 81 strings, 4 × SG350HX 350 kW'],
  ['BESS', '3.34 MWh LFP, 416S8P 3.2 V 314 Ah, 8 racks, 1 MVA 11/0.69 kV'],
  ['Diesel generators', 'DG1 550 kVA, DG2 660 kVA, 1.5 MVA 11/0.4 kV step-up'],
  ['11 kV GIS combiner panel', 'Busbar 1250 A, 8 panels: AH1 DG sets, AH2 PV in, AH3 BESS in, AH4 Out 1 (President), AH5 Aux (SAT), AH6 Out 2 (Prime Minister), AH7 Spare, AH8 NECR'],
  ['Loads', 'Two 630 kVA transformer stations with RMU, each feeding a 10-way LVDB; aux panel via 100 kVA transformer'],
  ['Earthing', 'Earthing transformer and NER 63.5 Ω, 100 A for 10 s'],
  ['Operating mode', 'Islanded microgrid: BESS PCS grid-forming, PV grid-following, DGs as backup on low SOC'],
], [2.2, 7]);

// ---------------------------------------------------------------- document
const doc = new Document({
  creator: 'Villa Somalia SCADA team', title: 'Villa Somalia SCADA – Client Requirements Register',
  styles: {
    default: { document: { run: { font: FONT, size: 20 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 30, bold: true, color: ACCENT }, paragraph: { outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 24, bold: true, color: '0B7A8F' }, paragraph: { outlineLevel: 1 } },
    ],
  },
  numbering: { config: [{ reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [t('Villa Somalia SCADA – Client Requirements Register · Rev A', { size: 16, color: '5D6A75' })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ font: FONT, size: 16, color: '5D6A75', children: ['Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES] })] })] }) },
    children: [
      new Paragraph({ spacing: { before: 1800, after: 120 }, children: [t('SOLARIZATION VILLA SOMALIA', { size: 22, bold: true, color: '0B7A8F' })] }),
      new Paragraph({ spacing: { after: 120 }, children: [t('SCADA System – Client Requirements Register', { size: 44, bold: true, color: ACCENT })] }),
      new Paragraph({ spacing: { after: 600 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: '0B7A8F', space: 6 } }, children: [t('All client demands for the power plant control and SCADA system, with plant basis, required deliverables and compliance status', { size: 24, color: '5D6A75' })] }),
      docControl,
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({ spacing: { after: 160 }, children: [t('Contents', { size: 30, bold: true, color: ACCENT })] }),
      ...['1. Purpose and sources', '2. Client demands', '3. Plant basis', '4. I/O list requirements (R3)', '5. Communication and integration requirements (R4)', '6. Datasheets and operational sequence (R5)', '7. HMI expectations from the client sample', '8. Compliance matrix', '9. Open items and clarifications'].map(s => p(s, { size: 22 })),
      new Paragraph({ children: [new PageBreak()] }),

      h1('1. Purpose and sources'),
      p('This register records every demand the client has made for the Villa Somalia SCADA system, the deliverable each demand calls for, and how far the current Schneider Electric offer meets it. It is the checklist for the SCADA design submission.'),
      sources, gap(),

      h1('2. Client demands'),
      p('The client issued the following five demands on the SCADA scope (source S1). The wording is reproduced as received.'),
      demands, gap(),
      h2('2.1 Equipment named by the client'),
      p('Demand R3 names the equipment that must appear in the I/O list. "Among others" is read to include the BESS, PV inverters, LVDBs, neutral earthing and the control system itself:'),
      ...['All VCB breakers', 'Relays of the GIS combiner panel', 'Inverter transformers', 'RMU', 'Diesel generators (DGs)', 'Combiner panels', 'Weather stations', 'UPS', 'Auxiliary power sources', 'Fire detection and fire suppression systems'].map(s => bullet(s)),

      h1('3. Plant basis'),
      p('The SCADA design must match the plant shown in drawing set BFE/PR/26/01 (source S5).'),
      plantBasis, gap(),

      h1('4. I/O list requirements (R3)'),
      p('Each item in the client scope, the plant data behind it, the minimum signals to monitor and control, and the number of signals carried in the current I/O list.'),
      ioScope, gap(),
      h2('4.1 I/O list totals'),
      ioTotals, gap(),
      h2('4.2 Required I/O list fields'),
      ...['Unique tag name (VS_<area>_<equipment>_<signal>)', 'Description and plant area', 'Signal type: DI, DO, AI, AO, or communicated point', 'Source device, module and channel', 'Protocol and register address', 'Engineering units and range', 'Alarm class (P1 critical, P2 warning, P3 advisory) and limits', 'Control: command type and interlock reference'].map(s => bullet(s)),

      h1('5. Communication and integration requirements (R4)'),
      comms, gap(),

      h1('6. Datasheets and operational sequence (R5)'),
      datasheets, gap(),
      h2('6.1 Operational sequences to submit'),
      ...['Black start from BESS: confirm dead bus, start PCS in grid-forming mode, close AH3, AH8, AH5, then AH4 and AH6, then PV (AH2), then DG if SOC is low.', 'Normal dispatch: BESS sets voltage and frequency; PV supplies load and charges the BESS; PV curtailed at the BESS charge limit or high SOC.', 'DG auto start/stop on SOC thresholds, with minimum DG loading.', 'Low-SOC and under-frequency load shedding by LVDB priority.', 'Fault response: protection trips, breaker failure, loss of communication.', 'Fire response: trips of PCS, BESS ACB and HVAC; suppression monitoring only.'].map(s => bullet(s)),

      h1('7. HMI expectations from the client sample'),
      p('The client supplied a sample screen from an existing hybrid plant (source S2). The Villa Somalia HMI is expected to offer at least the same content:'),
      ...hmiExpect.map(s => bullet(s)),
      quote('Sample notice: "Information on the breaker status is provided via communication… It is mandatory to always physically check this breaker before interacting with the system."'),

      h1('8. Compliance matrix'),
      compliance, gap(),

      h1('9. Open items and clarifications'),
      ...openItems.map(s => bullet(s)),
    ],
  }],
});

const out = path.join(__dirname, '../docs/Villa-Somalia-SCADA-Client-Requirements.docx');
Packer.toBuffer(doc).then(b => { fs.writeFileSync(out, b); console.log('wrote', out); });
