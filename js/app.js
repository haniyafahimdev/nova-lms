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
const put = (box, ...k) => box.append(...k.filter((x) => x != null && x !== false));   // never prints null
const ytId = (u) => { try { const x = new URL(u); const id = x.hostname === "youtu.be" ? x.pathname.slice(1) : /youtube\.com$/.test(x.hostname) ? (x.searchParams.get("v") || x.pathname.split("/").pop()) : ""; return /^[\w-]{11}$/.test(id) ? id : null; } catch { return null; } };
const play = (url, title) => {                       // plays YouTube inside the page, no new tab
  const m = h("div", { class: "modal", onclick: (e) => { if (e.target === m) m.remove(); } }, h("div", { class: "mbox" },
    h("button", { class: "btn sm ghost", onclick: () => m.remove() }, "✕ Close"),
    h("div", { class: "vid" }, h("iframe", { src: `https://www.youtube-nocookie.com/embed/${ytId(url)}?autoplay=1&rel=0`, allow: "autoplay; encrypted-media; fullscreen", title: title || "Video" })), h("p", { style: "margin:8px 4px 0" }, h("a", { href: "https://www.youtube.com/watch?v=" + ytId(url), target: "_blank", rel: "noopener", style: "color:#fff" }, "Video not playing? Open it on YouTube"))));
  document.body.append(m);
};
const resCards = (rows) => h("div", { class: "cards" }, ...rows.map((r) => { const id = ytId(r.url);
  return h("article", { class: "card res" },
    id ? h("button", { class: "thumb", "aria-label": "Play " + r.title, onclick: () => play(r.url, r.title) }, h("img", { src: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, alt: "", onerror: (e) => e.target.replaceWith(h("div", { class: "thumb ph" }, "🎬")) }), h("span", { class: "play" }, "▶"))
       : h("div", { class: "thumb ph" }, r.type === "Homework PDF" ? "📄" : "📎"),
    h("h3", {}, r.title), h("p", { class: "muted" }, [r.type, r.subject, r.className].filter(Boolean).join(" · ")),
    !id && ok(r.url) && h("a", { class: "btn sm", href: r.url, target: "_blank", rel: "noopener" }, "Open")); }));
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], todayAbbr = () => new Date().toLocaleDateString("en-US", { weekday: "short" });
const hue = (t) => [...String(t)].reduce((a, c) => a + c.charCodeAt(0), 0) * 37 % 360;
const slot = (r, who) => h("div", { class: "slot", style: `border-left-color:hsl(${hue(r.subject)},70%,55%)` }, h("b", {}, r.subject || "Class"), h("small", {}, `Period ${r.period} · ${r.start || ""}–${r.end || ""}`), h("small", {}, who === "teacher" ? r.className : r.teacher || ""));
const ttGrid = (rows, who) => { const days = DAYS.filter((d) => d !== "Sat" || rows.some((r) => r.day === "Sat"));
  return rows.length ? h("div", { class: "tt" }, ...days.map((d) => h("div", { class: "ttday" + (d === todayAbbr() ? " now" : "") }, h("h3", {}, d + (d === todayAbbr() ? " · today" : "")),
    ...(rows.filter((r) => r.day === d).sort((a, b) => a.period - b.period).map((r) => slot(r, who)).concat(rows.some((r) => r.day === d) ? [] : [h("small", { class: "muted" }, "No classes")]))))) : h("p", { class: "notice" }, "No timetable has been added yet."); };
