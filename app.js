// =============================================================
// app.js  (ES Module)
// -------------------------------------------------------------
// โค้ดหลักของระบบติดตาม GPS แบบเรียลไทม์
//   - หน้า tracker.html  -> ดึงพิกัดด้วย Geolocation API แล้วส่งขึ้น Firestore
//   - หน้า index.html    -> ฟัง Firestore แบบเรียลไทม์ แล้ววาดลงแผนที่
// =============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, doc, setDoc, onSnapshot, collection, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, COLLECTION, MAX_TRAIL_POINTS } from "./firebase-config.js";

// ---------- init firebase ----------
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ---------- helpers ----------
const $ = (id) => document.getElementById(id);
const page = document.body.dataset.page;

function fmtTime(ts) {
  if (!ts) return "-";
  const d = ts instanceof Date ? ts : new Date(ts);
  return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function msToKmh(mps) {
  if (mps == null || isNaN(mps)) return null;
  return mps * 3.6;
}
function colorFromId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return `hsl(${h % 360}, 70%, 55%)`;
}

// =============================================================
//  TRACKER  (tracker.html)
// =============================================================
function initTracker() {
  let watchId = null;
  const trail = [];           // เก็บเส้นทางย้อนหลังไว้ในเครื่อง
  let battery = null;

  const startBtn = $("startBtn");
  const stopBtn  = $("stopBtn");
  const statusEl = $("status");

  // โหลด Device ID ที่เคยใช้
  $("deviceId").value = localStorage.getItem("gps_device_id") || "";

  function log(msg) {
    const line = document.createElement("div");
    line.textContent = `[${fmtTime(new Date())}] ${msg}`;
    $("log").prepend(line);
  }
  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = "px-3 py-1 rounded-full text-sm font-semibold " + cls;
  }

  // อ่านระดับแบตเตอรี่ (ถ้าเบราว์เซอร์รองรับ)
  if (navigator.getBattery) {
    navigator.getBattery().then((b) => {
      battery = b;
      const upd = () => { $("battery").textContent = Math.round(b.level * 100) + "%" + (b.charging ? " ⚡" : ""); };
      upd(); b.addEventListener("levelchange", upd); b.addEventListener("chargingchange", upd);
    }).catch(() => {});
  } else {
    $("battery").textContent = "ไม่รองรับ";
  }

  async function pushPosition(pos) {
    const deviceId = $("deviceId").value.trim();
    if (!deviceId) { log("⚠️ กรุณาใส่รหัส/ชื่ออุปกรณ์ก่อน"); return; }

    const c = pos.coords;
    const point = { lat: c.latitude, lng: c.longitude, t: Date.now() };
    trail.push(point);
    if (trail.length > MAX_TRAIL_POINTS) trail.shift();

    // อัปเดต UI
    $("lat").textContent = c.latitude.toFixed(6);
    $("lng").textContent = c.longitude.toFixed(6);
    $("accuracy").textContent = c.accuracy ? Math.round(c.accuracy) + " m" : "-";
    const kmh = msToKmh(c.speed);
    $("speed").textContent = kmh != null ? kmh.toFixed(1) + " km/h" : "-";
    $("lastUpdate").textContent = fmtTime(new Date());

    const data = {
      deviceId,
      lat: c.latitude,
      lng: c.longitude,
      accuracy: c.accuracy ?? null,
      speed: c.speed ?? null,
      heading: c.heading ?? null,
      battery: battery ? Math.round(battery.level * 100) : null,
      charging: battery ? battery.charging : null,
      trail: trail.slice(),
      updatedAt: Date.now(),
      serverTime: serverTimestamp(),
      active: true
    };

    try {
      await setDoc(doc(db, COLLECTION, deviceId), data, { merge: true });
      log(`✔️ ส่งพิกัด ${c.latitude.toFixed(5)}, ${c.longitude.toFixed(5)}`);
    } catch (e) {
      log("❌ ส่งข้อมูลล้มเหลว: " + e.message);
    }
  }

  function onError(err) {
    log("❌ GPS Error: " + err.message);
    setStatus("ข้อผิดพลาด", "bg-rose-700 text-rose-100");
  }

  startBtn.addEventListener("click", () => {
    const deviceId = $("deviceId").value.trim();
    if (!deviceId) { alert("กรุณาใส่รหัส/ชื่ออุปกรณ์ก่อนเริ่มแชร์"); return; }
    if (!navigator.geolocation) { alert("เบราว์เซอร์นี้ไม่รองรับ Geolocation"); return; }
    localStorage.setItem("gps_device_id", deviceId);

    watchId = navigator.geolocation.watchPosition(pushPosition, onError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 15000
    });

    setStatus("● กำลังแชร์พิกัด", "bg-emerald-600 text-white pulse-dot");
    startBtn.disabled = true; stopBtn.disabled = false;
    $("deviceId").disabled = true;
    log("▶️ เริ่มแชร์พิกัด (deviceId=" + deviceId + ")");
  });

  // ---------- แชร์ลิงก์ติดตาม ----------
  function buildShareUrl(deviceId) {
    // สร้างลิงก์ไปยังหน้าแดชบอร์ด (index.html) พร้อมกรองรหัสเครื่องไว้ให้
    const base = location.href.replace(/tracker\.html.*$/, "").replace(/[^/]*$/, "");
    return base + "index.html?track=" + encodeURIComponent(deviceId);
  }

  function showShareLinkBox(url) {
    // แสดงลิงก์บนหน้าเพจให้เห็นชัดๆ (กดค้างไว้เพื่อคัดลอกเองได้)
    let box = $("shareLinkBox");
    if (!box) {
      box = document.createElement("input");
      box.id = "shareLinkBox";
      box.readOnly = true;
      box.className = "w-full mt-2 bg-slate-900 border border-indigo-500 rounded-xl px-3 py-2 text-xs font-mono text-indigo-200";
      box.addEventListener("click", () => box.select());
      $("shareHint").insertAdjacentElement("afterend", box);
    }
    box.value = url;
    box.select();
  }

  async function doShare() {
    const deviceId = $("deviceId").value.trim();
    if (!deviceId) { alert("\u0e01\u0e23\u0e38\u0e13\u0e32\u0e43\u0e2a\u0e48\u0e23\u0e2b\u0e31\u0e2a/\u0e0a\u0e37\u0e48\u0e2d\u0e2d\u0e38\u0e1b\u0e01\u0e23\u0e13\u0e4c\u0e01\u0e48\u0e2d\u0e19\u0e41\u0e0a\u0e23\u0e4c"); return; }
    const url = buildShareUrl(deviceId);
    const shareData = {
      title: "\u0e15\u0e34\u0e14\u0e15\u0e32\u0e21\u0e1e\u0e34\u0e01\u0e31\u0e14\u0e2a\u0e14",
      text: `\u0e15\u0e34\u0e14\u0e15\u0e32\u0e21\u0e15\u0e33\u0e41\u0e2b\u0e19\u0e48\u0e07\u0e02\u0e2d\u0e07 "${deviceId}" \u0e41\u0e1a\u0e1a\u0e40\u0e23\u0e35\u0e22\u0e25\u0e44\u0e17\u0e21\u0e4c`,
      url
    };
    log("\ud83d\udd17 \u0e01\u0e14\u0e41\u0e0a\u0e23\u0e4c\u0e25\u0e34\u0e07\u0e01\u0e4c: " + url);

    // 1) Web Share API (ใช้ได้เฉพาะ https/localhost บนมือถือ)
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        $("shareHint").textContent = "\u2705 \u0e41\u0e0a\u0e23\u0e4c\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08\u0e41\u0e25\u0e49\u0e27";
        $("shareHint").className = "text-center text-xs text-emerald-400";
        return;
      } catch (e) {
        if (e && e.name === "AbortError") return; // ผู้ใช้กดยกเลิก
        log("\u26a0\ufe0f \u0e40\u0e21\u0e19\u0e39\u0e41\u0e0a\u0e23\u0e4c\u0e44\u0e21\u0e48\u0e02\u0e36\u0e49\u0e19: " + (e && e.message ? e.message : e));
      }
    }

    // 2) คัดลอกลิงก์ไปยัง Clipboard (ต้องเป็น https/localhost)
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        $("shareHint").textContent = "\u2705 \u0e04\u0e31\u0e14\u0e25\u0e2d\u0e01\u0e25\u0e34\u0e07\u0e01\u0e4c\u0e41\u0e25\u0e49\u0e27 \u2014 \u0e27\u0e32\u0e07\u0e2a\u0e48\u0e07\u0e43\u0e2b\u0e49\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e19\u0e44\u0e14\u0e49\u0e40\u0e25\u0e22";
        $("shareHint").className = "text-center text-xs text-emerald-400";
        showShareLinkBox(url);
        return;
      }
    } catch (e) { /* ไปต่อ fallback */ }

    // 3) Fallback สุดท้าย — แสดงลิงก์ในกล่องให้คัดลอกเอง (ใช้ได้แม้บน file://)
    $("shareHint").textContent = "\u2139\ufe0f \u0e04\u0e31\u0e14\u0e25\u0e2d\u0e01\u0e25\u0e34\u0e07\u0e01\u0e4c\u0e14\u0e49\u0e32\u0e19\u0e25\u0e48\u0e32\u0e07\u0e44\u0e1b\u0e2a\u0e48\u0e07\u0e43\u0e2b\u0e49\u0e04\u0e19\u0e2d\u0e37\u0e48\u0e19";
    $("shareHint").className = "text-center text-xs text-amber-400";
    showShareLinkBox(url);
    try {
      const ok = document.execCommand && (($("shareLinkBox").select()), document.execCommand("copy"));
      if (ok) { $("shareHint").textContent = "\u2705 \u0e04\u0e31\u0e14\u0e25\u0e2d\u0e01\u0e25\u0e34\u0e07\u0e01\u0e4c\u0e41\u0e25\u0e49\u0e27"; $("shareHint").className = "text-center text-xs text-emerald-400"; }
    } catch (e) { /* ไม่เป็นไร — ลิงก์แสดงในกล่องให้แล้ว */ }
  }

  $("shareBtn").addEventListener("click", doShare);

  stopBtn.addEventListener("click", async () => {
    if (watchId != null) navigator.geolocation.clearWatch(watchId);
    watchId = null;
    setStatus("หยุด", "bg-slate-700 text-slate-300");
    startBtn.disabled = false; stopBtn.disabled = true;
    $("deviceId").disabled = false;
    log("⏹️ หยุดแชร์");
    const deviceId = $("deviceId").value.trim();
    if (deviceId) {
      try { await setDoc(doc(db, COLLECTION, deviceId), { active: false, updatedAt: Date.now() }, { merge: true }); } catch {}
    }
  });
}

