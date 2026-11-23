/* ====== PENGATURAN ====== */
const WA_ADMIN = "6281343554584"; // Nomor WhatsApp admin, format internasional tanpa + atau 0 di depan
const DEF_WASTE = {
  organik:   { name: "Organik",                 perKg: 2000, perBag: 6000  },
  anorganik: { name: "Anorganik / Daur Ulang",  perKg: 1500, perBag: 4500  },
  besar:     { name: "Sampah Besar / Pindahan", perKg: 5000, perBag: 25000 }
};
const DEF_PKG = {
  sekali:   { name: "Sekali Angkut",      tag: "Fleksibel", pickups: 1, fee: 10000, discount: 0,    unit: "sekali jemput",        d1: "Sekali jemput, tanpa komitmen", d3: "Cocok untuk sampah menumpuk" },
  mingguan: { name: "Langganan Mingguan", tag: "Hemat 10%", pickups: 1, fee: 5000,  discount: 0.10, unit: "per minggu",           d1: "Dijemput 1x tiap minggu",       d3: "" },
  bulanan:  { name: "Langganan Bulanan",  tag: "Hemat 20%", pickups: 4, fee: 5000,  discount: 0.20, unit: "per bulan (4x jemput)", d1: "4x jemput dalam sebulan",       d3: "" }
};
const STATUS = ["Menunggu", "Diproses", "Selesai", "Dibatalkan"];
/* ======================== */

const $ = id => document.getElementById(id);
const rp = n => "Rp " + Math.round(n).toLocaleString("id-ID");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const clone = o => JSON.parse(JSON.stringify(o));
const fmtDate = s => new Date(s + "T00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
function toast(m) { const t = $("toast"); t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2500); }

/* ---------- Data (localStorage) ---------- */
let WASTE = load("ba_waste", clone(DEF_WASTE)), PACKAGES = load("ba_pkg", clone(DEF_PKG));
if (!localStorage.getItem("ba_users")) save("ba_users", [{ id: "u0", name: "Administrator", email: "admin@bersihangkut.id", phone: "", pass: "admin123", role: "admin" }]);
if (!localStorage.getItem("ba_orders")) save("ba_orders", [
  { id: "BA-100231", uid: "demo", name: "Budi Santoso", phone: "081234567890", address: "Jl. Sam Ratulangi No. 12, Gorontalo", date: "2026-11-10", time: "08:00", pkg: "mingguan", type: "organik", qty: 12, unit: "kg", total: 26100, status: "Selesai" },
  { id: "BA-100232", uid: "demo", name: "Siti Rahma", phone: "085211223344", address: "Jl. Kenanga No. 5, Kota Tengah", date: "2026-11-17", time: "09:30", pkg: "bulanan", type: "anorganik", qty: 8, unit: "kg", total: 55680, status: "Diproses" },
  { id: "BA-100233", uid: "demo", name: "Andi Pratama", phone: "082345678901", address: "Perum Griya Asri Blok C3", date: "2026-11-18", time: "14:00", pkg: "sekali", type: "besar", qty: 20, unit: "kg", total: 110000, status: "Menunggu" }
]);
const users = () => load("ba_users", []), orders = () => load("ba_orders", []);
const curUser = () => users().find(u => u.id === load("ba_session", null));
const pkgInfo = p => [p.d1, `Biaya jemput ${rp(p.fee)}${p.pickups > 1 ? " per jemputan" : ""}`, p.discount ? `Diskon ${Math.round(p.discount * 100)}% dari total` : p.d3].filter(Boolean);

