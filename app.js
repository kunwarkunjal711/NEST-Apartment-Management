
/* =====================================
   NEST - APARTMENT MANAGEMENT PORTAL
   MAIN JAVASCRIPT
===================================== */

const DB_KEY = "nestDatabase";
const SESSION_KEY = "currentUser";

const defaultDB = {
    residents: [],
    flats: [],
    complaints: [],
    announcements: [
        {
            id: 1,
            title: "Welcome to NEST",
            message: "Welcome to your apartment community portal.",
            date: new Date().toLocaleDateString()
        }
    ],
    payments: [],
    visitors: [],
    bookings: []
};

let currentUser = null;
let activePage = "dashboard";

// ---------- DATABASE ----------

function loadDatabase() {
    try {
        const saved = JSON.parse(localStorage.getItem(DB_KEY));

        if (saved && typeof saved === "object") {
            return Object.fromEntries(
                Object.keys(defaultDB).map(key => [
                    key,
                    Array.isArray(saved[key])
                        ? saved[key]
                        : defaultDB[key]
                ])
            );
        }

        // Import data from the original NEST version.
        const oldRequests =
            JSON.parse(localStorage.getItem("requests")) || [];

        const oldAnnouncements =
            JSON.parse(localStorage.getItem("announcements")) ||
            defaultDB.announcements;

        return {
            ...JSON.parse(JSON.stringify(defaultDB)),
            complaints: oldRequests.map(r => ({
                ...r,
                resident: r.resident || "Unknown",
                status: r.status || "Pending"
            })),
            announcements: oldAnnouncements
        };

    } catch {
        return JSON.parse(JSON.stringify(defaultDB));
    }
}

let db = loadDatabase();

function saveDatabase() {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
}

function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function makeId() {
    return Date.now() + Math.floor(Math.random() * 1000);
}

function today() {
    return new Date().toLocaleDateString();
}

function money(value) {
    return "₹" + Number(value || 0).toLocaleString("en-IN");
}

function notify(message) {
    alert(message);
}

function statusBadge(status) {
    const className = String(status)
        .toLowerCase()
        .replace(/\s+/g, "-");

    return `
        <span class="status ${className}">
            ${escapeHTML(status)}
        </span>
    `;
}

// ---------- HTML HELPERS ----------

function field(label, name, type = "text", required = true, options = null) {

    const input = options
        ? `
            <select name="${name}" ${required ? "required" : ""}>
                ${options.map(option => `
                    <option value="${escapeHTML(option)}">
                        ${escapeHTML(option)}
                    </option>
                `).join("")}
            </select>
        `
        : `
            <input
                type="${type}"
                name="${name}"
                ${required ? "required" : ""}
                ${type === "number" ? 'min="0"' : ""}
            >
        `;

    return `
        <label>${label}</label>
        ${input}
    `;
}

function panel(title, content) {
    return `
        <div class="panel">
            <h3>${title}</h3>
            ${content}
        </div>
    `;
}

function formPanel(title, id, content, buttonText = "Save") {
    return `
        <div class="panel form-panel">
            <h3>${title}</h3>

            <form id="${id}">
                ${content}

                <button class="primary-btn" type="submit">
                    ${buttonText}
                </button>
            </form>
        </div>
    `;
}

function table(headers, rows) {
    return `
        <div class="table-wrap">
            <table class="request-table">

                <thead>
                    <tr>
                        ${headers.map(h => `<th>${h}</th>`).join("")}
                    </tr>
                </thead>

                <tbody>
                    ${rows || `
                        <tr>
                            <td colspan="${headers.length}">
                                No records available.
                            </td>
                        </tr>
                    `}
                </tbody>

            </table>
        </div>
    `;
}

// ---------- LOGIN SYSTEM ----------

document.getElementById("loginForm").addEventListener("submit", e => {

    e.preventDefault();

    const name = document.getElementById("username").value.trim();
    const role = document.getElementById("userRole").value;

    if (name.length < 2) {
        return notify("Please enter a valid name.");
    }

    currentUser = {
        name,
        role
    };

    localStorage.setItem(
        SESSION_KEY,
        JSON.stringify(currentUser)
    );

    openApplication();
});