async function ticker() {
  const aud = { teacher: "Teachers", parent: "Parents", student: "Students" }[me.role];
  const a = (await get("announcements", F.orderBy("createdAt", "desc"), F.limit(8))).filter((x) => x.audience === "Everyone" || x.audience === aud); if (!a.length) return;
  const items = a.map((x) => h("a", { href: "#news" }, "📣 " + x.title + (x.message ? ": " + x.message.slice(0, 60) : "")));
  $(".main").insertBefore(h("div", { class: "ticker", "aria-label": "Latest announcements" }, h("div", { class: "track" }, ...items, ...items.map((i) => i.cloneNode(true)))), $("#main"));
}
function funMode() {                                   // star cursor + sparkle burst on click (skipped for reduced-motion users)
  if (matchMedia("(prefers-reduced-motion:reduce)").matches) return;
  const cur = h("div", { class: "cursor" }, "⭐"); document.body.append(cur);
  addEventListener("pointermove", (e) => { cur.style.transform = `translate(${e.clientX}px,${e.clientY}px)`; });
  addEventListener("pointerdown", (e) => { for (let i = 0; i < 8; i++) { const sp = h("span", { class: "spark" }, ["⭐", "✨", "🎈", "💛"][i % 4]);
    sp.style.left = e.clientX + "px"; sp.style.top = e.clientY + "px"; sp.style.setProperty("--dx", Math.random() * 160 - 80 + "px"); sp.style.setProperty("--dy", -(Math.random() * 140 + 20) + "px"); document.body.append(sp); setTimeout(() => sp.remove(), 900); } });
}
const csOpts = async () => { const [c, s] = await Promise.all([classNames(), get("subjects")]);
  return c.flatMap((cn) => [{ v: cn + "||", l: cn + " · all subjects" }, ...s.filter((x) => x.className === cn).map((x) => ({ v: cn + "||" + x.name, l: cn + " · " + x.name }))]); };
const splitCs = ({ cs, ...r }) => { const [className, subject] = cs.split("||"); return { ...r, className, subject }; };

