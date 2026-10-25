/* ============================================================
   ICONS
   ============================================================ */
export const Icon = ({ name, size = 18, ...props }) => {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round", ...props };
  const paths = {
    bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />,
    ticket: <><path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z" /><path d="M13 5v3M13 16v3" /></>,
    box: <><path d="M21 8 12 3 3 8l9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></>,
    users: <><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6" /><path d="M16 8.2A3.2 3.2 0 1 1 16.8 14.5" /><path d="M15.5 14.2c2.9.4 5 2.6 5 5.8" /></>,
    grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m20 20-4.3-4.3" /></>,
    scan: <><path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8" /><path d="M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8" /><path d="M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16" /><path d="M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" /><path d="M4 12h16" /></>,
    check: <path d="m5 12 5 5L20 7" />,
    plus: <path d="M12 5v14M5 12h14" />,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>,
    download: <><path d="M12 3v13" /><path d="m6 11 6 6 6-6" /><path d="M5 21h14" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
    alert: <><path d="M12 9v4" /><path d="M12 16.5h.01" /><path d="M10.3 3.9 2.6 17.5A1.8 1.8 0 0 0 4.2 20.2h15.6a1.8 1.8 0 0 0 1.6-2.7L13.7 3.9a1.8 1.8 0 0 0-3.4 0Z" /></>,
    camera: <><path d="M4 8a2 2 0 0 1 2-2h1.2l1-1.6A1.5 1.5 0 0 1 9.5 3.6h5a1.5 1.5 0 0 1 1.3.8L17 6h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" /><circle cx="12" cy="13" r="3.4" /></>,
    idcard: <><rect x="2.5" y="5" width="19" height="14" rx="2" /><circle cx="8" cy="11" r="2" /><path d="M5.5 16.2c.4-1.6 1.7-2.6 2.5-2.6s2.1 1 2.5 2.6" /><path d="M14 9.5h4M14 12.5h4M14 15.5h2.5" /></>,
    printer: <><path d="M6 9V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v5" /><rect x="4" y="9" width="16" height="8" rx="1.5" /><path d="M7 14h10v6H7z" /><circle cx="17" cy="12" r=".6" fill="currentColor" stroke="none" /></>,
    chevronRight: <path d="m9 6 6 6-6 6" />,
    chevronDown: <path d="m6 9 6 6 6-6" />,
    laptop: <><rect x="4" y="4" width="16" height="10.5" rx="1.3" /><path d="M2.5 18.5h19" /><path d="M9.5 18.5 8 21h8l-1.5-2.5" /></>,
    wrench: <path d="M14.7 6.3a4 4 0 0 0-5.4 4.7L3 17.3V21h3.7l6.3-6.3a4 4 0 0 0 4.7-5.4l-2.9 2.9-2.1-2.1 2.9-2.9Z" />,
    building: <><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M8 7h1.2M8 11h1.2M8 15h1.2M14.8 7H16M14.8 11H16M14.8 15H16" /><path d="M10 21v-4h4v4" /></>,
    warehouse: <><path d="M3 21V9.5L12 4l9 5.5V21" /><path d="M3 21h18" /><path d="M8 21v-6a4 4 0 0 1 8 0v6" /></>,
    trend: <><path d="m3 17 6-6 4 4 8-9" /><path d="M15 6h6v6" /></>,
    x: <path d="M18 6 6 18M6 6l12 12" />,
    filter: <path d="M4 5h16l-6 8v6l-4-2v-4L4 5Z" />,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
    archive: <><rect x="3" y="4" width="18" height="4.5" rx="1" /><path d="M5 8.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V8.5" /><path d="M10 13h4" /></>,
    lock: <><rect x="4.5" y="10.5" width="15" height="9.5" rx="1.8" /><path d="M8 10.5V7.2a4 4 0 0 1 8 0v3.3" /></>,
    bell: <><path d="M6 9.5a6 6 0 1 1 12 0c0 4 1.3 5.5 1.3 5.5H4.7S6 13.5 6 9.5Z" /><path d="M10 18.5a2 2 0 0 0 4 0" /></>,
    fileSpreadsheet: <><path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M9 13h6M9 16.5h6M9 13v6M12 13v6M15 13v6" /></>,
    cloudOff: <><path d="M3 3l18 18" /><path d="M9.5 5.5A5.5 5.5 0 0 1 20 8.5c1.7.3 3 1.8 3 3.5 0 .6-.1 1.1-.4 1.6" /><path d="M6.2 6.5A5 5 0 0 0 5 16.4" /><path d="M8 20h9a3.5 3.5 0 0 0 1.3-6.7" /></>,
  };
  return <svg {...common}>{paths[name] || null}</svg>;
};
