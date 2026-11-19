// Paste your Firebase WEB config here (Project settings > Your apps). These values are public by design;
// your data is protected by firestore.rules, not by hiding this config.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
export * from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
export * from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const app = initializeApp({
 apiKey: "AIzaSyDhxjjhb7F1dYlfMFhynVFmOg0GxJdSO7M",
  authDomain: "nova-lms-3eff3.firebaseapp.com",
  projectId: "nova-lms-3eff3",
  storageBucket: "nova-lms-3eff3.firebasestorage.app",
  messagingSenderId: "217568530983",
  appId: "1:217568530983:web:c57e932b29ff4dc7cf7402",
  measurementId: "G-BK4T220P5F"
});
export const auth = getAuth(app);
export const db = getFirestore(app);
