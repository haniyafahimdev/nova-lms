import * as F from "./firebase.js";
const { auth, db } = F;
const $ = (s) => document.querySelector(s);
const ok = (u) => /^https?:\/\//i.test(u || "");           // only http(s) links are ever made clickable
// h(): builds DOM safely (text is never parsed as HTML, which blocks injection attacks)
const h = (t, a = {}, ...k) => {
  const e = document.createElement(t);
  for (const [x, v] of Object.entries(a)) { if (v == null || v === false) continue; x.startsWith("on") ? e.addEventListener(x.slice(2), v) : e.setAttribute(x, v === true ? "" : v); }
  e.append(...k.flat().filter((c) => c != null && c !== false));
  return e;
};
const toast = (m, bad) => { const t = h("div", { class: "toast" + (bad ? " bad" : "") }, m); document.body.append(t); setTimeout(() => t.remove(), 2800); };
const get = async (c, ...q) => (await F.getDocs(F.query(F.collection(db, c), ...q))).docs.map((d) => ({ id: d.id, ...d.data() }));
const today = () => new Date().toISOString().slice(0, 10);
const nm = (s) => `${s.firstName || ""} ${s.lastName || ""}`.trim();
const classNames = async () => (await get("classes")).map((c) => c.name).sort();
const activeStudents = () => get("students", F.where("status", "==", "active"));
let me = {}, kids = [];

const cell = (v, c) => c[2] === "link" ? (ok(v) ? h("a", { href: v, target: "_blank", rel: "noopener" }, "Open") : "-")
  : c[2] === "status" ? h("span", { class: "pill " + String(v).toLowerCase() }, v) : (v ?? "-");
const table = (cols, rows, act) => h("div", { class: "card tw" }, h("table", {},
  h("thead", {}, h("tr", {}, ...cols.map((c) => h("th", {}, c[1])), act && h("th"))),
  h("tbody", {}, ...(rows.length ? rows.map((r) => h("tr", {}, ...cols.map((c) => h("td", {}, cell(r[c[0]], c))), act && h("td", {}, act(r))))
    : [h("tr", {}, h("td", { colspan: cols.length + 1 }, "Nothing here yet."))]))));
const form = (fl, go, label = "Add") => {
  const f = h("form", { class: "card form" }, ...fl.map((x) => h("label", {}, x.l,
    x.t === "select" ? h("select", { name: x.n, required: x.r }, ...x.o.map((o) => { const [v, l] = typeof o === "string" ? [o, o] : [o.v, o.l]; return h("option", { value: v }, l); }))
    : x.t === "area" ? h("textarea", { name: x.n, rows: 3, required: x.r })
    : h("input", { name: x.n, type: x.t || "text", required: x.r }))), h("button", { class: "btn" }, label));
  f.onsubmit = async (e) => { e.preventDefault(); const b = f.querySelector("button"); b.disabled = true;
    try { await go(Object.fromEntries(new FormData(f))); f.reset(); } catch (err) { toast(err.message, 1); } b.disabled = false; };
  return f;
};
const api = async (b) => {
  const r = await fetch("/api/create-user", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + await auth.currentUser.getIdToken() }, body: JSON.stringify(b) });
  const d = await r.json(); if (!r.ok) throw new Error(d.error || "Failed"); return d;
};