const cell = (v, c) => c[2] === "link" ? (ok(v) ? (ytId(v) ? h("button", { class: "btn sm", onclick: () => play(v) }, "▶ Watch") : h("a", { href: v, target: "_blank", rel: "noopener" }, "Open")) : "-")
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
const crud = (coll, fx, cols, pre = (d) => d) => async (box) => {
  const list = h("div");
  const load = async () => list.replaceChildren(table(cols, await get(coll, F.orderBy("createdAt", "desc")), (r) =>
    h("button", { class: "btn sm ghost", onclick: async () => { if (confirm("Delete this?")) { await F.deleteDoc(F.doc(db, coll, r.id)); load(); } } }, "Delete")));
  box.append(form(await fx(), async (d) => { await F.addDoc(F.collection(db, coll), { ...pre(d), createdAt: F.serverTimestamp(), by: me.uid }); toast("Saved"); load(); }), list); load();
};
const people = (role, coll, fx, cols, ctxFn) => async (box) => {
  const list = h("div"), note = h("p", { class: "notice", hidden: true });
  const withCtx = async (rows) => { const d = ctxFn ? await ctxFn() : () => ({}); return rows.map((r) => ({ ...r, name: nm(r), ...d(r) })); };
  const load = async () => list.replaceChildren(table([["name", "Name"], ["email", "Email"], ...cols, ["status", "Status", "status"]],
    await withCtx(await get(coll)), (r) => h("button", { class: "btn sm ghost", onclick: async () => {
      try { await api({ action: "status", role, uid: r.id, disabled: r.status === "active" }); load(); } catch (e) { toast(e.message, 1); } } }, r.status === "active" ? "Deactivate" : "Activate")));
  const base = [{ n: "firstName", l: "First name", r: 1 }, { n: "lastName", l: "Last name", r: 1 }, { n: "email", l: "Login email", t: "email", r: 1 }];
  box.append(form([...base, ...await fx()], async (d) => { const { firstName, lastName, email, ...extra } = d;
    const x = await api({ role, firstName, lastName, email, extra });
    note.textContent = x.emailSent ? `${firstName} added. Login details were emailed.` : `${firstName} added. Email not set up yet. Temporary password: ${x.tempPassword}`; note.hidden = false; load(); }), note, ...(ctxFn ? [await linkCard(load)] : []), list); load();
};
const linkCard = async (reload) => {                  // connect (or disconnect) a parent and a child
  const [P, S] = await Promise.all([get("parents"), get("students")]);
  return h("div", {}, h("b", {}, "Link a parent to a child"), form([
    { n: "parentId", l: "Parent", t: "select", o: P.map((p) => ({ v: p.id, l: nm(p) + " (" + p.email + ")" })), r: 1 },
    { n: "studentId", l: "Child", t: "select", o: S.map((x) => ({ v: x.id, l: nm(x) + " · " + (x.className || "no class") })), r: 1 },
    { n: "act", l: "Action", t: "select", o: ["Link", "Unlink"] }],
    async (d) => { await api({ action: "link", parentId: d.parentId, studentId: d.studentId, unlink: d.act === "Unlink" }); toast(d.act === "Link" ? "Linked" : "Unlinked"); reload(); }, "Update link"));
};
const M = {};
M.students = people("student", "students", async () => [{ n: "admissionNo", l: "Admission no." }, { n: "className", l: "Class", t: "select", o: await classNames() }, { n: "dob", l: "Date of birth", t: "date" }, { n: "parentEmail", l: "Parent’s login email (optional)", t: "email" }], [["admissionNo", "Adm. no."], ["className", "Class"], ["parents", "Parent"]], async () => { const P = await get("parents"); return (r) => ({ parents: (r.parentIds || []).map((id) => nm(P.find((p) => p.id === id) || {})).filter(Boolean).join(", ") || "–" }); });
M.teachers = people("teacher", "teachers", async () => [{ n: "title", l: "Title (for greeting)", t: "select", o: ["Miss", "Sir", "Mrs.", "Mr.", "Dr."] }, { n: "phone", l: "Phone" }, { n: "subjects", l: "Subjects" }], [["title", "Title"], ["phone", "Phone"], ["subjects", "Subjects"]]);
M.parents = people("parent", "parents", async () => [{ n: "phone", l: "Phone" }, { n: "relationship", l: "Relationship" }], [["phone", "Phone"], ["relationship", "Relation"], ["children", "Children"]], async () => { const S = await get("students"); return (r) => ({ children: S.filter((x) => (x.parentIds || []).includes(r.id)).map(nm).join(", ") || "–" }); });
M.classes = crud("classes", async () => [{ n: "name", l: "Class name (e.g. Grade 2)", r: 1 }], [["name", "Class"]]);
M.subjects = crud("subjects", async () => [{ n: "name", l: "Subject (e.g. Maths)", r: 1 }, { n: "className", l: "Class", t: "select", o: await classNames(), r: 1 }, { n: "teacher", l: "Teacher", t: "select", o: ["", ...(await get("teachers")).map(nm)] }], [["name", "Subject"], ["className", "Class"], ["teacher", "Teacher"]]);
M.assignments = crud("assignments", async () => [{ n: "title", l: "Title", r: 1 }, { n: "cs", l: "Class · Subject", t: "select", o: await csOpts(), r: 1 }, { n: "dueDate", l: "Due date", t: "date" }, { n: "pdfUrl", l: "Homework PDF link (Google Drive etc.)", t: "url" }, { n: "description", l: "Instructions", t: "area" }], [["title", "Title"], ["className", "Class"], ["subject", "Subject"], ["dueDate", "Due"], ["pdfUrl", "PDF", "link"]], splitCs);
M.resources = crud("resources", async () => [{ n: "title", l: "Title", r: 1 }, { n: "type", l: "Type", t: "select", o: ["Recording", "Classwork", "Homework PDF"], r: 1 }, { n: "cs", l: "Class · Subject", t: "select", o: await csOpts(), r: 1 }, { n: "url", l: "Link (unlisted YouTube video, Drive PDF…)", t: "url", r: 1 }], [["title", "Title"], ["type", "Type"], ["className", "Class"], ["subject", "Subject"], ["url", "Video / file", "link"]], splitCs);
M.announce = crud("announcements", async () => [{ n: "title", l: "Title", r: 1 }, { n: "audience", l: "Audience", t: "select", o: ["Everyone", "Parents", "Teachers", "Students"] }, { n: "message", l: "Message", t: "area", r: 1 }], [["title", "Title"], ["audience", "Audience"], ["message", "Message"]]);

