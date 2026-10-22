# Villa Somalia SCADA HMI

SCADA screen design for the Villa Somalia solar-hybrid plant (Ministry of Energy & Water Resources, Somalia).
The control system is based on the Schneider Electric offer: Modicon M580, X80 and Edge I/O NTS, Easergy P5M30 relays,
PM5320 meters, PAS600 panel servers and EcoStruxure Machine SCADA Expert.

| File | Content |
|---|---|
| `hmi/villa-somalia-scada.html` | Interactive HMI mock-up with 12 screens. Open it in a browser. A simulated plant model drives all values. |
| `docs/villa-somalia-io-list.csv` | Signal list (958 signals) generated from the same plant model. |
| `drawings/BFE-PR-26-01-SCADA-Drawing-Set.pdf` | A3 drawing set, Rev A draft: 001 SCADA architecture, 002 communication network, 003 PV interface, 004 BESS interface, 005 SCADA overview SLD. Single-sheet PDFs and SVGs are next to it. |
| `tools/build-drawings.js` | Regenerates the drawing set: `node tools/build-drawings.js` (needs Playwright/Chromium) |
| `docs/Villa-Somalia-SCADA-BOM.xlsx` | Project bill of material for the Schneider architecture (drawings 001/002): by location, by reference, summary, changes vs offer, I/O capacity check (`python3 tools/build-bom.py`, then recalculate) |
| `docs/Villa-Somalia-SCADA-Client-Requirements.docx` | Client requirements register and compliance matrix (`node tools/build-requirements-docx.js`) |
| `tools/export-io-list.js` | Regenerates the CSV: `node tools/export-io-list.js > docs/villa-somalia-io-list.csv` |

## Plant basis (drawing BFE/PR/26/01)

* 11 kV GIS combiner panel, 1250 A busbar, 8 panels with VCB 630 A 31.5 kA and P5M30 relays:
  AH1 DG sets · AH2 PV in · AH3 BESS in · AH4 Out 1 President · AH5 Aux (SAT) · AH6 Out 2 Prime Minister · AH7 Spare · AH8 NECR.
* PV: 2106 × 720 Wp (1.516 MWp), 81 strings of 26, 4 × Sungrow SG350HX (NB01–NB04), 1.5 MVA 11/0.8 kV Dd0, 1250 A ACB.
* BESS: 3.34 MWh LFP (416S8P, 314 Ah), 8 racks, 1 MVA 11/0.69 kV Dd0, 1000 A ACB, 2 × 400 A to the PCS.
* Diesel: DG1 550 kVA (Q2 800 A) and DG2 660 kVA (Q3 1000 A), 1.5 MVA 11/0.4 kV Dyn11 step-up.
* Transformer stations (President, Prime Minister): GIS-12 RMU with ST260E relay and 2 kVA UPS, 630 kVA 11/0.4 kV, 10-way LVDB.
* Aux: XRNT-3A fuse, 100 kVA transformer, 200 A to the aux panel. NECR: earthing transformer + 63.5 Ω NER, 100 A / 10 s.
* Weather station: Meteocontrol blue'Log XM 5000, SMP12-A irradiance, Gill WindSonic, ambient and module temperature.

## Screens

| Screen | Covers client requirement |
|---|---|
| Overview | Full plant SLD with live flows, breaker states, source lamps and KPIs (DHYBRID-style overview) |
| 11 kV GIS | All VCBs and P5M30 relays: position, earth switch, L/R, VPI, measurements, protection matrix, select-before-operate faceplate with permissives |
| Generators | DG electrical and engine data, ACB Q2/Q3, start/stop/mode, step-up TX |
| BESS | SOC/SOH, limits, 2 PCS, 8 racks, DC system, HVAC, BESS fire safety |
| PV & Weather | 4 inverters, 81 string currents with deviation colouring, PR, curtailment, weather station |
| Distribution | RMUs, 630 kVA transformers, LVDB incomers and 10 MCCBs each, PM5320 and PAS600 TH110/CL110 values, aux supply, load-shed priorities |
| UPS & Fire | UPS and DC chargers, 8 fire detection/suppression zones |
| Plant Control | PPC modes and setpoints (DG start/stop SOC, load shed SOC, PV limit, DG min load), control functions, black-start operational sequence |
| Alarms | Prioritised alarm list (P1–P3) with acknowledge, event journal with user audit trail |
| Trends | 24 h power by source, SOC and irradiance |
| Network | Purdue/IEC 62443 levels, devices and links, protocol table, cybersecurity provisions |
| I/O List | Signal counts by area/type, searchable list, CSV copy |

User levels (Viewer / Operator / Engineer) are enforced on commands and setpoints. Engineer level also exposes
simulation buttons on the GIS faceplate (L/R, earth switch, protection trip) for demonstrating interlocks.

## Gaps found in the offer to resolve before submission

1. **Inverter mismatch.** The BOM lists `PVSCL60E` (Schneider 60 kW string inverter) per PV area. The plant uses 4 × Sungrow SG350HX on an RS485 daisy chain to a "PLC box". Remove PVSCL60E and confirm the SG350HX Modbus map.
2. **I/O capacity is tight.** The model needs about 212 hard-wired DI and 48 DO. Main rack + Rack 2 give 160 DI and 128 DO; Edge I/O NTS adds the LVDB/PV signals. The GIS, DG, BESS and fire contacts (~139 DI) leave little of the usual 20 % spare on the X80 racks. The offer summary (128 DI / 96 DO) under-counts.
3. **No analogue or BESS/DG interface items.** The BOM has no BESS EMS gateway, DG controller interface, fire alarm panel interface or UPS communication cards. These are all in the client's scope list.
4. **Weather station and transformer stations** (President/PM RMUs with ST260E relays) are not mentioned in the offer.
5. **Controller redundancy.** Two BMEP582040 CPUs are listed, but that is not a hot-standby CPU (needs BMEH58xxxx). State whether the second CPU is a spare or change to hot standby.
6. **Datasheets required by the client**: PPC/M580, P5M30, PM5320, Edge I/O NTS, PAS600, MCSESM083, HMI panels, SCADA server/historian, plus the operational sequence on the Plant Control screen.
7. The proposal text still contains wastewater-plant boilerplate ("untreated wastewater"); remove before submission.
8. BESS PCS count and rating (2 PCS assumed) and DG controller make should be confirmed with the vendors.