function openApplication() {

    document.getElementById("loginScreen")
        .classList.add("hidden");

    document.getElementById("app")
        .classList.remove("hidden");

    document.getElementById("displayName").textContent =
        currentUser.name;

    document.getElementById("avatar").textContent =
        currentUser.name.charAt(0).toUpperCase();

    document.getElementById("displayRole").textContent =
        currentUser.role;

    createNavigation();

    showPage("dashboard");
}

// ---------- NAVIGATION ----------

function createNavigation() {

    const adminMenu = [
        ["Dashboard", "dashboard"],
        ["Residents", "residents"],
        ["Flats & Units", "flats"],
        ["Complaints", "complaints"],
        ["Payments", "payments"],
        ["Visitors", "visitors"],
        ["Bookings", "bookings"],
        ["Announcements", "announcements"],
        ["Profile", "profile"]
    ];

    const residentMenu = [
        ["Dashboard", "dashboard"],
        ["My Complaints", "complaints"],
        ["My Payments", "payments"],
        ["My Visitors", "visitors"],
        ["Facility Bookings", "bookings"],
        ["Announcements", "announcements"],
        ["Profile", "profile"]
    ];

    const menu = currentUser.role === "admin"
        ? adminMenu
        : residentMenu;

    document.getElementById("navigation").innerHTML =
        menu.map(([label, page]) => `
            <button
                class="nav-btn"
                data-page="${page}"
            >
                ${label}
            </button>
        `).join("");
}

document.getElementById("navigation").addEventListener("click", e => {

    const button = e.target.closest("[data-page]");

    if (button) {
        showPage(button.dataset.page);
    }
});

// ---------- PAGE CONTROLLER ----------

function showPage(page) {

    activePage = page;

    const titles = {
        dashboard: "Dashboard",
        residents: "Residents",
        flats: "Flats & Units",
        complaints: currentUser.role === "admin"
            ? "All Complaints"
            : "My Complaints",
        payments: currentUser.role === "admin"
            ? "Payment Management"
            : "My Payments",
        visitors: "Visitor Management",
        bookings: "Facility Bookings",
        announcements: "Announcements",
        profile: "My Profile"
    };

    document.getElementById("pageTitle").textContent =
        titles[page] || "Dashboard";

    document.querySelectorAll(".nav-btn").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.page === page
        );
    });

    const pages = {
        dashboard: dashboardPage,
        residents: residentsPage,
        flats: flatsPage,
        complaints: complaintsPage,
        payments: paymentsPage,
        visitors: visitorsPage,
        bookings: bookingsPage,
        announcements: announcementsPage,
        profile: profilePage
    };

    (pages[page] || dashboardPage)();
}

// ---------- DASHBOARD ----------

