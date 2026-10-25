import * as XLSX from "xlsx";
import { assigneeOf, excelPhone, sanitizeExcelCell } from "./utils.js";

/* ============================================================
   EXCEL EXPORT
   ============================================================ */
export function exportTicketsToExcel(tickets, db) {
  const rows = tickets.map(t => {
    const asset = db.assets.find(a => a.code === t.assetCode);
    const emp = db.users.find(u => u.id === t.employeeId);
    return {
      "Agency": sanitizeExcelCell(t.agency || (emp && emp.agency) || "—"),
      "Employee": sanitizeExcelCell(emp ? emp.name : (t.employeeName || "—")),
      "Device Name": sanitizeExcelCell(asset ? `${asset.type} — ${asset.model}` : t.assetCode),
      "Asset Code": sanitizeExcelCell(t.assetCode),
      "Reason / Issue": sanitizeExcelCell(t.description),
      "Date & Time Brought In": sanitizeExcelCell(t.createdAt ? new Date(t.createdAt).toLocaleString() : "—"),
      "Date & Time Left (Resolved)": sanitizeExcelCell(t.resolvedAt ? new Date(t.resolvedAt).toLocaleString() : "Pending"),
      "Status": sanitizeExcelCell(t.status),
      "Technician": sanitizeExcelCell((db.users.find(u => u.id === t.technicianId) || {}).name || "—"),
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 22 }, { wch: 18 }, { wch: 26 }, { wch: 12 }, { wch: 34 }, { wch: 22 }, { wch: 24 }, { wch: 14 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Repair Records");
  XLSX.writeFile(wb, `NexusIT_Repair_Records_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportLoansToExcel(loans, db) {
  const rows = loans.map(l => {
    const emp = db.users.find(u => u.id === l.employeeId);
    return {
      "Agency": sanitizeExcelCell(emp ? emp.agency : "—"),
      "Employee": sanitizeExcelCell(emp ? emp.name : "—"),
      "Matricule": sanitizeExcelCell(emp ? emp.matricule : "—"),
      "Item Type": sanitizeExcelCell(l.itemType),
      "Serial Number": sanitizeExcelCell(l.serial || "—"),
      "Status": sanitizeExcelCell(l.status),
      "Requested": sanitizeExcelCell(l.requestedAt ? new Date(l.requestedAt).toLocaleString() : "—"),
      "Approved / Reserved": sanitizeExcelCell(l.approvedAt ? new Date(l.approvedAt).toLocaleString() : "—"),
      "Collected": sanitizeExcelCell(l.collectedAt ? new Date(l.collectedAt).toLocaleString() : "—"),
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 22 }, { wch: 18 }, { wch: 14 }, { wch: 20 }, { wch: 16 }, { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Device Loan Records");
  XLSX.writeFile(wb, `NexusIT_Device_Loans_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportAssetsToExcel(assets, db, label = "Asset_Register") {
  const rows = assets.map(a => {
    const p = assigneeOf(a, db) || {};
    return {
      "Asset Code": sanitizeExcelCell(a.code),
      "Device Type": sanitizeExcelCell(a.type),
      "Model": sanitizeExcelCell(a.model),
      "Serial No. (Inventory Unit)": sanitizeExcelCell(a.serial || "—"),
      "Inventory Category": sanitizeExcelCell(a.inventoryItemType || "Not taken from stock"),
      "Status": sanitizeExcelCell(a.status),
      "Assigned To": sanitizeExcelCell(a.status === "Returned" ? "— (back in stock)" : (p.name || "Unassigned")),
      "Matricule / Staff ID": sanitizeExcelCell(p.matricule || "—"),
      "Job Title": sanitizeExcelCell(p.jobTitle || "—"),
      "Department": sanitizeExcelCell(p.department || "—"),
      "Agency": sanitizeExcelCell(p.agency || a.agency || "—"),
      "Phone": excelPhone(p.phone),
      "Email": sanitizeExcelCell(p.email || "—"),
      "Has Login Account": p.name ? (p.hasAccount ? "Yes" : "No") : "—",
      "Date Issued": sanitizeExcelCell(a.assignedAt ? new Date(a.assignedAt).toLocaleString() : (a.issueDate || "—")),
      "Issued By": sanitizeExcelCell(a.assignedBy ? `${a.assignedBy.name}${a.assignedBy.matricule ? " (" + a.assignedBy.matricule + ")" : ""}` : "—"),
      "Condition at Handover": sanitizeExcelCell(a.condition || "—"),
      "Notes": sanitizeExcelCell(a.notes || "—"),
      "Returned On": sanitizeExcelCell(a.status === "Returned" && a.returnedAt ? new Date(a.returnedAt).toLocaleString() : "—"),
      "Last Holder (if returned)": sanitizeExcelCell(a.status === "Returned" && a.previousAssignee ? `${a.previousAssignee.name}${a.previousAssignee.matricule ? " (" + a.previousAssignee.matricule + ")" : ""}` : "—"),
      "Condition on Return": sanitizeExcelCell(a.status === "Returned" ? (a.returnCondition || "—") : "—"),
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ "Asset Code": "No assets" }]);
  ws["!cols"] = [16, 18, 24, 20, 20, 12, 22, 16, 20, 18, 26, 18, 26, 12, 22, 22, 14, 30, 22, 26, 16].map(w => ({ wch: w }));
  if (rows.length) ws["!autofilter"] = { ref: ws["!ref"] };

  // Second sheet: inventory stock snapshot at export time.
  const stockRows = db.deviceCatalog.map(c => {
    const units = db.devices.filter(d => d.itemType === c.itemType);
    return {
      "Item Type": sanitizeExcelCell(c.itemType),
      "Total Stock": c.totalStock ?? units.length,
      "Available": units.filter(u => u.status === "Available").length,
      "Issued": units.filter(u => u.status === "Issued").length,
      "Reserved": units.filter(u => u.status === "Reserved").length,
      "In Maintenance": units.filter(u => u.status === "In Maintenance").length,
      "Decommissioned": units.filter(u => u.status === "Decommissioned").length,
      "Low-stock Threshold": c.lowStockThreshold ?? 0,
    };
  });
  const ws2 = XLSX.utils.json_to_sheet(stockRows.length ? stockRows : [{ "Item Type": "No inventory categories" }]);
  ws2["!cols"] = [26, 12, 12, 10, 10, 14, 15, 18].map(w => ({ wch: w }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Asset Register");
  XLSX.utils.book_append_sheet(wb, ws2, "Inventory Snapshot");
  XLSX.writeFile(wb, `NexusIT_${label}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