// =============================================================
//  VIEWER / DASHBOARD  (index.html)
// =============================================================
function initViewer() {
  // ถ้ามีรหัสเครื่องส่งมาในลิงก์ (?track=code) ให้กรอกตัวกรองให้อัตโนมัติ
  const params = new URLSearchParams(location.search);
  const presetId = params.get("track") || params.get("id");
  if (presetId) $("filterId").value = presetId;

  // สร้างแผนที่ Leaflet + OpenStreetMap
  const map = L.map("map").setView([13.7563, 100.5018], 12); // เริ่มที่กรุงเทพฯ
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  const markers = {};   // deviceId -> L.marker
  const trails  = {};   // deviceId -> L.polyline
  const devices = {};   // deviceId -> ข้อมูลล่าสุด
  let followId = null;  // รหัสที่กำลังติดตามแบบเกาะติด
  let firstFit = true;

  function makeIcon(color) {
    return L.divIcon({
      className: "",
      html: `<div style="background:${color};width:18px;height:18px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 2px ${color}"></div>`,
      iconSize: [18, 18], iconAnchor: [9, 9]
    });
  }

  function isOnline(d) {
    return d.active && d.updatedAt && (Date.now() - d.updatedAt) < 30000; // 30 วินาที
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function render() {
    const filter = $("filterId").value.trim().toLowerCase();
    const list = $("deviceList");
    list.innerHTML = "";
    let online = 0;
    const ids = Object.keys(devices).sort();
    let shown = 0;

    ids.forEach((id) => {
      const d = devices[id];
      const match = !filter || id.toLowerCase().includes(filter);
      const color = colorFromId(id);
      const on = isOnline(d);
      if (on) online++;

      const latlng = [d.lat, d.lng];
      if (!markers[id]) {
        markers[id] = L.marker(latlng, { icon: makeIcon(color) }).addTo(map);
        trails[id] = L.polyline([], { color, weight: 4, opacity: 0.7 }).addTo(map);
      }
      markers[id].setLatLng(latlng);
      markers[id].setIcon(makeIcon(on ? color : "#64748b"));
      if (Array.isArray(d.trail)) {
        trails[id].setLatLngs(d.trail.map((p) => [p.lat, p.lng]));
      }
      const kmh = msToKmh(d.speed);
      markers[id].bindPopup(
        `<b>${esc(id)}</b><br/>` +
        `ความเร็ว: ${kmh != null ? kmh.toFixed(1) + " km/h" : "-"}<br/>` +
        `ความแม่นยำ: ${d.accuracy ? Math.round(d.accuracy) + " m" : "-"}<br/>` +
        `อัปเดต: ${fmtTime(d.updatedAt)}`
      );

      const visible = match;
      const el = markers[id].getElement();
      if (el) el.style.display = visible ? "" : "none";
      trails[id].setStyle({ opacity: visible ? 0.7 : 0 });
      if (!visible) return;
      shown++;

      const kmhTxt = kmh != null ? kmh.toFixed(1) + " km/h" : "-";
      const statusHtml = on
        ? '<span class="text-emerald-400 text-xs">● online</span>'
        : '<span class="text-slate-500 text-xs">offline</span>';
      const item = document.createElement("button");
      item.className = "w-full text-left px-5 py-3 hover:bg-slate-700/50 transition flex items-start gap-3" + (followId === id ? " bg-slate-700/60" : "");
      item.innerHTML =
        `<span style="background:${on ? color : '#64748b'}" class="w-3 h-3 rounded-full mt-1 shrink-0"></span>` +
        `<span class="flex-1 min-w-0">` +
        `  <span class="font-semibold block truncate">${esc(id)} ${statusHtml}</span>` +
        `  <span class="text-xs text-slate-400 block">${kmhTxt} · ↑${fmtTime(d.updatedAt)}</span>` +
        `  <span class="text-xs text-slate-500 block">🔋 ${d.battery != null ? d.battery + '%' : '-'} · ±${d.accuracy ? Math.round(d.accuracy) + 'm' : '-'}</span>` +
        `</span>`;
      item.addEventListener("click", () => {
        followId = id;
        map.setView([d.lat, d.lng], 16);
        markers[id].openPopup();
        render();
      });
      list.appendChild(item);
    });

    $("onlineCount").textContent = online;
    $("emptyState").style.display = shown === 0 ? "" : "none";

    if (followId && devices[followId]) {
      map.panTo([devices[followId].lat, devices[followId].lng], { animate: true });
    } else if (firstFit) {
      const pts = ids.filter((id) => devices[id]).map((id) => [devices[id].lat, devices[id].lng]);
      if (pts.length) { map.fitBounds(pts, { padding: [50, 50], maxZoom: 15 }); firstFit = false; }
    }
  }

  // ฟังการเปลี่ยนแปลงของทุกอุปกรณ์แบบเรียลไทม์
  onSnapshot(collection(db, COLLECTION), (snap) => {
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      if (d && d.lat != null && d.lng != null) devices[docSnap.id] = d;
    });
    render();
  }, (err) => {
    console.error(err);
    $("emptyState").innerHTML = "❌ เชื่อมต่อ Firestore ไม่ได้<br/>กรุณาตรวจ firebase-config.js และ Rules";
  });

  // รีเฟรชสถานะ online/offline ทุก 10 วินาที
  setInterval(render, 10000);

  $("filterId").addEventListener("input", render);
  $("clearFilter").addEventListener("click", () => { $("filterId").value = ""; followId = null; render(); });
}

// =============================================================
//  ROUTER
// =============================================================
if (page === "tracker") initTracker();
else if (page === "viewer") initViewer();