M.timetable = crud("timetable", async () => [{ n: "cs", l: "Class · Subject", t: "select", o: await csOpts(), r: 1 }, { n: "day", l: "Day", t: "select", o: DAYS }, { n: "period", l: "Period no.", t: "number", r: 1 }, { n: "start", l: "Start", t: "time", r: 1 }, { n: "end", l: "End", t: "time", r: 1 }, { n: "teacher", l: "Teacher", t: "select", o: ["", ...(await get("teachers")).map(nm)] }],
  [["day", "Day"], ["period", "Period"], ["start", "Start"], ["end", "End"], ["className", "Class"], ["subject", "Subject"], ["teacher", "Teacher"]], (d) => ({ ...splitCs(d), period: +d.period }));
M.planners = crud("planners", async () => [{ n: "week", l: "Week starting", t: "date", r: 1 }, { n: "cs", l: "Class · Subject", t: "select", o: await csOpts(), r: 1 }, { n: "topics", l: "Topics / plan for the week", t: "area", r: 1 }, { n: "link", l: "Planner file link (Drive etc.)", t: "url" }],
  [["week", "Week of"], ["className", "Class"], ["subject", "Subject"], ["topics", "Plan"], ["teacher", "Teacher"], ["link", "File", "link"]], (d) => ({ ...splitCs(d), teacher: me.name }));