function dashboardPage() {

    const admin = currentUser.role === "admin";
    const name = currentUser.name;

    const complaints = db.complaints.filter(
        c => admin || c.resident === name
    );

    const payments = db.payments.filter(
        p => admin || p.resident === name
    );

    const visitors = db.visitors.filter(
        v => admin || v.resident === name
    );

    const bookings = db.bookings.filter(
        b => admin || b.resident === name
    );

    const cards = admin
        ? [
            ["Total Residents", db.residents.length],
            ["Total Flats", db.flats.length],
            [
                "Pending Complaints",
                db.complaints.filter(c => c.status !== "Resolved").length
            ],
            ["Total Payments", db.payments.length],
            [
                "Visitors Today",
                db.visitors.filter(v => v.date === today() && !v.exitTime).length
            ],
            ["Facility Bookings", db.bookings.length]
        ]
        : [
            ["My Complaints", complaints.length],
            [
                "Pending Complaints",
                complaints.filter(c => c.status !== "Resolved").length
            ],
            ["My Payments", payments.length],
            ["My Visitors", visitors.length],
            ["My Bookings", bookings.length],
            ["Announcements", db.announcements.length]
        ];

    document.getElementById("content").innerHTML = `

        <h2>Welcome, ${escapeHTML(name)}!</h2>

        <p>
            ${admin
                ? "Manage your apartment community."
                : "Your community at a glance."
            }
        </p>

        <div class="cards">

            ${cards.map(([label, value]) => `
                <div class="card">
                    <p>${label}</p>
                    <h2>${value}</h2>
                </div>
            `).join("")}

        </div>

        ${panel("Recent Complaints", table(
            ["Issue", "Resident", "Date", "Status"],

            complaints.slice().reverse().slice(0, 5).map(c => `
                <tr>
                    <td>${escapeHTML(c.issue)}</td>
                    <td>${escapeHTML(c.resident)}</td>
                    <td>${escapeHTML(c.date)}</td>
                    <td>${statusBadge(c.status)}</td>
                </tr>
            `).join("")
        ))}

        ${panel(
            "Latest Announcements",

            db.announcements.slice().reverse().slice(0, 3).map(a => `
                <div class="notice-item">
                    <strong>${escapeHTML(a.title)}</strong>
                    <p>${escapeHTML(a.message)}</p>
                    <small>${escapeHTML(a.date)}</small>
                </div>
            `).join("") || "<p>No announcements yet.</p>"
        )}

    `;
}

// ---------- RESIDENT MANAGEMENT ----------

function residentsPage() {

    if (currentUser.role !== "admin") {
        return dashboardPage();
    }

    document.getElementById("content").innerHTML = `

        ${formPanel("Add Resident", "residentForm", `

            ${field("Full Name", "name")}

            ${field("Email", "email", "email")}

            ${field("Phone", "phone", "tel")}

            ${field("Flat Number", "flat")}

        `, "Add Resident")}

        ${panel("Resident Directory", table(
            ["Name", "Email", "Phone", "Flat", "Actions"],

            db.residents.map(r => `
                <tr>
                    <td>${escapeHTML(r.name)}</td>
                    <td>${escapeHTML(r.email)}</td>
                    <td>${escapeHTML(r.phone)}</td>
                    <td>${escapeHTML(r.flat)}</td>

                    <td>
                        <button
                            class="small-btn"
                            data-action="edit-resident"
                            data-id="${r.id}"
                        >
                            Edit
                        </button>

                        <button
                            class="small-btn danger"
                            data-action="delete-resident"
                            data-id="${r.id}"
                        >
                            Delete
                        </button>
                    </td>
                </tr>
            `).join("")
        ))}

    `;
}

// ---------- FLAT MANAGEMENT ----------

function flatsPage() {

    if (currentUser.role !== "admin") {
        return dashboardPage();
    }

    document.getElementById("content").innerHTML = `

        ${formPanel("Add Flat / Unit", "flatForm", `

            ${field("Flat Number", "number")}

            ${field("Floor", "floor", "number")}

            ${field(
                "Flat Type",
                "type",
                "text",
                true,
                ["1 BHK", "2 BHK", "3 BHK", "4 BHK"]
            )}

            ${field("Monthly Maintenance (₹)", "maintenance", "number")}

            ${field(
                "Occupancy",
                "occupancy",
                "text",
                true,
                ["Vacant", "Occupied"]
            )}

        `, "Add Flat")}

        ${panel("Flat Directory", table(
            [
                "Flat",
                "Floor",
                "Type",
                "Maintenance",
                "Occupancy",
                "Actions"
            ],

            db.flats.map(f => `
                <tr>
                    <td>${escapeHTML(f.number)}</td>
                    <td>${escapeHTML(f.floor)}</td>
                    <td>${escapeHTML(f.type)}</td>
                    <td>${money(f.maintenance)}</td>
                    <td>${statusBadge(f.occupancy)}</td>

                    <td>
                        <button
                            class="small-btn"
                            data-action="edit-flat"
                            data-id="${f.id}"
                        >
                            Edit
                        </button>

                        <button
                            class="small-btn danger"
                            data-action="delete-flat"
                            data-id="${f.id}"
                        >
                            Delete
                        </button>
                    </td>
                </tr>
            `).join("")
        ))}

    `;
}

