function calculate() {

  let et0 = parseFloat(document.getElementById("et0").value);
  let kc = parseFloat(document.getElementById("kc").value);
  let area = parseFloat(document.getElementById("area").value);
  let hours = parseFloat(document.getElementById("hours").value);
  let system = document.getElementById("system").value;

  if (isNaN(et0) || isNaN(kc) || isNaN(area) || isNaN(hours)) {
    alert("⚠️ Fill all inputs");
    return;
  }

  // 🔴 تحديد الكفاءة حسب النظام
  let efficiency;

  if (system === "drip") {
    efficiency = 0.90;
  } else if (system === "sprinkler") {
    efficiency = 0.75;
  }

  // 🔹 الحسابات
  let etc = et0 * kc;

  let ir_gross = etc / efficiency;

  let volume = (ir_gross * area) / 1000;

  let flow = volume / hours;

  let zones = parseFloat(document.getElementById("zones").value);

if (isNaN(zones) || zones <= 0) {
  alert("⚠️ Enter number of zones");
  return;
}

// 🔹 تقسيم التصريف
let flow_zone = flow / zones;

// 🔹 تحويل إلى m³/s
let flow_m3s = flow_zone / 3600;

  // 🔹 قراءة السرعة
let velocity = parseFloat(document.getElementById("velocity").value);

if (isNaN(velocity)) {
  alert("⚠️ Enter velocity");
  return;
}

// 🔹 حساب القطر
let diameter = Math.sqrt((4 * flow_m3s) / (Math.PI * velocity));

  let emitter_flow = parseFloat(document.getElementById("emitter_flow").value);

if (!isNaN(emitter_flow)) {

  // تحويل L/hr → m³/hr
  let emitter_m3hr = emitter_flow / 1000;

  let emitters = flow_zone / emitter_m3hr;

  console.log("Number of Emitters:", emitters.toFixed(0));
}

  // 🔹 قراءة البيانات
let length = parseFloat(document.getElementById("length").value);
let elevation = parseFloat(document.getElementById("elevation").value);
let material = document.getElementById("material").value;

// 🔴 تحقق
if (isNaN(length) || isNaN(elevation)) {
  alert("⚠️ Enter pipe length and elevation");
  return;
}

// 🔹 تحديد C حسب المادة
let C;

if (material === "pvc") {
  C = 150;
} else if (material === "hdpe") {
  C = 140;
} else if (material === "steel") {
  C = 120;
}

// 🔹 حساب Head Loss
let hf = 10.67 * length * Math.pow(flow_m3s, 1.852) /
         (Math.pow(C, 1.852) * Math.pow(diameter, 4.87));

// 🔹 حساب TDH
let tdh = hf + elevation;

  // 🔹 كفاءة المضخة
let efficiency_pump = 0.75;

// 🔹 حساب القدرة الهيدروليكية
let power_watt = 1000 * 9.81 * flow_m3s * tdh;

// 🔹 القدرة الفعلية
let power_kw = (power_watt / efficiency_pump) / 1000;

  let alertMessage = "OK";

// 🔴 فحص السرعة
if (velocity < 0.6) {
  alertMessage = "⚠️ Low Velocity";
}

if (velocity > 2) {
  alertMessage = "⚠️ High Velocity";
}
  


// 🔹 عرض النتائج
document.querySelectorAll(".box span")[0].innerText = flow_zone.toFixed(2);
document.querySelectorAll(".box span")[1].innerText = hf.toFixed(2);
document.querySelectorAll(".box span")[2].innerText = tdh.toFixed(2);
document.querySelectorAll(".box span")[3].innerText = power_kw.toFixed(2);
document.querySelectorAll(".box span")[4].innerText = diameter.toFixed(3);
document.getElementById("alerts").innerText = alertMessage;
}