// ---------- reusable module makers ----------
const crud = (coll, fx, cols) => async (box) => {
  const list = h("div");
  const load = async () => list.replaceChildren(table(cols, await get(coll, F.orderBy("createdAt", "desc")), (r) =>
    h("button", { class: "btn sm ghost", onclick: async () => { if (confirm("Delete this?")) { await F.deleteDoc(F.doc(db, coll, r.id)); load(); } } }, "Delete")));
  box.append(form(await fx(), async (d) => { await F.addDoc(F.collection(db, coll), { ...d, createdAt: F.serverTimestamp(), by: me.uid }); toast("Saved"); load(); }), list); load();
};
const people = (role, coll, fx, cols) => async (box) => {
  const list = h("div"), note = h("p", { class: "notice", hidden: true });
  const load = async () => list.replaceChildren(table([["name", "Name"], ["email", "Email"], ...cols, ["status", "Status", "status"]],
    (await get(coll)).map((r) => ({ ...r, name: nm(r) })), (r) => h("button", { class: "btn sm ghost", onclick: async () => {
      try { await api({ action: "status", role, uid: r.id, disabled: r.status === "active" }); load(); } catch (e) { toast(e.message, 1); } } }, r.status === "active" ? "Deactivate" : "Activate")));
  const base = [{ n: "firstName", l: "First name", r: 1 }, { n: "lastName", l: "Last name", r: 1 }, { n: "email", l: "Login email", t: "email", r: 1 }];
  box.append(form([...base, ...await fx()], async (d) => { const { firstName, lastName, email, ...extra } = d;
    const x = await api({ role, firstName, lastName, email, extra });
    note.textContent = x.emailSent ? `${firstName} added. Login details were emailed.` : `${firstName} added. Email not set up yet. Temporary password: ${x.tempPassword}`; note.hidden = false; load(); }), note, list); load();
};
const M = {};
M.students = people("student", "students", async () => [{ n: "admissionNo", l: "Admission no." }, { n: "className", l: "Class", t: "select", o: await classNames() }, { n: "dob", l: "Date of birth", t: "date" }, { n: "parentEmail", l: "Parent’s login email (optional)", t: "email" }], [["admissionNo", "Adm. no."], ["className", "Class"]]);
M.teachers = people("teacher", "teachers", async () => [{ n: "phone", l: "Phone" }, { n: "subjects", l: "Subjects" }], [["phone", "Phone"], ["subjects", "Subjects"]]);
M.parents = people("parent", "parents", async () => [{ n: "phone", l: "Phone" }, { n: "relationship", l: "Relationship" }], [["phone", "Phone"], ["relationship", "Relation"]]);
M.classes = crud("classes", async () => [{ n: "name", l: "Class name (e.g. Grade 2)", r: 1 }], [["name", "Class"]]);
M.assignments = crud("assignments", async () => [{ n: "title", l: "Title", r: 1 }, { n: "className", l: "Class", t: "select", o: await classNames(), r: 1 }, { n: "dueDate", l: "Due date", t: "date" }, { n: "pdfUrl", l: "Homework PDF link (Google Drive etc.)", t: "url" }, { n: "description", l: "Instructions", t: "area" }], [["title", "Title"], ["className", "Class"], ["dueDate", "Due"], ["pdfUrl", "PDF", "link"]]);
M.resources = crud("resources", async () => [{ n: "title", l: "Title", r: 1 }, { n: "type", l: "Type", t: "select", o: ["Recording", "Classwork", "Homework PDF"], r: 1 }, { n: "className", l: "Class", t: "select", o: await classNames(), r: 1 }, { n: "url", l: "Link (YouTube, Drive…)", t: "url", r: 1 }], [["title", "Title"], ["type", "Type"], ["className", "Class"], ["url", "Link", "link"]]);
M.announce = crud("announcements", async () => [{ n: "title", l: "Title", r: 1 }, { n: "audience", l: "Audience", t: "select", o: ["Everyone", "Parents", "Teachers", "Students"] }, { n: "message", l: "Message", t: "area", r: 1 }], [["title", "Title"], ["audience", "Audience"], ["message", "Message"]]);