M.myTT = async (box) => { const c = classesOfKids(); if (!c.length) return noClass(box); box.append(ttGrid(await get("timetable", F.where("className", "in", c)), "student")); };
M.tTT = async (box) => box.append(ttGrid(await get("timetable", F.where("teacher", "==", me.name)), "teacher"));
M.home = async (box) => {
  const c = classesOfKids(), rows = c.length ? (await get("timetable", F.where("className", "in", c))).filter((r) => r.day === todayAbbr()).sort((a, b) => a.period - b.period) : [];
  put(box, h("div", { class: "card hello" }, h("h2", {}, `Hi ${me.name.split(" ")[0]}! 👋`), h("p", {}, rows.length ? "Here are your classes today:" : "No classes today. Enjoy your day! 🎉")), rows.length ? h("div", { class: "tt one" }, ...rows.map((r) => slot(r, "student"))) : null);
};
M.dash = async (box) => {
  const t = today(), day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10), cnt = (c) => F.getCountFromServer(F.collection(db, c)).then((x) => x.data().count);
  const [ns, nt, att, inv, asg, news, rem, cls] = await Promise.all([cnt("students"), cnt("teachers"), get("attendance", F.where("date", ">=", day(-30))), get("invoices"), get("assignments"),
    get("announcements", F.orderBy("createdAt", "desc"), F.limit(3)), get("remarks", F.orderBy("createdAt", "desc"), F.limit(3)), get("classes")]);
  const pct = (r) => { r = r.filter((x) => x.status !== "Excused"); return r.length ? Math.round(100 * r.filter((x) => x.status !== "Absent").length / r.length) : null; };
  const byDate = {}; att.forEach((x) => (byDate[x.date] ??= []).push(x));
  const days = Object.keys(byDate).sort().slice(-5).map((d) => ({ l: new Date(d + "T00:00").toLocaleDateString("en-GB", { weekday: "short" }), v: pct(byDate[d]) })), latest = days.length ? days[days.length - 1].v : null;
  const bySt = {}; att.forEach((x) => (bySt[x.studentName] ??= []).push(x));
  const low = Object.entries(bySt).map(([n, r]) => [n, pct(r)]).filter(([, p]) => p !== null && p < 90);
  const overdue = inv.filter((i) => i.status !== "Paid" && i.dueDate && i.dueDate < t), owed = inv.reduce((a2, i) => a2 + (i.amount - i.paid), 0), odAmt = overdue.reduce((a2, i) => a2 + (i.amount - i.paid), 0);
  const due = asg.filter((x) => x.dueDate && x.dueDate >= t && x.dueDate <= day(7)), missing = cls.filter((c) => !att.some((x) => x.date === t && x.className === c.name));
  const bm = {}, cm = {}; inv.forEach((i) => { const m = i.month || "?"; bm[m] = (bm[m] || 0) + i.amount; cm[m] = (cm[m] || 0) + i.paid; });
  const months = Object.keys(bm).sort().slice(-6), mx = Math.max(1, ...months.map((m) => bm[m]));
  const att2 = [[low.length, "#f5a623", `${low.length} student${low.length > 1 ? "s" : ""} below 90% attendance`, low.slice(0, 3).map(([n, p]) => `${n} ${p}%`).join(", "), "#attendance"],
    [overdue.length, "#ff6b5b", `${overdue.length} overdue invoice${overdue.length > 1 ? "s" : ""}`, `PKR ${odAmt.toLocaleString()} outstanding`, "#fees"],
    [due.length, "#7c5cff", `${due.length} assignment${due.length > 1 ? "s" : ""} due this week`, due.slice(0, 2).map((x) => x.title).join(", "), "#assignments"],
    [missing.length && days.length, "#2fb99a", `Attendance not taken today for ${missing.length} class${missing.length > 1 ? "es" : ""}`, missing.slice(0, 3).map((c) => c.name).join(", "), "#attendance"]].filter((x) => x[0]);
  const ago = (ms) => { const m = Math.round((Date.now() - ms) / 6e4); return m < 60 ? m + " min ago" : m < 1440 ? Math.round(m / 60) + " h ago" : Math.round(m / 1440) + " d ago"; };
  const ms = (x) => x.createdAt?.toMillis?.() || 0;
  const act = [...news.map((x) => ({ ms: ms(x), t: "Announcement: " + x.title })), ...rem.map((x) => ({ ms: ms(x), t: `Remark for ${x.studentName}` })), ...inv.filter(ms).sort((p, q) => ms(q) - ms(p)).slice(0, 3).map((x) => ({ ms: ms(x), t: `Invoice created for ${x.studentName}` }))].filter((x) => x.ms).sort((p, q) => q.ms - p.ms).slice(0, 6);
  const col = (v, l) => h("div", { class: "bcol" }, h("small", {}, v == null ? "–" : v + "%"), h("div", { class: "bfill", style: `height:${(v || 0) * 1.3}px` }), h("small", { class: "muted" }, l));
  const stat = (n, l, sub) => h("div", { class: "card stat" }, h("span", {}, l), h("b", {}, n), h("small", { class: "muted" }, sub));
  const hr = new Date().getHours();
  box.append(
    h("div", { class: "card hero2" }, h("div", {}, h("small", { class: "muted" }, new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })),
      h("h2", { style: "font-size:2rem;margin:.2em 0" }, `Good ${hr < 12 ? "morning" : hr < 17 ? "afternoon" : "evening"}, Administrator.`), h("p", { class: "muted" }, "Here is the pulse of NOVA Virtual School today."), h("a", { class: "btn", href: "#announce" }, "+ Create announcement")),
      h("div", { class: "ring", style: `--p:${latest ?? 0}` }, h("b", {}, latest == null ? "–" : latest + "%"), h("small", {}, "attendance"))),
    h("div", { class: "stats" }, stat(ns, "Students", "Active records"), stat(nt, "Teachers", "Active records"), stat(latest == null ? "–" : latest + "%", "Attendance", "Latest recorded day"), stat(due.length, "Assignments", "Due in 7 days"), stat("PKR " + owed.toLocaleString(), "Fees outstanding", `${overdue.length} overdue`)),
    h("div", { class: "two" },
      h("div", { class: "card" }, h("b", {}, "Attendance pulse"), h("div", { class: "muted" }, "Whole school · last 5 recorded days"), days.length ? h("div", { class: "bars" }, ...days.map((d) => col(d.v, d.l))) : h("p", { class: "notice" }, "No attendance recorded yet.")),
      h("div", { class: "card" }, h("b", {}, "Needs attention"), ...(att2.length ? att2.map(([, c, t1, sub, href]) => h("a", { class: "li", href }, h("span", { class: "dot", style: "background:" + c }), h("div", {}, h("b", {}, t1), h("div", { class: "muted" }, sub || "")))) : [h("p", { class: "notice" }, "All clear. Nothing needs attention.")]))),
    h("div", { class: "two" },
      h("div", { class: "card" }, h("b", {}, "Fees by month"), h("div", { class: "muted" }, h("span", { class: "key billed" }), " Billed   ", h("span", { class: "key" }), " Collected"), months.length ? h("div", { class: "bars" }, ...months.map((m) => h("div", { class: "bcol" }, h("div", { class: "pair" }, h("div", { class: "bfill billed", style: `height:${120 * bm[m] / mx}px` }), h("div", { class: "bfill", style: `height:${120 * cm[m] / mx}px` })), h("small", { class: "muted" }, new Date(m + "-01").toLocaleDateString("en-GB", { month: "short" }))))) : h("p", { class: "notice" }, "No invoices yet.")),
      h("div", { class: "card" }, h("b", {}, "Recent activity"), ...(act.length ? act.map((x) => h("div", { class: "li" }, h("span", { class: "dot", style: "background:var(--brand)" }), h("div", {}, h("b", {}, x.t), h("div", { class: "muted" }, ago(x.ms))))) : [h("p", { class: "notice" }, "Nothing yet.")]))));
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
M.tHome = async (box) => {
  const rows = (await get("timetable", F.where("teacher", "==", me.name))).filter((r) => r.day === todayAbbr()).sort((a, b) => a.period - b.period);
  put(box, h("div", { class: "card hello" }, h("h2", {}, `Hey ${[me.title, me.name.split(" ")[0]].filter(Boolean).join(" ")}! 👋`), h("p", {}, rows.length ? `You have ${rows.length} class${rows.length > 1 ? "es" : ""} today:` : "No classes scheduled today.")),
    rows.length ? h("div", { class: "tt one" }, ...rows.map((r) => slot(r, "teacher"))) : null);
};
M.pHome = async (box) => {
  const [att, inv, rem] = await Promise.all([get("attendance", mine()), get("invoices", mine()), get("remarks", mine())]);
  const pct = (id) => { const r = att.filter((x) => x.studentId === id && x.status !== "Excused"); return r.length ? Math.round(100 * r.filter((x) => x.status !== "Absent").length / r.length) + "%" : "–"; };
  put(box, h("div", { class: "card hello" }, h("h2", {}, `Hello, ${me.name.split(" ")[0]}! 👋`), h("p", {}, kids.length ? "Here is how your child" + (kids.length > 1 ? "ren are" : " is") + " doing." : "No child is linked to your account yet. Please contact the school office.")),
    h("div", { class: "cards" }, ...kids.map((k) => { const owed = inv.filter((i) => i.studentId === k.id).reduce((a, i) => a + i.amount - i.paid, 0), last = rem.filter((r) => r.studentId === k.id).sort((x, y) => (y.date || "").localeCompare(x.date || ""))[0];
      return h("article", { class: "card" }, h("h3", {}, nm(k)), h("p", { class: "muted" }, [k.className, k.admissionNo && "Adm. " + k.admissionNo].filter(Boolean).join(" · ")),
        h("p", {}, h("b", {}, pct(k.id)), " attendance"), h("p", {}, owed ? `PKR ${owed.toLocaleString()} fees due` : "Fees up to date ✅"),
        last ? h("p", { class: "muted" }, "“" + last.text + "” — " + (last.teacherName || "teacher")) : null); })));
};
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
M.myRes = async (box) => {
  const c = classesOfKids(); if (!c.length) return noClass(box);
  const rows = await get("resources", F.where("className", "in", c)), subs = [...new Set(rows.map((r) => r.subject).filter(Boolean))].sort(), out = h("div");
  const draw = (v) => out.replaceChildren(rows.length ? resCards(rows.filter((r) => !v || r.subject === v)) : h("p", { class: "notice" }, "Nothing has been shared yet."));
  put(box, subs.length ? h("div", { class: "card form" }, h("label", {}, "Subject", h("select", { onchange: (e) => draw(e.target.value) }, h("option", { value: "" }, "All subjects"), ...subs.map((x) => h("option", {}, x))))) : null, out); draw("");
};
M.myAsg = forClass("assignments", [["title", "Title"], ["subject", "Subject"], ["className", "Class"], ["dueDate", "Due"], ["description", "Instructions"], ["pdfUrl", "PDF", "link"]]);

