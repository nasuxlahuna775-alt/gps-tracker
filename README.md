# 📍 Real-time GPS Tracker (Leaflet + Firebase Firestore)

ระบบติดตามพิกัด GPS แบบเรียลไทม์ ใช้งานฟรีทั้งหมด (OpenStreetMap + Firebase Spark Plan)
เปิดหน้า `tracker.html` บนมือถือเพื่อแชร์พิกัด แล้วดูตำแหน่งแบบสดๆบนแดชบอร์ด `index.html`

---

## 📁 โครงสร้างไฟล์

```
realtime-gps-tracker/
├─ index.html          # แดชบอร์ดแผนที่ (ฝั่งผู้ติดตาม)
├─ tracker.html        # หน้าเปิดบนมือถือเพื่อแชร์พิกัด
├─ app.js              # โค้ดหลัก (Geolocation + รับ-ส่งข้อมูล Firestore)
├─ firebase-config.js  # ค่าคอนฟิกเชื่อมต่อฐานข้อมูล
└─ README.md           # คู่มือนี้
```

## 🧩 เทคโนโลยีที่ใช้

| ส่วน | เทคโนโลยี |
|------|-----------|
| Frontend | HTML5 + Tailwind CSS (CDN) |
| แผนที่ | Leaflet.js + OpenStreetMap (ฟรี ไม่ต้องใช้ API Key) |
| ดึงพิกัด | HTML5 Geolocation API (`watchPosition`) |
| ฐานข้อมูลเรียลไทม์ | Firebase Firestore (`onSnapshot`) |

---

## 🔥 ขั้นตอนที่ 1 — ตั้งค่า Firebase (ทำครั้งเดียว)

1. ไปที่ <https://console.firebase.google.com/> → **Add project**
2. เมนูซ้าย **Build → Firestore Database → Create database**
   - เลือกโหมด **Start in test mode** (ทดสอบ) แล้วกด Enable
3. ไปที่ **Project settings (⚙️) → Your apps → Web `</>`** → ตั้งชื่อแอป
4. คัดลอกออบเจกต์ `firebaseConfig` มาวางในไฟล์ **`firebase-config.js`**

```js
export const firebaseConfig = {
  apiKey: "AIza......",
  authDomain: "my-tracker.firebaseapp.com",
  projectId: "my-tracker",
  storageBucket: "my-tracker.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### Firestore Security Rules (สำหรับทดสอบ)

หน้า **Firestore → Rules** วางโค้ดนี้เพื่อให้ระบบอ่าน/เขียนได้ระหว่างทดสอบ:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /trackers/{deviceId} {
      allow read, write: if true;   // ⚙️ ทดสอบเท่านั้น — ควรรัดกุมก่อนขึ้น production
    }
  }
}
```

> ⚠️ **ความปลอดภัย:** `allow ... if true` เปิดให้ใครก็อ่าน/เขียนได้ เหมาะกับทดสอบเท่านั้น
> ก่อนใช้งานจริงควรเพิ่มระบบยืนยันตัวตน (Firebase Authentication) และจำกัดสิทธิ์ตามผู้ใช้

---

## 💻 ขั้นตอนที่ 2 — รันบน Localhost

เนื่องจากโค้ดใช้ ES Module (`import`) จึงต้องเปิดผ่าน **web server** (เปิดไฟล์ตรงๆ ด้วย `file://` จะไม่ทำงาน)

เลือกวิธีใดก็ได้:

```bash
# Python 3
python3 -m http.server 8000

# หรือ Node.js
npx serve .

# หรือ VS Code: คลิกขวาที่ index.html → "Open with Live Server"
```

จากนั้นเปิดเบราว์เซอร์:
- แดชบอร์ด: <http://localhost:8000/index.html>
- หน้าแชร์พิกัด: <http://localhost:8000/tracker.html>

