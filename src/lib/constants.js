export const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
export const SLA_HOURS = { "Urgent": 4, "High": 24, "Medium": 48, "Low": 72 };
export const PRIORITY_COLOR = {
  "Urgent": { bg: "#fce8e8", fg: "#d64545", dot: "#d64545" },
  "High": { bg: "#fff4e0", fg: "#a3660a", dot: "#e8a13a" },
  "Medium": { bg: "#e6f0fa", fg: "#0b5fa4", dot: "#2f8fd8" },
  "Low": { bg: "#e6f5ec", fg: "#0a7c41", dot: "#0fa958" },
};

export const DEPARTMENTS_AS_AGENCIES = [
  "Douala DRD Agency (Littoral)",
  "Yaoundé Agency (Centre)",
  "Bafoussam Agency (Ouest)",
  "Garoua Agency (Nord)",
  "Maroua Agency (Extrême-Nord)",
  "Ngaoundéré Agency (Adamaoua)",
  "Bamenda Agency (Nord-Ouest)",
  "Buea Agency (Sud-Ouest)",
  "Limbe Agency (Sud-Ouest)",
  "Kribi Agency (Sud)",
  "Ebolowa Agency (Sud)",
  "Bertoua Agency (Est)",
  "Dschang Agency (Ouest)",
  "Nkongsamba Agency (Littoral)",
  "Kumba Agency (Sud-Ouest)"
];

export const TICKET_STATUSES = ["Received / In Queue", "In Progress", "Resolved", "Closed"];
export const STATUS_COLOR = {
  "Received / In Queue": { bg: "#fff4e0", fg: "#a3660a", dot: "#e8a13a" },
  "In Progress": { bg: "#e6f0fb", fg: "#0b5fa4", dot: "#2f8fd8" },
  "Resolved": { bg: "#e6f5ec", fg: "#0a7c41", dot: "#0fa958" },
  "Closed": { bg: "#eef1f3", fg: "#51616b", dot: "#8fa0aa" },
};
export const LOAN_STATUS_COLOR = {
  "Requested": { bg: "#fff4e0", fg: "#a3660a", dot: "#e8a13a" },
  "Reserved": { bg: "#e6f0fb", fg: "#0b5fa4", dot: "#2f8fd8" },
  "Collected": { bg: "#e6f5ec", fg: "#0a7c41", dot: "#0fa958" },
  "Rejected": { bg: "#fbe9e9", fg: "#b23a3a", dot: "#d64545" },
};

export const NAV_BY_ROLE = {
  agent: [
    { id: "dashboard", label: "Dashboard", icon: "grid" },
    { id: "lookup", label: "Instant Lookup", icon: "scan" },
    { id: "tickets", label: "Support Tickets", icon: "ticket" },
    { id: "assets", label: "Asset Registry", icon: "laptop" },
    { id: "loans", label: "Device Loans", icon: "box" },
    { id: "inventory", label: "Inventory", icon: "warehouse" },
  ],
  admin: [
    { id: "dashboard", label: "Dashboard", icon: "grid" },
    { id: "lookup", label: "Instant Lookup", icon: "scan" },
    { id: "tickets", label: "Support Tickets", icon: "ticket" },
    { id: "assets", label: "Asset Registry", icon: "laptop" },
    { id: "loans", label: "Device Loans", icon: "box" },
    { id: "inventory", label: "Inventory", icon: "warehouse" },
    { id: "users", label: "Users & Roles", icon: "users" },
    { id: "reports", label: "Reports & Export", icon: "fileSpreadsheet" },
  ],
  employee: [
    { id: "home", label: "My Overview", icon: "grid" },
    { id: "report", label: "Report an Issue", icon: "wrench" },
    { id: "request", label: "Request a Device", icon: "box" },
    { id: "history", label: "My History", icon: "clock" },
  ],
};

/* ---- Asset / recipient helpers ---- */
export const ASSET_TYPES = ["Laptop", "Desktop Computer", "Smartphone / Phone", "Tablet", "Monitor", "Printer", "Docking Station", "Workstation"];
export const ASSET_CONDITIONS = ["New", "Good", "Fair", "Refurbished"];
export const EMPTY_PERSON = { name: "", matricule: "", jobTitle: "", department: "", agency: DEPARTMENTS_AS_AGENCIES[0], phone: "", email: "" };

export const NO_STOCK = "__none__";

export const ROLE_RANK = { employee: 0, agent: 1, admin: 2 };

export const ASSET_STATUS_COLOR = {
  "In Service": STATUS_COLOR["Resolved"],
  "Returned": STATUS_COLOR["In Progress"],
  "Retired": STATUS_COLOR["Closed"],
};
export const RETURN_CONDITIONS = [
  { value: "Good", label: "Good — ready to issue again", unit: "Available" },
  { value: "Needs repair", label: "Needs repair — send to maintenance", unit: "In Maintenance" },
  { value: "Damaged / unusable", label: "Damaged / unusable — decommission", unit: "Decommissioned" },
];

export const PRESET_DEVICE_TYPES = [
  "Laptop (Computer)",
  "Desktop Computer",
  "Smartphone / Phone",
  "Tablet",
  "Monitor",
  "Wireless Mouse",
  "Keyboard",
  "Headset",
  "Printer",
  "Docking Station",
  "USB Cable / Adapter"
];

export const EMPTY_DB = { users: [], assets: [], tickets: [], deviceCatalog: [], devices: [], loanRequests: [] };
export const COLLECTIONS = ["users", "assets", "tickets", "deviceCatalog", "devices", "loanRequests"];