/* ---------- Auth ---------- */
document.querySelectorAll("[data-auth]").forEach(b => b.addEventListener("click", () => {
  const reg = b.dataset.auth === "reg";
  $("f-login").hidden = reg; $("f-reg").hidden = !reg;
  $("sw-login").classList.toggle("on", !reg); $("sw-reg").classList.toggle("on", reg);
}));
$("f-login").addEventListener("submit", e => {
  e.preventDefault();
  const em = $("l-email").value.trim().toLowerCase(), pw = $("l-pass").value;
  const u = users().find(x => x.email === em && x.pass === pw);
  if (!u) { $("l-err").textContent = "Email atau kata sandi salah."; return; }
  $("l-err").textContent = ""; save("ba_session", u.id); e.target.reset(); enter();
});
$("f-reg").addEventListener("submit", e => {
  e.preventDefault();
  const v = id => $(id).value.trim(), em = v("r-email").toLowerCase(), ph = v("r-phone").replace(/[\s-]/g, "");
  let m = "";
  if (v("r-name").length < 3) m = "Nama minimal 3 huruf.";
  else if (!/^\S+@\S+\.\S+$/.test(em)) m = "Format email belum benar.";
  else if (!/^(\+62|62|0)8\d{8,12}$/.test(ph)) m = "Masukkan nomor WhatsApp yang valid, misalnya 081234567890.";
  else if ($("r-pass").value.length < 6) m = "Kata sandi minimal 6 karakter.";
  else if ($("r-pass").value !== $("r-pass2").value) m = "Kata sandi dan ulangannya tidak sama.";
  else if (users().some(x => x.email === em)) m = "Email ini sudah terdaftar. Silakan masuk.";
  $("r-err").textContent = m; if (m) return;
  const u = { id: "u" + Date.now(), name: v("r-name"), email: em, phone: ph, pass: $("r-pass").value, role: "user" };
  save("ba_users", [...users(), u]); save("ba_session", u.id); e.target.reset(); enter(); toast("Akun dibuat. Selamat datang!");
});
document.querySelectorAll(".logout").forEach(b => b.addEventListener("click", () => { localStorage.removeItem("ba_session"); enter(); }));

function enter() {
  const u = curUser();
  $("auth").hidden = !!u; $("user").hidden = !u || u.role === "admin"; $("admin").hidden = !u || u.role !== "admin";
  window.scrollTo(0, 0);
  if (!u) return;
  if (u.role === "admin") { showAdm("ringkasan"); return; }
  $("who").textContent = u.name; $("hello").textContent = "Halo, " + u.name.split(" ")[0] + "!";
  $("name").value = u.name; $("phone").value = u.phone || "";
  showTab("dashboard");
}

/* ---------- Tab pengguna ---------- */
function showTab(n) {
  document.querySelectorAll(".tab").forEach(t => t.hidden = t.id !== "tab-" + n);
  document.querySelectorAll("#menu [data-tab]").forEach(a => a.classList.toggle("on", a.dataset.tab === n));
  $("menu").classList.remove("open"); $("burger").setAttribute("aria-expanded", false);
  if (n === "dashboard") renderUserDash();
  window.scrollTo(0, 0);
}
document.addEventListener("click", e => { const a = e.target.closest("[data-tab]"); if (a) { e.preventDefault(); showTab(a.dataset.tab); } });
$("burger").addEventListener("click", () => { const o = $("menu").classList.toggle("open"); $("burger").setAttribute("aria-expanded", o); });