// ---------- COMPLAINT MANAGEMENT ----------

function complaintsPage() {

    const admin = currentUser.role === "admin";

    const records = db.complaints.filter(
        c => admin || c.resident === currentUser.name
    );

    document.getElementById("content").innerHTML = `

        ${!admin ? formPanel(
            "Submit Maintenance Complaint",
            "complaintForm",
            `
                ${field("Issue", "issue")}

                <label>Description</label>

                <textarea
                    name="description"
                    required
                ></textarea>
            `,
            "Submit Complaint"
        ) : ""}

        ${panel("Complaint Records", table(
            [
                "Issue",
                "Resident",
                "Description",
                "Date",
                "Status",
                ...(admin ? ["Update"] : [])
            ],

            records.map(c => `
                <tr>
                    <td>${escapeHTML(c.issue)}</td>
                    <td>${escapeHTML(c.resident)}</td>
                    <td>${escapeHTML(c.description)}</td>
                    <td>${escapeHTML(c.date)}</td>
                    <td>${statusBadge(c.status)}</td>

                    ${admin ? `
                        <td>
                            <select
                                data-action="complaint-status"
                                data-id="${c.id}"
                            >
                                ${["Pending", "In Progress", "Resolved"].map(s => `
                                    <option
                                        value="${s}"
                                        ${s === c.status ? "selected" : ""}
                                    >
                                        ${s}
                                    </option>
                                `).join("")}
                            </select>
                        </td>
                    ` : ""}
                </tr>
            `).join("")
        ))}

    `;
}

// ---------- PAYMENT MANAGEMENT ----------

function paymentsPage() {

    const admin = currentUser.role === "admin";

    const records = db.payments.filter(
        p => admin || p.resident === currentUser.name
    );

    document.getElementById("content").innerHTML = `

        ${admin ? formPanel(
            "Create Maintenance Bill",
            "paymentForm",
            `
                ${field("Resident", "resident")}

                ${field("Flat Number", "flat")}

                ${field("Amount (₹)", "amount", "number")}

                ${field("Due Date", "dueDate", "date")}
            `,
            "Create Bill"
        ) : ""}

        ${panel("Payment Records", table(
            [
                "Resident",
                "Flat",
                "Amount",
                "Due Date",
                "Status",
                ...(admin ? ["Update"] : [])
            ],

            records.map(p => `
                <tr>
                    <td>${escapeHTML(p.resident)}</td>
                    <td>${escapeHTML(p.flat)}</td>
                    <td>${money(p.amount)}</td>
                    <td>${escapeHTML(p.dueDate)}</td>
                    <td>${statusBadge(p.status)}</td>

                    ${admin ? `
                        <td>
                            <select
                                data-action="payment-status"
                                data-id="${p.id}"
                            >
                                <option ${p.status === "Unpaid" ? "selected" : ""}>
                                    Unpaid
                                </option>

                                <option ${p.status === "Paid" ? "selected" : ""}>
                                    Paid
                                </option>
                            </select>
                        </td>
                    ` : ""}
                </tr>
            `).join("")
        ))}

        ${!admin ? `
            <p class="form-note">
                Payment status is maintained by the administrator.
                This demonstration does not process real transactions.
            </p>
        ` : ""}

    `;
}

// ---------- VISITOR MANAGEMENT ----------

