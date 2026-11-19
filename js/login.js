import { auth, signInWithEmailAndPassword, sendPasswordResetEmail } from "./firebase.js";
const f = document.querySelector("form"), msg = document.querySelector("#msg");
const say = (t, bad) => { msg.textContent = t; msg.hidden = false; msg.style.color = bad ? "#a3271a" : ""; };
f.onsubmit = async (e) => {
  e.preventDefault();
  try { await signInWithEmailAndPassword(auth, f.email.value, f.password.value); location.href = "portal.html"; }
  catch { say("Email or password is incorrect.", true); }
};
document.querySelector("#forgot").onclick = async () => {
  if (!f.email.value) return say("Type your email first, then tap this again.", true);
  try { await sendPasswordResetEmail(auth, f.email.value); } catch {}
  say("If that email has an account, a reset link is on its way.");
};