const NAV = {
  admin: [["dash", "Dashboard"], ["students", "Students"], ["teachers", "Teachers"], ["parents", "Parents"], ["classes", "Classes"], ["subjects", "Subjects"], ["timetable", "Timetable"], ["planners", "Planners"], ["attendance", "Attendance"], ["fees", "Fees"], ["assignments", "Assignments"], ["resources", "Classwork & Recordings"], ["remarks", "Remarks"], ["announce", "Announcements"]],
  teacher: [["tHome", "Home"], ["tTT", "My timetable"], ["attendance", "Attendance"], ["assignments", "Assignments"], ["resources", "Classwork & Recordings"], ["planners", "Planners"], ["remarks", "Remarks"], ["news", "Announcements"]],
  parent: [["pHome", "Home"], ["news", "Announcements"], ["myTT", "Timetable"], ["myAtt", "Attendance"], ["myFees", "Fees"], ["myRem", "Teacher remarks"], ["myRes", "Classwork & Recordings"], ["myAsg", "Assignments"]],
  student: [["home", "Home"], ["myTT", "Timetable"], ["myRes", "Classwork & Recordings"], ["myAsg", "Assignments"], ["myAtt", "My attendance"], ["myRem", "Teacher remarks"], ["news", "Announcements"]],
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
  document.body.className = role === "admin" ? "theme-admin" : "kid role-" + role + (role === "student" ? " fun" : "");
  if (role === "parent") kids = await get("students", F.where("parentIds", "array-contains", u.uid));
  if (role === "student") { const s = await F.getDoc(F.doc(db, "students", u.uid)); kids = s.exists() ? [{ id: s.id, ...s.data() }] : []; }
  if (role === "teacher") { const t = await F.getDoc(F.doc(db, "teachers", u.uid)); me.title = t.exists() ? t.data().title || "" : ""; }
  $("#who").textContent = role[0].toUpperCase() + role.slice(1); $("#em").textContent = u.email;
  $("#nav").replaceChildren(...NAV[role].map(([k, l]) => h("a", { href: "#" + k, "data-k": k }, l)));
  $("#out").onclick = () => F.signOut(auth);
  $("#pw").onclick = async () => { await F.sendPasswordResetEmail(auth, u.email); toast("Password reset link sent to your email"); };
  if (role !== "admin") {
    const side = $(".side"), scrim = h("div", { class: "scrim" }), close = () => { side.classList.remove("open"); scrim.classList.remove("on"); };
    scrim.onclick = close; document.body.append(scrim); addEventListener("hashchange", close);
    $(".bar").prepend(h("button", { class: "btn sm", "aria-label": "Open menu", onclick: () => { side.classList.add("open"); scrim.classList.add("on"); } }, "☰ Menu"), h("b", { class: "brand" }, "NOVA"));
    ticker().catch(() => {}); if (role === "student") funMode();
  }
  const dk = h("button", { class: "btn sm ghost", "aria-label": "Toggle dark mode", onclick: () => { const on = document.body.classList.toggle("dark"); try { localStorage.setItem("nova_dark", on ? "1" : ""); } catch {} } }, "🌓");
  $("#pw").before(dk); try { if (localStorage.getItem("nova_dark")) document.body.classList.add("dark"); } catch {}
  $("#boot").hidden = true; $(".shell").hidden = false; addEventListener("hashchange", show); show();
});