function visitorsPage() {

    const admin = currentUser.role === "admin";

    const records = db.visitors.filter(
        v => admin || v.resident === currentUser.name
    );

    document.getElementById("content").innerHTML = `

        ${formPanel(
            admin ? "Register Visitor" : "Register Your Visitor",
            "visitorForm",
            `
                ${field("Visitor Name", "name")}

                ${admin ? field("Visiting Resident", "resident") : ""}

                ${field("Flat Number", "flat")}

                ${field("Purpose of Visit", "purpose")}
            `,
            "Register Visitor"
        )}

        ${panel("Visitor Register", table(
            [
                "Visitor",
                "Resident",
                "Flat",
                "Purpose",
                "Date",
                "Entry Time",
                "Exit Time",
                ...(admin ? ["Action"] : [])
            ],

            records.map(v => `
                <tr>
                    <td>${escapeHTML(v.name)}</td>
                    <td>${escapeHTML(v.resident)}</td>
                    <td>${escapeHTML(v.flat)}</td>
                    <td>${escapeHTML(v.purpose)}</td>
                    <td>${escapeHTML(v.date)}</td>
                    <td>${escapeHTML(v.entryTime)}</td>
                    <td>${escapeHTML(v.exitTime || "Inside")}</td>

                    ${admin ? `
                        <td>
                            <button
                                class="small-btn"
                                data-action="visitor-exit"
                                data-id="${v.id}"
                                ${v.exitTime ? "disabled" : ""}
                            >
                                Check Out
                            </button>
                        </td>
                    ` : ""}
                </tr>
            `).join("")
        ))}

    `;
}

// ---------- FACILITY BOOKINGS ----------

function bookingsPage() {

    const admin = currentUser.role === "admin";

    const records = db.bookings.filter(
        b => admin || b.resident === currentUser.name
    );

    document.getElementById("content").innerHTML = `

        ${!admin ? formPanel(
            "Book a Facility",
            "bookingForm",
            `
                ${field(
                    "Facility",
                    "facility",
                    "text",
                    true,
                    [
                        "Community Hall",
                        "Gym",
                        "Swimming Pool",
                        "Sports Court"
                    ]
                )}

                ${field("Booking Date", "date", "date")}

                ${field(
                    "Time Slot",
                    "time",
                    "text",
                    true,
                    ["Morning", "Afternoon", "Evening"]
                )}
            `,
            "Submit Booking"
        ) : ""}

        ${panel("Facility Reservations", table(
            [
                "Facility",
                "Resident",
                "Date",
                "Time",
                "Status",
                ...(admin ? ["Update"] : [])
            ],

            records.map(b => `
                <tr>
                    <td>${escapeHTML(b.facility)}</td>
                    <td>${escapeHTML(b.resident)}</td>
                    <td>${escapeHTML(b.date)}</td>
                    <td>${escapeHTML(b.time)}</td>
                    <td>${statusBadge(b.status)}</td>

                    ${admin ? `
                        <td>
                            <select
                                data-action="booking-status"
                                data-id="${b.id}"
                            >
                                ${["Pending", "Approved", "Rejected"].map(s => `
                                    <option
                                        ${s === b.status ? "selected" : ""}
                                    >
                                        ${s}
                                    </option>
                                `).join("")}
                            </select>
                        </td>
                    ` : ""}
                </tr>
            `).join("")
        ))}

    `;
}

// ---------- ANNOUNCEMENTS ----------

function announcementsPage() {

    const admin = currentUser.role === "admin";

    document.getElementById("content").innerHTML = `

        ${admin ? formPanel(
            "Publish Announcement",
            "announcementForm",
            `
                ${field("Announcement Title", "title")}

                <label>Message</label>

                <textarea
                    name="message"
                    required
                ></textarea>
            `,
            "Publish Announcement"
        ) : ""}

        ${panel(
            "Community Announcements",

            db.announcements.slice().reverse().map(a => `
                <div class="notice-item">

                    <strong>${escapeHTML(a.title)}</strong>

                    <p>${escapeHTML(a.message)}</p>

                    <small>${escapeHTML(a.date)}</small>

                    ${admin ? `
                        <button
                            class="small-btn danger"
                            data-action="delete-announcement"
                            data-id="${a.id}"
                        >
                            Delete
                        </button>
                    ` : ""}

                </div>
            `).join("") || "<p>No announcements available.</p>"
        )}

    `;
}