function ordersTable(list, cols) {
  if (!list.length) return `<div class="empty">Belum ada pesanan.</div>`;
  return `<table><thead><tr>${cols.map(c => `<th>${c[0]}</th>`).join("")}</tr></thead><tbody>${list.map(o => `<tr>${cols.map(c => `<td>${c[1](o)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
const badge = s => `<span class="badge s-${s}">${s}</span>`;
function renderUserDash() {
  const u = curUser(), mine = orders().filter(o => o.uid === u.id).reverse();
  const act = mine.filter(o => o.status === "Menunggu" || o.status === "Diproses").length;
  $("rates").innerHTML = Object.values(WASTE).map(w => `<li><span>${esc(w.name)}</span><b>${rp(w.perKg)}/kg</b></li>`).join("") + `<li><span>Jam jemput</span><b>06.00 – 18.00</b></li>`;
  $("u-stats").innerHTML = [["Total pesanan", mine.length], ["Pesanan aktif", act], ["Selesai", mine.filter(o => o.status === "Selesai").length], ["Total estimasi biaya", rp(mine.filter(o => o.status !== "Dibatalkan").reduce((s, o) => s + o.total, 0))]]
    .map(s => `<div class="stat"><span>${s[0]}</span><b>${s[1]}</b></div>`).join("");
  $("u-orders").innerHTML = ordersTable(mine, [["No. pesanan", o => o.id], ["Tanggal", o => fmtDate(o.date) + " " + o.time], ["Paket", o => esc(PACKAGES[o.pkg]?.name || o.pkg)], ["Jenis", o => esc(WASTE[o.type]?.name || o.type)], ["Estimasi", o => rp(o.total)], ["Status", o => badge(o.status)]]);
}

/* ---------- Kalkulator ---------- */
const state = { type: "organik", unit: "kg", qty: 10, pkg: "sekali" };
function fillOptions() {
  const oP = Object.entries(PACKAGES).map(([k, p]) => `<option value="${k}">${esc(p.name)}</option>`).join("");
  const oT = Object.entries(WASTE).map(([k, w]) => `<option value="${k}">${esc(w.name)}</option>`).join("");
  ["calc-package", "f-package"].forEach(id => $(id).innerHTML = oP);
  ["type", "f-type"].forEach(id => $(id).innerHTML = oT);
  $("cards").innerHTML = Object.entries(PACKAGES).map(([k, p]) => `
    <button type="button" class="card" data-pkg="${k}" aria-pressed="false">
      <span class="tag">${esc(p.tag)}</span><h3>${esc(p.name)}</h3>
      <div class="price">${rp(p.fee)} <small>biaya jemput</small></div>
      <ul>${pkgInfo(p).map(i => `<li>${esc(i)}</li>`).join("")}</ul></button>`).join("");
}
function compute() {
  const w = WASTE[state.type], p = PACKAGES[state.pkg], qty = Math.max(0, Number(state.qty) || 0);
  const rate = state.unit === "kg" ? w.perKg : w.perBag, wasteCost = qty * rate;
  const subtotal = (wasteCost + p.fee) * p.pickups, discount = subtotal * p.discount;
  return { w, p, qty, rate, wasteCost, subtotal, discount, total: subtotal - discount };
}
function render() {
  const c = compute(), unitLbl = state.unit === "kg" ? "kg" : "kantong";
  let html = `<div><span>${c.qty} ${unitLbl} × ${rp(c.rate)}</span><span>${rp(c.wasteCost)}</span></div><div><span>Biaya jemput</span><span>${rp(c.p.fee)}</span></div>`;
  if (c.p.pickups > 1) html += `<div><span>Jumlah jemputan</span><span>${c.p.pickups}x</span></div>`;
  if (c.p.discount) html += `<div class="disc"><span>Diskon ${Math.round(c.p.discount * 100)}%</span><span>− ${rp(c.discount)}</span></div>`;
  html += `<div><span>Total ${c.p.unit}</span><span><b>${rp(c.total)}</b></span></div>`;
  ["", "2"].forEach(s => { $("total" + s).textContent = rp(c.total); $("lines" + s).innerHTML = html; });
  $("type").value = $("f-type").value = state.type;
  $("calc-package").value = $("f-package").value = state.pkg;
  document.querySelectorAll(".card").forEach(el => { const on = el.dataset.pkg === state.pkg; el.classList.toggle("active", on); el.setAttribute("aria-pressed", on); });
  $("qty-label").textContent = state.unit === "kg" ? "Perkiraan berat (kg)" : "Jumlah kantong sampah";
  $("qty-hint").textContent = state.unit === "kg" ? "Satu kantong sampah rumah tangga rata-rata 3–5 kg." : "Ukuran kantong standar (sekitar 60 × 100 cm).";
}
$("cards").addEventListener("click", e => { const b = e.target.closest(".card"); if (b) { state.pkg = b.dataset.pkg; render(); } });
["type", "f-type"].forEach(id => $(id).addEventListener("change", e => { state.type = e.target.value; render(); }));
["calc-package", "f-package"].forEach(id => $(id).addEventListener("change", e => { state.pkg = e.target.value; render(); }));
$("qty").addEventListener("input", e => { state.qty = e.target.value; render(); });
document.querySelectorAll('input[name="unit"]').forEach(r => r.addEventListener("change", e => { state.unit = e.target.value; render(); }));

const today = new Date(); today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
$("date").min = $("date").value = today.toISOString().slice(0, 10);
$("year").textContent = new Date().getFullYear();

/* ---------- Validasi & kirim ---------- */
function setErr(f, msg) { document.querySelector(`.err[data-for="${f}"]`).textContent = msg || ""; $(f).classList.toggle("invalid", !!msg); return !msg; }
function validate() {
  const v = id => $(id).value.trim(), phone = v("phone").replace(/[\s-]/g, "");
  return [
    setErr("name", v("name").length < 3 ? "Nama minimal 3 huruf." : ""),
    setErr("phone", /^(\+62|62|0)8\d{8,12}$/.test(phone) ? "" : "Masukkan nomor WhatsApp yang valid, misalnya 081234567890."),
    setErr("address", v("address").length < 10 ? "Alamat terlalu singkat. Tambahkan jalan dan nomor rumah." : ""),
    setErr("date", v("date") ? "" : "Pilih tanggal penjemputan."),
    setErr("time", v("time") && v("time") >= "06:00" && v("time") <= "18:00" ? "" : "Pilih jam antara 06.00 dan 18.00.")
  ].every(Boolean);
}
["name", "phone", "address", "date", "time"].forEach(id => $(id).addEventListener("input", () => setErr(id, "")));
$("send").addEventListener("click", () => {
  if (!validate()) { const f = document.querySelector(".invalid"); if (f) f.focus(); return; }
  const c = compute(), v = id => $(id).value.trim(), u = curUser();
  const id = "BA-" + String(Date.now()).slice(-6);
  save("ba_orders", [...orders(), { id, uid: u.id, name: v("name"), phone: v("phone"), address: v("address"), date: v("date"), time: v("time"), pkg: state.pkg, type: state.type, qty: c.qty, unit: state.unit, total: c.total, status: "Menunggu" }]);
  const tgl = new Date($("date").value + "T00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const unitLbl = state.unit === "kg" ? "kg" : "kantong";
  const lines = ["*PESANAN PENJEMPUTAN SAMPAH*", `No. pesanan: ${id}`, "", "*Data Pemesan*", `Nama: ${v("name")}`, `WhatsApp: ${v("phone")}`, `Alamat: ${v("address")}`, "",
    "*Jadwal*", `Tanggal: ${tgl}`, `Jam: ${v("time")} WITA`, "", "*Detail Layanan*", `Paket: ${c.p.name}`, `Jenis sampah: ${c.w.name}`, `Perkiraan jumlah: ${c.qty} ${unitLbl}`, "",
    "*Estimasi Biaya*", `Tarif sampah: ${rp(c.wasteCost)}`, `Biaya jemput: ${rp(c.p.fee)}${c.p.pickups > 1 ? " × " + c.p.pickups : ""}`,
    c.p.discount ? `Diskon ${Math.round(c.p.discount * 100)}%: − ${rp(c.discount)}` : null, `*Total ${c.p.unit}: ${rp(c.total)}*`];
  if (v("note")) lines.push("", `Catatan: ${v("note")}`);
  lines.push("", "Mohon konfirmasinya. Terima kasih.");
  window.open(`https://wa.me/${WA_ADMIN}?text=${encodeURIComponent(lines.filter(l => l !== null).join("\n"))}`, "_blank", "noopener");
  $("address").value = ""; $("note").value = "";
  toast("Pesanan " + id + " tersimpan."); showTab("dashboard");
});

/* ---------- Admin ---------- */
function showAdm(n) {
  document.querySelectorAll(".adm-sec").forEach(s => s.hidden = s.id !== "adm-" + n);
  document.querySelectorAll("[data-adm]").forEach(b => b.classList.toggle("on", b.dataset.adm === n));
  const R = { ringkasan: renderAdmDash, pesanan: renderAdmOrders, pengguna: renderAdmUsers, tarif: renderAdmTarif }; R[n]();
  window.scrollTo(0, 0);
}
document.querySelectorAll("[data-adm]").forEach(b => b.addEventListener("click", () => showAdm(b.dataset.adm)));
const admCols = [["No.", o => o.id], ["Pemesan", o => esc(o.name)], ["Tanggal", o => fmtDate(o.date) + " " + o.time], ["Paket", o => esc(PACKAGES[o.pkg]?.name || o.pkg)], ["Estimasi", o => rp(o.total)], ["Status", o => badge(o.status)]];
function renderAdmDash() {
  const os = orders(), us = users().filter(u => u.role === "user");
  $("adm-hello").textContent = "Selamat datang, " + curUser().name + ". Ini ringkasan layanan hari ini.";
  $("a-stats").innerHTML = [["Total pesanan", os.length], ["Menunggu konfirmasi", os.filter(o => o.status === "Menunggu").length], ["Pendapatan (selesai)", rp(os.filter(o => o.status === "Selesai").reduce((s, o) => s + o.total, 0))], ["Pengguna terdaftar", us.length]]
    .map(s => `<div class="stat"><span>${s[0]}</span><b>${s[1]}</b></div>`).join("");
  const max = Math.max(1, ...STATUS.map(s => os.filter(o => o.status === s).length));
  $("a-bars").innerHTML = STATUS.map(s => { const n = os.filter(o => o.status === s).length; return `<div class="bar"><span>${s}</span><i style="width:${n / max * 60}%;min-width:${n ? 8 : 0}px"></i><b>${n}</b></div>`; }).join("");
  $("a-recent").innerHTML = ordersTable(os.slice(-5).reverse(), admCols);
}
function renderAdmOrders() {
  const f = $("flt").value, list = orders().filter(o => !f || o.status === f).reverse();
  $("a-orders").innerHTML = ordersTable(list, [admCols[0], admCols[1], ["WhatsApp", o => esc(o.phone)], ["Alamat", o => esc(o.address)], admCols[2], admCols[3], ["Jenis / jumlah", o => `${esc(WASTE[o.type]?.name || o.type)} · ${o.qty} ${o.unit === "kg" ? "kg" : "kantong"}`], admCols[4],
    ["Status", o => `<select data-st="${o.id}" aria-label="Status ${o.id}">${STATUS.map(s => `<option${s === o.status ? " selected" : ""}>${s}</option>`).join("")}</select>`],
    ["", o => `<button type="button" class="btn danger sm" data-del="${o.id}">Hapus</button>`]]);
}
$("flt").addEventListener("change", renderAdmOrders);
$("a-orders").addEventListener("change", e => { const id = e.target.dataset.st; if (id) { save("ba_orders", orders().map(o => o.id === id ? { ...o, status: e.target.value } : o)); toast("Status diperbarui."); } });
$("a-orders").addEventListener("click", e => { const id = e.target.dataset.del; if (id && confirm("Hapus pesanan " + id + "?")) { save("ba_orders", orders().filter(o => o.id !== id)); renderAdmOrders(); } });
function renderAdmUsers() {
  const us = users().filter(u => u.role === "user");
  $("a-users").innerHTML = us.length ? `<table><thead><tr><th>Nama</th><th>Email</th><th>WhatsApp</th><th>Pesanan</th><th></th></tr></thead><tbody>${us.map(u => `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.phone)}</td><td>${orders().filter(o => o.uid === u.id).length}</td><td><button type="button" class="btn danger sm" data-udel="${u.id}">Hapus</button></td></tr>`).join("")}</tbody></table>` : `<div class="empty">Belum ada pengguna yang mendaftar.</div>`;
}
$("a-users").addEventListener("click", e => { const id = e.target.dataset.udel; if (id && confirm("Hapus akun ini beserta pesanannya?")) { save("ba_users", users().filter(u => u.id !== id)); save("ba_orders", orders().filter(o => o.uid !== id)); renderAdmUsers(); } });
function renderAdmTarif() {
  $("a-waste").innerHTML = `<table><thead><tr><th>Jenis sampah</th><th>Tarif per kg</th><th>Tarif per kantong</th></tr></thead><tbody>${Object.entries(WASTE).map(([k, w]) => `<tr><td>${esc(w.name)}</td><td><input type="number" min="0" data-w="${k}" data-f="perKg" value="${w.perKg}"></td><td><input type="number" min="0" data-w="${k}" data-f="perBag" value="${w.perBag}"></td></tr>`).join("")}</tbody></table>`;
  $("a-pkg").innerHTML = `<table><thead><tr><th>Paket</th><th>Biaya jemput</th><th>Diskon (%)</th></tr></thead><tbody>${Object.entries(PACKAGES).map(([k, p]) => `<tr><td>${esc(p.name)}</td><td><input type="number" min="0" data-p="${k}" data-f="fee" value="${p.fee}"></td><td><input type="number" min="0" max="90" data-p="${k}" data-f="discount" value="${Math.round(p.discount * 100)}"></td></tr>`).join("")}</tbody></table>`;
}
$("save-tarif").addEventListener("click", () => {
  document.querySelectorAll("[data-w]").forEach(i => WASTE[i.dataset.w][i.dataset.f] = Math.max(0, Number(i.value) || 0));
  document.querySelectorAll("[data-p]").forEach(i => { const v = Math.max(0, Number(i.value) || 0); PACKAGES[i.dataset.p][i.dataset.f] = i.dataset.f === "discount" ? Math.min(v, 90) / 100 : v; });
  Object.values(PACKAGES).forEach(p => p.tag = p.discount ? "Hemat " + Math.round(p.discount * 100) + "%" : "Fleksibel");
  save("ba_waste", WASTE); save("ba_pkg", PACKAGES); fillOptions(); render(); toast("Tarif disimpan.");
});
$("reset-tarif").addEventListener("click", () => { WASTE = clone(DEF_WASTE); PACKAGES = clone(DEF_PKG); save("ba_waste", WASTE); save("ba_pkg", PACKAGES); fillOptions(); render(); renderAdmTarif(); toast("Tarif dikembalikan."); });

fillOptions(); render(); enter();
