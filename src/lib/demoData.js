// Sample data for demo mode. Every person, phone number and email here is fictional.
import { DEPARTMENTS_AS_AGENCIES as AGENCIES } from "./constants.js";

const HOUR = 36e5;
const ago = (hours) => new Date(Date.now() - hours * HOUR).toISOString();

export const DEMO_PASSWORD = "demo1234";
export const DEMO_ACCOUNTS = [
  { matricule: "AD-0001", role: "Admin" },
  { matricule: "AG-1042", role: "IT agent" },
  { matricule: "EM-2001", role: "Employee" },
];

export function makeDemoData() {
  const person = (id, matricule, name, role, agency, jobTitle, department, extra = {}) => ({
    id, matricule, name, role, agency, jobTitle, department,
    phone: `+237 650 000 ${id.slice(-3)}`, email: `${name.split(" ")[0].toLowerCase()}@example.com`,
    photoUrl: null, isItTechnician: role !== "employee", createdAt: ago(24 * 90), ...extra,
  });

  const users = [
    person("u-001", "AD-0001", "Grace Mbah", "admin", AGENCIES[0], "IT Manager", "Information Systems"),
    person("u-002", "AG-1042", "Eric Tamba", "agent", AGENCIES[0], "Support Technician", "Information Systems"),
    person("u-003", "AG-1055", "Linda Fon", "agent", AGENCIES[1], "Support Technician", "Information Systems"),
    person("u-101", "EM-2001", "Paul Nkem", "employee", AGENCIES[0], "Accountant", "Finance"),
    person("u-102", "EM-2002", "Sandra Eyong", "employee", AGENCIES[1], "HR Officer", "Human Resources"),
    person("u-103", "EM-2003", "Victor Ashu", "employee", AGENCIES[2], "Field Engineer", "Operations"),
    person("u-104", "EM-2004", "Mireille Ngo", "employee", AGENCIES[7], "Customer Service Lead", "Customer Care"),
    person("u-105", "EM-2005", "Daniel Tabi", "employee", AGENCIES[0], "Procurement Officer", "Logistics"),
    person("u-106", "EM-2006", "Esther Kum", "employee", AGENCIES[3], "Billing Analyst", "Finance"),
  ];
  const byId = Object.fromEntries(users.map(u => [u.id, u]));

  const deviceCatalog = [
    { id: "cat-laptop", itemType: "Laptop (Computer)", totalStock: 9, lowStockThreshold: 3 },
    { id: "cat-desktop", itemType: "Desktop Computer", totalStock: 4, lowStockThreshold: 2 },
    { id: "cat-phone", itemType: "Smartphone", totalStock: 5, lowStockThreshold: 2 },
    { id: "cat-monitor", itemType: "Monitor", totalStock: 6, lowStockThreshold: 2 },
    { id: "cat-router", itemType: "4G Router", totalStock: 3, lowStockThreshold: 2 },
  ];

  const devices = [];
  const addUnits = (itemType, prefix, n) => {
    for (let i = 1; i <= n; i++) {
      const serial = `${prefix}-${String(1000 + i)}`;
      devices.push({ id: serial, serial, itemType, status: "Available", registeredAt: ago(24 * 120), assignedTo: null, assignedToName: null, assetCode: null, issuedAt: null });
    }
  };
  addUnits("Laptop (Computer)", "LTP", 9);
  addUnits("Desktop Computer", "DSK", 4);
  addUnits("Smartphone", "PHN", 5);
  addUnits("Monitor", "MON", 6);
  addUnits("4G Router", "RTR", 3);
  const unit = (serial) => devices.find(d => d.serial === serial);
  unit("MON-1006").status = "In Maintenance";
  unit("RTR-1003").status = "Decommissioned";

  const assets = [];
  const issue = (code, type, model, userId, serial, hoursAgo, condition = "Good") => {
    const u = byId[userId];
    const at = ago(hoursAgo);
    const d = unit(serial);
    Object.assign(d, { status: "Issued", assignedTo: u.id, assignedToName: u.name, assetCode: code, issuedAt: at });
    assets.push({
      id: code, code, type, model, employeeId: u.id, agency: u.agency, issueDate: at.slice(0, 10), status: "In Service",
      serial, inventoryItemType: d.itemType,
      assignee: { name: u.name, matricule: u.matricule, jobTitle: u.jobTitle, department: u.department, agency: u.agency, phone: u.phone, email: u.email, userId: u.id },
      assignedAt: at, assignedBy: { id: "u-001", name: "Grace Mbah", matricule: "AD-0001" }, condition, notes: "",
      history: [{ action: "Assigned", at, by: "Grace Mbah", to: u.name, detail: `Unit ${serial} taken from ${d.itemType} stock` }],
    });
  };
  issue("NX-LT-0101", "Laptop", "Dell Latitude 5440", "u-101", "LTP-1001", 24 * 60);
  issue("NX-LT-0102", "Laptop", "HP EliteBook 840 G9", "u-102", "LTP-1002", 24 * 45, "New");
  issue("NX-LT-0103", "Laptop", "Lenovo ThinkPad T14", "u-103", "LTP-1003", 24 * 30);
  issue("NX-DT-0201", "Desktop Computer", "HP ProDesk 400 G7", "u-104", "DSK-1001", 24 * 75, "Refurbished");
  issue("NX-PH-0301", "Smartphone / Phone", "Samsung Galaxy A54", "u-103", "PHN-1001", 24 * 20, "New");
  issue("NX-LT-0104", "Laptop", "Dell Latitude 5440", "u-105", "LTP-1004", 24 * 12, "New");
  issue("NX-MN-0401", "Monitor", "Dell P2422H 24\"", "u-106", "MON-1001", 24 * 8);
  issue("NX-LT-0105", "Laptop", "HP ProBook 450 G10", "u-002", "LTP-1005", 24 * 100);

  const ticket = (id, assetCode, userId, description, priority, status, techId, hoursAgo) => {
    const u = byId[userId];
    const createdAt = ago(hoursAgo);
    const history = [{ status: "Received / In Queue", at: createdAt, by: u.name }];
    let resolvedAt = null, closedAt = null;
    if (status !== "Received / In Queue") history.push({ status: "In Progress", at: ago(hoursAgo - 1), by: byId[techId].name });
    if (status === "Resolved" || status === "Closed") { resolvedAt = ago(Math.max(hoursAgo - 6, 0.5)); history.push({ status: "Resolved", at: resolvedAt, by: byId[techId].name }); }
    if (status === "Closed") { closedAt = ago(Math.max(hoursAgo - 8, 0.2)); history.push({ status: "Closed", at: closedAt, by: byId[techId].name }); }
    return { id, assetCode, employeeId: u.id, employeeName: u.name, agency: u.agency, description, priority, status, technicianId: techId, createdAt, resolvedAt, closedAt, history };
  };
  const tickets = [
    ticket("TCK-7Q2M4A", "NX-LT-0101", "u-101", "Laptop battery drains in under an hour and the charger gets very hot.", "High", "In Progress", "u-002", 9),
    ticket("TCK-3HD81K", "NX-DT-0201", "u-104", "Desktop will not boot after power cut — stuck on the BIOS screen.", "Urgent", "Received / In Queue", "u-003", 5),
    ticket("TCK-P9W2LZ", "NX-LT-0102", "u-102", "Outlook keeps asking for the password and will not sync mail.", "Medium", "Received / In Queue", null, 30),
    ticket("TCK-B4N6TR", "NX-PH-0301", "u-103", "Phone screen cracked during a field visit; touch still works.", "Low", "In Progress", "u-002", 50),
    ticket("TCK-K8S0VE", "NX-LT-0103", "u-103", "VPN disconnects every few minutes from the Bafoussam office.", "High", "Resolved", "u-003", 26),
    ticket("TCK-Z1F5QD", "NX-MN-0401", "u-106", "Monitor flickers when connected through the docking station.", "Medium", "Closed", "u-002", 96),
    ticket("TCK-R6C3JY", "NX-LT-0104", "u-105", "Need Microsoft Project installed for the procurement plan.", "Low", "Closed", "u-003", 140),
  ];
  tickets.find(t => t.id === "TCK-P9W2LZ").technicianId = null;

  const loanRequests = [
    { id: "LN-4M2X8P", employeeId: "u-104", itemType: "4G Router", serial: null, status: "Requested", requestedAt: ago(3), approvedAt: null, collectedAt: null },
    { id: "LN-9T1B7C", employeeId: "u-106", itemType: "Laptop (Computer)", serial: "LTP-1006", status: "Reserved", requestedAt: ago(28), approvedAt: ago(20), collectedAt: null },
    { id: "LN-2K5V0Q", employeeId: "u-102", itemType: "Monitor", serial: "MON-1002", status: "Collected", requestedAt: ago(24 * 6), approvedAt: ago(24 * 5), collectedAt: ago(24 * 5 - 2) },
    { id: "LN-7H3N6W", employeeId: "u-101", itemType: "Smartphone", serial: null, status: "Rejected", requestedAt: ago(24 * 9), approvedAt: null, collectedAt: null },
  ];
  Object.assign(unit("LTP-1006"), { status: "Reserved", assignedTo: "u-106" });
  Object.assign(unit("MON-1002"), { status: "Issued", assignedTo: "u-102", assignedToName: "Sandra Eyong" });

  return { users, assets, tickets, deviceCatalog, devices, loanRequests };
}