// ---------- PROFILE ----------

function profilePage() {

    document.getElementById("content").innerHTML = `

        ${panel("Account Information", `

            <div class="request-item">
                <strong>Name</strong>
                <p>${escapeHTML(currentUser.name)}</p>
            </div>

            <div class="request-item">
                <strong>Role</strong>
                <p>${escapeHTML(currentUser.role)}</p>
            </div>

            <div class="request-item">
                <strong>Portal</strong>
                <p>NEST Apartment Community Management</p>
            </div>

        `)}

    `;
}

// ---------- FORM SUBMISSIONS ----------

document.getElementById("content").addEventListener("submit", e => {

    const form = e.target;

    if (!form.id.endsWith("Form")) return;

    e.preventDefault();

    const data = Object.fromEntries(
        new FormData(form).entries()
    );

    const id = makeId();

    switch (form.id) {

        case "residentForm":

            if (currentUser.role !== "admin") return;

            if (db.residents.some(r =>
                r.email.toLowerCase() === data.email.toLowerCase()
            )) {
                return notify("This email is already registered.");
            }

            db.residents.push({ id, ...data });
            break;


        case "flatForm":

            if (currentUser.role !== "admin") return;

            if (db.flats.some(f =>
                f.number.toLowerCase() === data.number.toLowerCase()
            )) {
                return notify("This flat number already exists.");
            }

            data.floor = Number(data.floor);
            data.maintenance = Number(data.maintenance);

            db.flats.push({ id, ...data });
            break;


        case "complaintForm":

            db.complaints.push({
                id,
                ...data,
                resident: currentUser.name,
                status: "Pending",
                date: today()
            });

            break;


        case "paymentForm":

            if (currentUser.role !== "admin") return;

            if (Number(data.amount) <= 0) {
                return notify("Enter a valid amount.");
            }

            data.amount = Number(data.amount);

            db.payments.push({
                id,
                ...data,
                status: "Unpaid"
            });

            break;


        case "visitorForm":

            db.visitors.push({
                id,
                ...data,
                resident: currentUser.role === "admin"
                    ? data.resident
                    : currentUser.name,
                date: today(),
                entryTime: new Date().toLocaleTimeString(),
                exitTime: ""
            });

            break;


        case "bookingForm": {

            const bookingDate = new Date(data.date + "T00:00:00");

            if (
                !data.date ||
                Number.isNaN(bookingDate.getTime()) ||
                data.date < new Date().toLocaleDateString("en-CA")
            ) {
                return notify("Select a valid booking date.");
            }

            const conflict = db.bookings.some(b =>
                b.facility === data.facility &&
                b.date === data.date &&
                b.time === data.time &&
                b.status !== "Rejected"
            );

            if (conflict) {
                return notify(
                    "This facility and time slot is already booked or awaiting approval."
                );
            }

            db.bookings.push({
                id,
                ...data,
                resident: currentUser.name,
                status: "Pending"
            });

            break;
        }


        case "announcementForm":

            if (currentUser.role !== "admin") return;

            db.announcements.push({
                id,
                ...data,
                date: today()
            });

            break;


        default:
            return;
    }

    saveDatabase();

    notify("Record saved successfully.");

    showPage(activePage);
});

// ---------- STATUS UPDATES ----------

document.getElementById("content").addEventListener("change", e => {

    const el = e.target;
    const id = Number(el.dataset.id);

    if (
        currentUser.role !== "admin" ||
        !id ||
        !el.dataset.action
    ) return;

    const action = el.dataset.action;

    if (action === "complaint-status") {

        const record = db.complaints.find(c => c.id === id);

        if (record) record.status = el.value;
    }

    if (action === "payment-status") {

        const record = db.payments.find(p => p.id === id);

        if (record) record.status = el.value;
    }

    if (action === "booking-status") {

        const record = db.bookings.find(b => b.id === id);

        if (!record) return;

        if (el.value === "Approved") {

            const conflict = db.bookings.some(b =>
                b.id !== id &&
                b.facility === record.facility &&
                b.date === record.date &&
                b.time === record.time &&
                b.status === "Approved"
            );

            if (conflict) {
                notify("This time slot has already been approved.");

                showPage(activePage);
                return;
            }
        }

        record.status = el.value;
    }

    saveDatabase();

    showPage(activePage);
});

