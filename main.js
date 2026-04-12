// 🔹 Pump Curve (مثال لمضخة واحدة)
let pump_curve = [
  { flow: 0, head: 25 },
  { flow: 1, head: 22 },
  { flow: 2, head: 20 },
  { flow: 3, head: 17 },
  { flow: 4, head: 14 },
  { flow: 5, head: 10 }
];


// 🔹 قاعدة بيانات مضخات (مبسطة)
let pumps = [
  { name: "Pump A", flow: 1, head: 10 },
  { name: "Pump B", flow: 2, head: 20 },
  { name: "Pump C", flow: 5, head: 30 },
  { name: "Pump D", flow: 10, head: 40 }
];


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

  // 🔹 اختيار وضع التشغيل
let mode = document.getElementById("mode").value;

let flow_pump;

if (mode === "zone") {
  flow_pump = flow_zone;   // تشغيل قطاع واحد
} else {
  flow_pump = flow;        // تشغيل كامل النظام
}

  // 🔹 قراءة السرعة
let velocity = parseFloat(document.getElementById("velocity").value);

if (isNaN(velocity)) {
  alert("⚠️ Enter velocity");
  return;
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

// 🔹 حساب القطر
let diameter = Math.sqrt((4 * flow_m3s) / (Math.PI * velocity));

// 🔹 حساب Head Loss
let hf = 10.67 * length * Math.pow(flow_m3s, 1.852) /
         (Math.pow(C, 1.852) * Math.pow(diameter, 4.87));

// 🔹 حساب TDH
let tdh = hf + elevation;

// 🔹 قائمة الأقطار القياسية
let standard_diameters = [
  0.020, 0.025, 0.032, 0.040, 0.050,
  0.063, 0.075, 0.090, 0.110, 0.160
];

// 🔹 اختيار القطر القياسي
let std_diameter = standard_diameters.find(d => d >= diameter);

if (!std_diameter) {
  std_diameter = standard_diameters[standard_diameters.length - 1];
}

// 🔹 إعادة حساب Head Loss بالقطر القياسي
let hf_std = 10.67 * length * Math.pow(flow_m3s, 1.852) /
             (Math.pow(C, 1.852) * Math.pow(std_diameter, 4.87));

// 🔹 TDH جديد
let tdh_std = hf_std + elevation;

  // 🔹 حساب Head من منحنى المضخة
let pump_head = interpolateHead(Number(flow_pump), pump_curve);

let pump_status = "UNKNOWN";

if (pump_head === null) {
  pump_status = "❌ Flow outside pump curve";

} else if (pump_head < tdh_std) {
  pump_status = "❌ Pump NOT suitable (Head too low)";

} else {
  pump_status = "✔️ Pump Suitable";
}
  
document.getElementById("pump_head").innerText = 
  (pump_head !== null) ? pump_head.toFixed(2) : "Out";
  
document.getElementById("pump_status").innerText = pump_status;

// 🔹 حساب عدد النقاط
let emitter_flow = parseFloat(document.getElementById("emitter_flow").value);

if (!isNaN(emitter_flow)) {

  let emitter_m3hr = emitter_flow / 1000;

  let emitters = flow_zone / emitter_m3hr;

  console.log("Number of Emitters:", emitters.toFixed(0));
}

// 🔹 كفاءة المضخة
let efficiency_pump = 0.75;

// 🔹 القدرة الهيدروليكية
let flow_pump_m3s = flow_pump / 3600;

let power_watt = 1000 * 9.81 * flow_pump_m3s * tdh_std;

// 🔹 القدرة الفعلية
let power_kw = (power_watt / efficiency_pump) / 1000;

  // =========================
// 🔹 ENERGY CALCULATION
// =========================

let tariff = parseFloat(document.getElementById("tariff").value);

if (isNaN(tariff)) {
  tariff = 0.1; // default
}

// kWh/day
let energy = power_kw * hours;

// cost/day
let cost = energy * tariff;

// 🔹 Alerts
let alertMessage = "OK";

// Velocity
if (velocity < 0.6) {
  alertMessage = "⚠️ Low Velocity";
}

if (velocity > 2) {
  alertMessage = "⚠️ High Velocity";
}

// Diameter
if (diameter < 0.02) {
  alertMessage = "⚠️ Pipe Too Small";
}

// Head Loss
let hf_ratio = hf / tdh;

if (hf_ratio > 0.5) {
  alertMessage = "❌ High Head Loss";
} else if (hf_ratio > 0.3) {
  alertMessage = "⚠️ Moderate Head Loss";
}

  let recommendation = "✔️ Design is Good";

// 🔴 Diameter Recommendation
if (diameter < 0.02) {
  recommendation = "Increase pipe diameter to reduce losses";
}

// 🔴 Velocity Recommendation
if (velocity > 2) {
  recommendation = "Reduce velocity to avoid high friction losses";
}

if (velocity < 0.6) {
  recommendation = "Increase velocity to avoid sedimentation";
}

// 🔴 Head Loss Recommendation
if (hf_ratio > 0.5) {
  recommendation = "System inefficient: Increase pipe diameter";
} else if (hf_ratio > 0.3) {
  recommendation = "Moderate losses: Consider optimizing pipe size";
}

  // 🔹 سرعات مقترحة
let velocities = [0.6, 0.8, 1.0, 1.2, 1.5];

let best_velocity = velocity;
let best_diameter = std_diameter;
let min_hf = hf;
let best_energy = Infinity;
let best_cost = Infinity;
let best_config = "";

// 🔹 نجرب كل السرعات
for (let v of velocities) {

  let d_test = Math.sqrt((4 * flow_m3s) / (Math.PI * v));

  let std_d = standard_diameters.find(d => d >= d_test);

  if (!std_d) {
    std_d = standard_diameters[standard_diameters.length - 1];
  }

  let hf_test = 10.67 * length * Math.pow(flow_m3s, 1.852) /
                (Math.pow(C, 1.852) * Math.pow(std_d, 4.87));

  let tdh_test = hf_test + elevation;

  // 🔹 حساب الطاقة لكل خيار
  let flow_test_m3s = flow_pump / 3600;

  let power_test = (1000 * 9.81 * flow_test_m3s * tdh_test) / 1000 / 0.75;

  let energy_test = power_test * hours;

  let cost_test = energy_test * tariff;

  // 🔥 اختيار الأقل تكلفة
  if (cost_test < best_cost) {
    best_cost = cost_test;
    best_energy = energy_test;
    best_velocity = v;
    best_diameter = std_d;

    best_config = "Velocity: " + v + " m/s | Diameter: " + std_d;
  }
}

  
// 🔹 نستخدم القيم المحسوبة
let flow_req = flow_pump; // m³/hr
let head_req = tdh_std;   // الأفضل استخدام optimized

let pump_type = "";

// 🔹 تصنيف بسيط للمضخات
if (head_req < 10) {
  pump_type = "Low Head Pump (Horizontal)";
} else if (head_req < 30) {
  pump_type = "Centrifugal Pump";
} else {
  pump_type = "High Head Multistage Pump";
}

  
// 🔹 القيم المطلوبة
let required_flow = flow_pump;
let required_head = tdh_std;

// 🔹 البحث عن أفضل Pump
let best_pump = null;
let min_error = Infinity;

for (let pump of pumps) {

  let error = Math.abs(pump.flow - required_flow) +
              Math.abs(pump.head - required_head);

  if (error < min_error) {
    min_error = error;
    best_pump = pump;
  }
}

if (typeof std_d === "undefined") {
  console.error("std_d NOT DEFINED");
}


  
// 🔹 عرض النتائج
document.getElementById("flow_rate").innerText = flow_zone.toFixed(2);
document.getElementById("head_loss").innerText = hf.toFixed(2);
document.getElementById("tdh").innerText = tdh.toFixed(2);

document.getElementById("pump_flow").innerText = flow_pump.toFixed(2);

document.getElementById("pump_head").innerText =
  (pump_head !== null) ? pump_head.toFixed(2) : "Out";

document.getElementById("pump_status").innerText = pump_status;

document.getElementById("power").innerText = power_kw.toFixed(3);

document.getElementById("diameter").innerText = std_diameter.toFixed(3);

document.getElementById("std_diameter").innerText = std_diameter.toFixed(3);

document.getElementById("opt_velocity").innerText = best_velocity.toFixed(2);
document.getElementById("opt_diameter").innerText = best_diameter.toFixed(3);

document.getElementById("recommendation").innerText = recommendation;

document.getElementById("pump_select").innerText =
  "Flow: " + flow_pump.toFixed(2) +
" | Head: " + tdh_std.toFixed(2);
  
document.getElementById("recommendation").innerText =
  "💡 Best Design → " + best_config +
  " | Cost: $" + best_cost.toFixed(2) + "/day";
  
document.getElementById("energy").innerText = energy.toFixed(2);
document.getElementById("cost").innerText = cost.toFixed(2);
document.getElementById("ai_result").innerText =
  "Save up to " + ((cost - best_cost)/cost * 100).toFixed(1) + "% energy";
  
document.getElementById("pump_flow").innerText = flow_pump.toFixed(2);
}






function interpolateHead(flow, curve) {

  for (let i = 0; i < curve.length - 1; i++) {

    let p1 = curve[i];
    let p2 = curve[i + 1];

    if (flow >= p1.flow && flow <= p2.flow) {

      let head = p1.head +
        ((flow - p1.flow) / (p2.flow - p1.flow)) *
        (p2.head - p1.head);

      return head;
    }
  }

  // 🔥 إذا أقل من أول نقطة
  if (flow < curve[0].flow) {
    return curve[0].head;
  }

  // 🔥 إذا أكبر من آخر نقطة
  if (flow > curve[curve.length - 1].flow) {
    return curve[curve.length - 1].head;
  }

  return null;
}

