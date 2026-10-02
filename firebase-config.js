// =============================================================
// firebase-config.js
// -------------------------------------------------------------
// ไฟล์ตั้งค่าการเชื่อมต่อ Firebase Firestore
//
// วิธีขอค่าเหล่านี้ (ฟรี):
//   1. ไปที่ https://console.firebase.google.com/
//   2. สร้างโปรเจกต์ใหม่ (Add project)
//   3. ไปที่เมนู Build > Firestore Database > Create database
//      (เลือก Start in test mode ช่วงทดสอบ)
//   4. ไปที่ Project settings (รูปเฟือง) > Your apps > Web (</>)
//   5. คัดลอกค่า firebaseConfig มาวางแทนด้านล่าง
// =============================================================

export const firebaseConfig = {
  apiKey: "AIzaSyBwKXYJji4qQNoOvhcqpdBWHdpPLQ4sXJ0",
  authDomain: "tarsaray1.firebaseapp.com",
  databaseURL: "https://tarsaray1-default-rtdb.firebaseio.com",
  projectId: "tarsaray1",
  storageBucket: "tarsaray1.firebasestorage.app",
  messagingSenderId: "782765725846",
  appId: "1:782765725846:web:d645224c9942a0075acab7",
  measurementId: "G-WF8T4DSX5D"
};

// ชื่อ collection ใน Firestore ที่ใช้เก็บพิกัดของอุปกรณ์
export const COLLECTION = "trackers";

// จำนวนจุดสูงสุดของเส้นทางย้อนหลัง (Trail) ที่เก็บไว้ต่อเครื่อง
export const MAX_TRAIL_POINTS = 300;