> 📌 **สำคัญ:** Geolocation API จะทำงานเฉพาะบน **`localhost`** หรือ **`https://`** เท่านั้น
> การเปิดผ่าน IP ธรรมดา (เช่น http://192.168.x.x) บนมือถือจะถูกเบราว์เซอร์บล็อก GPS

---

## 🚀 ขั้นตอนที่ 3 — Deploy ขึ้น Hosting ฟรี (รองรับ HTTPS)

GPS ต้องการ HTTPS — โฮสต์ทั้งสองตัวนี้ให้ HTTPS อัตโนมัติและฟรี

### ตัวเลือก A: GitHub Pages

```bash
git init
git add .
git commit -m "realtime gps tracker"
git branch -M main
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main
```

จากนั้นไปที่ **Repo → Settings → Pages → Source: `main` / root → Save**
รอสักครู่จะได้ลิงก์แบบ: `https://<username>.github.io/<repo>/index.html`

### ตัวเลือก B: Vercel

```bash
npm i -g vercel
vercel          # ทำตามขั้นตอนบนหน้าจอ (เลือก root เป็นโฟลเดอร์โปรเจกต์)
vercel --prod   # ขึ้น production
```

หรือลากโฟลเดอร์ไปวางที่ <https://vercel.com/new> ก็ได้ (ไม่ต้องตั้งค่า build เพราะเป็น static)

---

## 📖 วิธีใช้งาน

1. เปิด `tracker.html` บนมือถือ → กรอกรหัส/ชื่ออุปกรณ์ (เช่น `car-01`) → กด **▶️ เริ่มแชร์** → อนุญาตการเข้าถึงตำแหน่ง
2. เปิด `index.html` บนคอมพิวเตอร์/แท็บเล็ต → เห็นหมุดขยับบนแผนที่แบบสดๆ + เส้นทางย้อนหลัง
3. ติดตามหลายเครื่องพร้อมกันได้ — แต่ละเครื่องใช้รหัสต่างกัน → คลิกรายการใน sidebar เพื่อติดตามเฉพาะเครื่อง

## 🗃️ โครงสร้างข้อมูลใน Firestore

`trackers/{deviceId}`:

```jsonc
{
  "deviceId": "car-01",
  "lat": 13.7563,
  "lng": 100.5018,
  "accuracy": 12.5,          // เมตร
  "speed": 8.3,              // m/s (หน้าจอแสดงเป็น km/h)
  "heading": 90,             // องศาทิศ
  "battery": 87,             // %
  "charging": false,
  "trail": [ { "lat": .., "lng": .., "t": 1700000000000 } ],
  "updatedAt": 1700000000000,
  "active": true
}
```

## ⚙️ การปรับแต่ง

- **ความถี่ในการส่งพิกัด** — `watchPosition` ส่งเมื่อมีการเคลื่อนที่โดยอัตโนมัติ (ปรับ `enableHighAccuracy`/`timeout` ได้ใน `app.js`)
- **จำนวนจุดเส้นทางย้อนหลัง** — แก้ `MAX_TRAIL_POINTS` ใน `firebase-config.js`
- **เกณฑ์ online/offline** — ถือว่า offline เมื่อไม่มีการอัปเดตเกิน 30 วินาที (แก้ในฟังก์ชัน `isOnline`)

## ❌ Troubleshooting

| อาการ | สาเหตุ / วิธีแก้ |
|------|-----------------|
| แผนที่ขึ้นแต่ไม่มีหมุด | ยังไม่มีอุปกรณ์ส่งพิกัด / ตรวจ `firebase-config.js` |
| ขอสิทธิ์ GPS ไม่ขึ้น | ต้องรันบน `localhost` หรือ `https://` + อนุญาตตำแหน่งในเบราว์เซอร์ |
| `Missing or insufficient permissions` | แก้ Firestore Rules ตามด้านบน |
| โค้ด import ไม่ทำงาน (CORS/module) | ต้องเปิดผ่าน web server — ห้ามเปิดด้วย `file://` |

---

ทำด้วยเทคโนโลยีฟรีทั้งหมด · ปรับแต่งได้ตามต้องการ 🚀