M.dash = async (box) => {
  const L = [["Students", "students"], ["Teachers", "teachers"], ["Parents", "parents"], ["Classes", "classes"]];
  const n = await Promise.all(L.map(([, c]) => F.getCountFromServer(F.collection(db, c)).then((s) => s.data().count)));
  const inv = await get("invoices"), t = today(), over = inv.filter((i) => i.status !== "Paid" && i.dueDate && i.dueDate < t).length;
  box.append(h("div", { class: "stats" }, ...L.map(([l], i) => h("div", { class: "card stat" }, h("b", {}, n[i]), h("span", {}, l))),
    h("div", { class: "card stat" }, h("b", {}, over), h("span", {}, "Overdue invoices"))));
};
M.attendance = async (box) => {
  const sel = h("select", {}, ...(await classNames()).map((c) => h("option", {}, c))), dt = h("input", { type: "date", value: today() }), area = h("div");
  const go = async () => {
    const st = await get("students", F.where("className", "==", sel.value), F.where("status", "==", "active"));
    const rows = st.map((s) => ({ s, sel: h("select", {}, ...["Present", "Absent", "Late", "Excused"].map((x) => h("option", {}, x))) }));
    area.replaceChildren(h("div", { class: "card" }, ...rows.map((r) => h("div", { class: "row" }, h("span", {}, nm(r.s)), r.sel)), rows.length ? h("p", {}, h("button", { class: "btn", onclick: async () => {
      const b = F.writeBatch(db);
      rows.forEach((r) => b.set(F.doc(db, "attendance", dt.value + "_" + r.s.id), { date: dt.value, className: sel.value, studentId: r.s.id, studentName: nm(r.s), parentIds: r.s.parentIds || [], status: r.sel.value }));
      await b.commit(); toast("Attendance saved"); } }, "Save attendance")) : h("p", {}, "No active students in this class.")));
  };
  sel.onchange = go; box.append(h("div", { class: "card form" }, h("label", {}, "Class", sel), h("label", {}, "Date", dt)), area); go();
};
M.fees = async (box) => {
  const st = await activeStudents(), by = Object.fromEntries(st.map((s) => [s.id, s])), list = h("div"), stats = h("div", { class: "stats" });
  const load = async () => {
    const inv = await get("invoices"), t = today();
    inv.forEach((i) => { i.bal = i.amount - i.paid; i.state = i.status !== "Paid" && i.dueDate && i.dueDate < t ? "Overdue" : i.status; });
    const sum = (k) => inv.reduce((a, i) => a + (k(i) || 0), 0);
    stats.replaceChildren(...[["Billed", sum((i) => i.amount)], ["Collected", sum((i) => i.paid)], ["Outstanding", sum((i) => i.bal)], ["Overdue", sum((i) => i.state === "Overdue" ? i.bal : 0)]]
      .map(([l, v]) => h("div", { class: "card stat" }, h("b", {}, "PKR " + v.toLocaleString()), h("span", {}, l))));
    list.replaceChildren(table([["studentName", "Student"], ["month", "Month"], ["dueDate", "Due"], ["amount", "Billed"], ["paid", "Paid"], ["bal", "Balance"], ["state", "Status", "status"]], inv,
      (i) => i.bal > 0 ? h("button", { class: "btn sm", onclick: async () => {
        const a = +prompt("Payment amount (PKR)", i.bal); if (!a || a < 0) return; const p = Math.min(i.paid + a, i.amount);
        await F.updateDoc(F.doc(db, "invoices", i.id), { paid: p, status: p >= i.amount ? "Paid" : "Partial" });
        await F.addDoc(F.collection(db, "payments"), { invoiceId: i.id, studentId: i.studentId, amount: a, date: today(), method: "Cash" }); load(); } }, "Record payment") : null));
  };
  box.append(stats, form([{ n: "studentId", l: "Student", t: "select", o: st.map((s) => ({ v: s.id, l: nm(s) })), r: 1 }, { n: "month", l: "Billing month", t: "month", r: 1 }, { n: "amount", l: "Amount (PKR)", t: "number", r: 1 }, { n: "dueDate", l: "Due date", t: "date", r: 1 }],
    async (d) => { const s = by[d.studentId]; await F.addDoc(F.collection(db, "invoices"), { studentId: s.id, studentName: nm(s), parentIds: s.parentIds || [], month: d.month, amount: +d.amount, paid: 0, status: "Pending", dueDate: d.dueDate, createdAt: F.serverTimestamp() }); toast("Invoice created"); load(); }, "Create invoice"), list); load();
};
M.remarks = async (box) => {
  const st = await activeStudents(), by = Object.fromEntries(st.map((s) => [s.id, s])), list = h("div");
  const load = async () => list.replaceChildren(table([["studentName", "Student"], ["text", "Remark"], ["date", "Date"], ["teacherName", "By"]], await get("remarks", F.orderBy("createdAt", "desc"))));
  box.append(form([{ n: "studentId", l: "Student", t: "select", o: st.map((s) => ({ v: s.id, l: nm(s) })), r: 1 }, { n: "text", l: "Remark", t: "area", r: 1 }],
    async (d) => { const s = by[d.studentId]; await F.addDoc(F.collection(db, "remarks"), { studentId: s.id, studentName: nm(s), parentIds: s.parentIds || [], text: d.text, date: today(), teacherName: me.name, createdAt: F.serverTimestamp() }); toast("Remark saved"); load(); }, "Save remark"), list); load();
};