// ---------- EDIT AND DELETE ACTIONS ----------

document.getElementById("content").addEventListener("click", e => {

    const button = e.target.closest("[data-action]");

    if (!button) return;

    const id = Number(button.dataset.id);
    const action = button.dataset.action;

    if (currentUser.role !== "admin") return;

    if (!id) return;


    // Delete resident
    if (action === "delete-resident") {

        if (!confirm("Delete this resident?")) return;

        db.residents = db.residents.filter(r => r.id !== id);
    }


    // Edit resident
    if (action === "edit-resident") {

        const r = db.residents.find(r => r.id === id);

        if (!r) return;

        const name = prompt("Resident name:", r.name);

        if (name === null || !name.trim()) return;

        const email = prompt("Email:", r.email);

        if (email === null) return;

        const phone = prompt("Phone:", r.phone);

        if (phone === null) return;

        const flat = prompt("Flat number:", r.flat);

        if (flat === null) return;

        r.name = name.trim();
        r.email = email.trim();
        r.phone = phone.trim();
        r.flat = flat.trim();
    }


    // Delete flat
    if (action === "delete-flat") {

        if (!confirm("Delete this flat?")) return;

        db.flats = db.flats.filter(f => f.id !== id);
    }


    // Edit flat
    if (action === "edit-flat") {

        const f = db.flats.find(f => f.id === id);

        if (!f) return;

        const number = prompt("Flat number:", f.number);

        if (number === null || !number.trim()) return;

        const floor = prompt("Floor:", f.floor);

        if (
            floor === null ||
            floor.trim() === "" ||
            !Number.isFinite(Number(floor))
        ) return;

        const maintenance = prompt(
            "Monthly maintenance:",
            f.maintenance
        );

        if (
            maintenance === null ||
            maintenance.trim() === "" ||
            !Number.isFinite(Number(maintenance)) ||
            Number(maintenance) < 0
        ) return;

        const occupancy = prompt(
            "Occupancy (Occupied/Vacant):",
            f.occupancy
        );

        if (
            occupancy === null ||
            !["Occupied", "Vacant"].includes(occupancy)
        ) return;

        f.number = number.trim();
        f.floor = Number(floor);
        f.maintenance = Number(maintenance);
        f.occupancy = occupancy;
    }


    // Delete announcement
    if (action === "delete-announcement") {

        if (!confirm("Delete this announcement?")) return;

        db.announcements = db.announcements.filter(a => a.id !== id);
    }


    // Visitor checkout
    if (action === "visitor-exit") {

        const visitor = db.visitors.find(v => v.id === id);

        if (visitor && !visitor.exitTime) {
            visitor.exitTime = new Date().toLocaleTimeString();
        }
    }


    saveDatabase();

    showPage(activePage);
});

// ---------- LOGOUT ----------

document.getElementById("logoutBtn").addEventListener("click", () => {

    localStorage.removeItem(SESSION_KEY);

    currentUser = null;

    document.getElementById("app")
        .classList.add("hidden");

    document.getElementById("loginScreen")
        .classList.remove("hidden");

    document.getElementById("loginForm").reset();
});

// ---------- RESTORE SESSION ----------

try {

    const savedUser = JSON.parse(
        localStorage.getItem(SESSION_KEY)
    );

    if (
        savedUser &&
        typeof savedUser.name === "string" &&
        savedUser.name.trim() &&
        ["resident", "admin"].includes(savedUser.role)
    ) {

        currentUser = savedUser;

        openApplication();

    } else {

        localStorage.removeItem(SESSION_KEY);
    }

} catch {

    localStorage.removeItem(SESSION_KEY);
}
