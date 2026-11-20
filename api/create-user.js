// Vercel serverless function. The ONLY server code. Admin-only: creates accounts and enables/disables them.
const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { randomBytes } = require("crypto");

let auth, db;
function init() {                       // runs inside try/catch so setup problems come back as a readable error
  if (!getApps().length) {
    initializeApp({ credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n").replace(/^"|"$/g, ""),
    }) });
  }
  auth = getAuth(); db = getFirestore();
}
const COL = { teacher: "teachers", parent: "parents", student: "students" };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    init();
    const me = await auth.verifyIdToken((req.headers.authorization || "").replace("Bearer ", ""));
    if (me.role !== "admin") return res.status(403).json({ error: "Admins only" });
    const b = req.body || {};
    if (b.action === "link") {
      const { parentId, studentId, unlink } = b; if (!parentId || !studentId) return res.status(400).json({ error: "Choose a parent and a child" });
      const op = unlink ? FieldValue.arrayRemove : FieldValue.arrayUnion;
      await db.collection("students").doc(studentId).update({ parentIds: op(parentId) });
      await db.collection("parents").doc(parentId).update({ childIds: op(studentId) });
      for (const c of ["attendance", "invoices", "remarks"]) {            // keep existing records visible to the parent
        const q = await db.collection(c).where("studentId", "==", studentId).get();
        for (let i = 0; i < q.docs.length; i += 400) { const batch = db.batch(); q.docs.slice(i, i + 400).forEach((d) => batch.update(d.ref, { parentIds: op(parentId) })); await batch.commit(); }
      }
      return res.json({ ok: true });
    }
    if (!COL[b.role]) return res.status(400).json({ error: "Invalid role" });

    if (b.action === "status") {
      if (!b.uid) return res.status(400).json({ error: "Missing user" });
      await auth.updateUser(b.uid, { disabled: !!b.disabled });
      await db.collection(COL[b.role]).doc(b.uid).update({ status: b.disabled ? "inactive" : "active" });
      return res.json({ ok: true });
    }

    const { role, email, firstName, lastName = "", extra = {} } = b;
    if (!email || !firstName) return res.status(400).json({ error: "First name and email are required" });
    const { parentEmail, ...rest } = extra;
    let parentIds = [];
    if (role === "student" && parentEmail) {
      const p = await auth.getUserByEmail(parentEmail).catch(() => null);
      if (!p) return res.status(400).json({ error: "No parent account with that email. Create the parent first." });
      parentIds = [p.uid];
    }
    const tempPassword = randomBytes(9).toString("base64url");
    const user = await auth.createUser({ email, password: tempPassword, displayName: `${firstName} ${lastName}`.trim() });
    await auth.setCustomUserClaims(user.uid, { role });
    await db.collection(COL[role]).doc(user.uid).set({ ...rest, firstName, lastName, email, role, status: "active", ...(role === "student" ? { parentIds } : {}), ...(role === "parent" ? { childIds: [] } : {}), createdAt: FieldValue.serverTimestamp() });
    if (parentIds.length) await db.collection("parents").doc(parentIds[0]).update({ childIds: FieldValue.arrayUnion(user.uid) });

    let emailSent = false;
    if (process.env.RESEND_API_KEY) {
      const { Resend } = require("resend");
      const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: process.env.RESEND_FROM, to: email, subject: "Your NOVA Virtual School login",
        html: `<p>Hello ${esc(firstName)},</p><p>Your NOVA account is ready.<br>Email: <b>${esc(email)}</b><br>Temporary password: <b>${tempPassword}</b></p><p>Log in at <a href="${process.env.SITE_URL}/login.html">${process.env.SITE_URL}/login.html</a>. You can change your password from the portal.</p>`,
      });
      emailSent = !error;
    }
    res.json({ ok: true, uid: user.uid, emailSent, tempPassword: emailSent ? undefined : tempPassword });
  } catch (e) {
    res.status(400).json({ error: e.code === "auth/email-already-exists" ? "That email already has an account." : e.message });
  }
};