// ---------- read-only views for parents and students ----------
const mine = () => me.role === "parent" ? F.where("parentIds", "array-contains", me.uid) : F.where("studentId", "==", me.uid);
const classesOfKids = () => [...new Set(kids.map((k) => k.className).filter(Boolean))];
const noClass = (box) => box.append(h("p", { class: "notice" }, "No class has been assigned yet. Please contact the school office."));
M.news = async (box) => {
  const mineAud = { admin: "Admins", teacher: "Teachers", parent: "Parents", student: "Students" }[me.role];
  const a = (await get("announcements", F.orderBy("createdAt", "desc"))).filter((x) => x.audience === "Everyone" || x.audience === mineAud);
  box.append(...(a.length ? a.map((x) => h("div", { class: "card" }, h("h3", {}, x.title), h("p", {}, x.message))) : [h("p", { class: "notice" }, "No announcements yet.")]));
};
M.myAtt = async (box) => {
  const a = (await get("attendance", mine())).sort((x, y) => y.date.localeCompare(x.date)), by = {};
  a.filter((r) => r.status !== "Excused").forEach((r) => { const v = (by[r.studentName] ??= { p: 0, n: 0 }); v.n++; if (r.status !== "Absent") v.p++; });
  box.append(h("div", { class: "stats" }, ...Object.entries(by).map(([n, v]) => h("div", { class: "card stat" }, h("b", {}, Math.round(100 * v.p / v.n) + "%"), h("span", {}, n)))),
    table([["date", "Date"], ["studentName", "Student"], ["status", "Status", "status"]], a));
};
M.myFees = async (box) => {
  const t = today(), inv = (await get("invoices", mine())).map((i) => ({ ...i, bal: i.amount - i.paid, state: i.status !== "Paid" && i.dueDate && i.dueDate < t ? "Overdue" : i.status }));
  box.append(table([["studentName", "Student"], ["month", "Month"], ["dueDate", "Due"], ["amount", "Billed"], ["paid", "Paid"], ["bal", "Balance"], ["state", "Status", "status"]], inv));
};
M.myRem = async (box) => box.append(table([["date", "Date"], ["studentName", "Student"], ["text", "Remark"], ["teacherName", "Teacher"]], (await get("remarks", mine())).sort((x, y) => y.date.localeCompare(x.date))));
const forClass = (coll, cols) => async (box) => { const c = classesOfKids(); if (!c.length) return noClass(box); box.append(table(cols, await get(coll, F.where("className", "in", c)))); };
M.myRes = forClass("resources", [["title", "Title"], ["type", "Type"], ["className", "Class"], ["url", "Open", "link"]]);
M.myAsg = forClass("assignments", [["title", "Title"], ["className", "Class"], ["dueDate", "Due"], ["description", "Instructions"], ["pdfUrl", "PDF", "link"]]);

const NAV = {
  admin: [["dash", "Dashboard"], ["students", "Students"], ["teachers", "Teachers"], ["parents", "Parents"], ["classes", "Classes"], ["attendance", "Attendance"], ["fees", "Fees"], ["assignments", "Assignments"], ["resources", "Classwork & Recordings"], ["remarks", "Remarks"], ["announce", "Announcements"]],
  teacher: [["news", "Announcements"], ["attendance", "Attendance"], ["assignments", "Assignments"], ["resources", "Classwork & Recordings"], ["remarks", "Remarks"]],
  parent: [["news", "Announcements"], ["myAtt", "Attendance"], ["myFees", "Fees"], ["myRem", "Teacher remarks"], ["myRes", "Classwork & Recordings"], ["myAsg", "Assignments"]],
  student: [["news", "Announcements"], ["myRes", "Classwork & Recordings"], ["myAsg", "Assignments"], ["myAtt", "My attendance"], ["myRem", "Teacher remarks"]],
};
async function show() {
  const items = NAV[me.role], k = location.hash.slice(1), it = items.find((x) => x[0] === k) || items[0], box = $("#main");
  document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("on", a.dataset.k === it[0]));
  box.replaceChildren(h("h2", {}, it[1]));
  try { await M[it[0]](box); } catch (e) { box.append(h("p", { class: "notice" }, "Something went wrong: " + e.message)); }
}
F.onAuthStateChanged(auth, async (u) => {
  if (!u) return location.replace("login.html");
  const role = (await u.getIdTokenResult(true)).claims.role;
  if (!NAV[role]) { $("#boot").textContent = "Your account has no role yet. Please contact the school office."; return; }
  me = { uid: u.uid, role, email: u.email, name: u.displayName || u.email };
  document.body.className = role === "admin" ? "theme-admin" : "";
  if (role === "parent") kids = await get("students", F.where("parentIds", "array-contains", u.uid));
  if (role === "student") { const s = await F.getDoc(F.doc(db, "students", u.uid)); kids = s.exists() ? [{ id: s.id, ...s.data() }] : []; }
  $("#who").textContent = role[0].toUpperCase() + role.slice(1); $("#em").textContent = u.email;
  $("#nav").replaceChildren(...NAV[role].map(([k, l]) => h("a", { href: "#" + k, "data-k": k }, l)));
  $("#out").onclick = () => F.signOut(auth);
  $("#pw").onclick = async () => { await F.sendPasswordResetEmail(auth, u.email); toast("Password reset link sent to your email"); };
  $("#boot").hidden = true; $(".shell").hidden = false; addEventListener("hashchange", show); show();
});
