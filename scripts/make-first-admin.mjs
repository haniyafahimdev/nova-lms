// node --env-file=.env.local scripts/make-first-admin.mjs you@email.com "StrongPassword123"
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
const [email, password] = process.argv.slice(2);
if (!email || !password) { console.log('Usage: node --env-file=.env.local scripts/make-first-admin.mjs <email> "<password>"'); process.exit(1); }
initializeApp({ credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") }) });
const auth = getAuth();
let u; try { u = await auth.getUserByEmail(email); } catch { u = await auth.createUser({ email, password, displayName: "Administrator" }); }
await auth.setCustomUserClaims(u.uid, { role: "admin" });
console.log("Admin ready:", email);
