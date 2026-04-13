// 🔹 Pump Curve (مثال لمضخة واحدة)
let pump_curve = [
  { flow: 0, head: 14 },
  { flow: 2, head: 13 },
  { flow: 4, head: 11 },
  { flow: 6, head: 9 },
  { flow: 8, head: 6 },
  { flow: 10, head: 2 }
];


// =========================
// 🔹 PUMP LIBRARY
// =========================

let pumps = [

  {
    name: "Pump A",
    curve: [
      { flow: 0, head: 14 },
      { flow: 2, head: 13 },
      { flow: 4, head: 12 },
      { flow: 6, head: 10 },
      { flow: 8, head: 7 },
      { flow: 10, head: 3 }
    ]
  },

  {
    name: "Pump B",
    curve: [
      { flow: 0, head: 18 },
      { flow: 2, head: 17 },
      { flow: 4, head: 15 },
      { flow: 6, head: 13 },
      { flow: 8, head: 10 },
      { flow: 10, head: 6 }
    ]
  },

  {
    name: "Pump C",
    curve: [
      { flow: 0, head: 10 },
      { flow: 2, head: 9 },
      { flow: 4, head: 8 },
      { flow: 6, head: 6 },
      { flow: 8, head: 4 },
      { flow: 10, head: 2 }
    ]
  }

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

    // =========================
// 🔹 ZONE OPTIMIZATION
// =========================

let best_zone = 1;
let best_zone_score = Infinity;

for (let z = 1; z <= 6; z++) {

  // 🔹 تقسيم التدفق
  let flow_test = flow_zone * z; // total flow
  let flow_per_zone = flow_test / z;

  let flow_m3s_test = flow_per_zone / 3600;

  // 🔹 قطر
  let d_test = Math.sqrt((4 * flow_m3s_test) / (Math.PI * velocity));

  let std_d = standard_diameters.find(d => d >= d_test);
  if (!std_d) std_d = standard_diameters[standard_diameters.length - 1];

  // 🔹 Head Loss
  let hf_test = 10.67 * length * Math.pow(flow_m3s_test, 1.852) /
                (Math.pow(C, 1.852) * Math.pow(std_d, 4.87));

  let tdh_test = hf_test + elevation;

  // 🔹 اختيار Pump
  let best_pump_local = null;

  for (let pump of pumps) {
    let pump_head = interpolateHead(flow_per_zone, pump.curve);

    if (pump_head >= tdh_test) {
      best_pump_local = pump;
      break;
    }
  }

  if (!best_pump_local) continue;

  // 🔹 Power
  let power_test = (1000 * 9.81 * flow_m3s_test * tdh_test) / 1000 / 0.75;

  let energy_test = power_test * hours;

  // 🔹 BEP
  let mid = Math.floor(best_pump_local.curve.length / 2);
  let bep_flow = best_pump_local.curve[mid].flow;

  let diff = Math.abs(flow_per_zone - bep_flow);

  // 🔥 Score (Energy + BEP)
  let score = energy_test + diff;

  if (score < best_zone_score) {
    best_zone_score = score;
    best_zone = z;
  }
}


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

// =========================
// 🔹 SELECT BEST PUMP (لازم يكون هنا قبل أي استخدام)
// =========================
let best_pump = null;
let best_score = Infinity;

for (let pump of pumps) {

  let mid = Math.floor(pump.curve.length / 2);
  let bep_flow = pump.curve[mid].flow;

  let diff = Math.abs(flow_pump - bep_flow);

  let pump_head_test = interpolateHead(flow_pump, pump.curve);

  if (pump_head_test >= tdh_std) {
    if (diff < best_score) {
      best_score = diff;
      best_pump = pump;
    }
  }
}

// 🔴 مهم جدًا
if (!best_pump) {
  alert("❌ No suitable pump found");
  return;
}

// =========================
// 🔹 الآن فقط نستخدم best_pump
// =========================

// 🔹 حساب Head من منحنى المضخة
let pump_head = interpolateHead(flow_pump, best_pump.curve);

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

// =========================
// 🔹 حساب عدد النقاط
// =========================
let emitter_flow = parseFloat(document.getElementById("emitter_flow").value);

if (!isNaN(emitter_flow)) {

  let emitter_m3hr = emitter_flow / 1000;

  let emitters = flow_zone / emitter_m3hr;

  console.log("Number of Emitters:", emitters.toFixed(0));
}

// =========================
// 🔹 POWER
// =========================
let efficiency_pump = 0.75;

let flow_pump_m3s = flow_pump / 3600;

let power_watt = 1000 * 9.81 * flow_pump_m3s * tdh_std;

let power_kw = (power_watt / efficiency_pump) / 1000;

// =========================
// 🔹 ENERGY
// =========================
let tariff = parseFloat(document.getElementById("tariff").value);

if (isNaN(tariff)) {
  tariff = 0.1;
}

let energy = power_kw * hours;
let cost = energy * tariff;

// =========================
// 🔹 ALERTS
// =========================
let alertMessage = "OK";

if (velocity < 0.6) alertMessage = "⚠️ Low Velocity";
if (velocity > 2) alertMessage = "⚠️ High Velocity";

let hf_ratio = hf_std / tdh_std;

if (hf_ratio > 0.5) {
  alertMessage = "❌ High Head Loss";
} else if (hf_ratio > 0.3) {
  alertMessage = "⚠️ Moderate Head Loss";
}

// =========================
// 🔹 RECOMMENDATION
// =========================
let recommendation = "✔️ Design is Good";

if (std_diameter < 0.02) {
  recommendation = "Increase pipe diameter";
}

if (velocity > 2) {
  recommendation = "Reduce velocity";
}

if (velocity < 0.6) {
  recommendation = "Increase velocity";
}

if (hf_ratio > 0.5) {
  recommendation = "System inefficient: Increase diameter";
} else if (hf_ratio > 0.3) {
  recommendation = "Moderate losses: Optimize pipe size";
}

// =========================
// 🔹 OPTIMIZATION
// =========================
let velocities = [0.6, 0.8, 1.0, 1.2, 1.5];

let best_velocity = velocity;
let best_diameter = std_diameter;
let best_energy = Infinity;
let best_cost = Infinity;
let best_config = "";

for (let v of velocities) {

  let d_test = Math.sqrt((4 * flow_m3s) / (Math.PI * v));

  let std_d = standard_diameters.find(d => d >= d_test);

  if (!std_d) {
    std_d = standard_diameters[standard_diameters.length - 1];
  }

  let hf_test = 10.67 * length * Math.pow(flow_m3s, 1.852) /
                (Math.pow(C, 1.852) * Math.pow(std_d, 4.87));

  let tdh_test = hf_test + elevation;

  let flow_test_m3s = flow_pump / 3600;

  let power_test = (1000 * 9.81 * flow_test_m3s * tdh_test) / 1000 / 0.75;

  let energy_test = power_test * hours;

  let cost_test = energy_test * tariff;

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



if (typeof std_d === "undefined") {
  console.error("std_d NOT DEFINED");
}

let intersection_flow = 0;
let intersection_head = 0;
let min_diff = Infinity;

  // =========================
// 🔹 PUMP CURVE GRAPH
// =========================

let ctx = document.getElementById("pumpChart").getContext("2d");

// تجهيز بيانات المنحنى
let curve_flow = [];
let curve_head = [];

for (let q = 0; q <= 5; q += 0.1) {
  curve_flow.push(q);
  curve_head.push(interpolateHead(q, pump_curve));
}
  
// =========================
// 🔹 BEP (Best Efficiency Point)
// =========================

let bep_index = Math.floor(best_pump.curve.length / 2);
let bep_flow = best_pump.curve[bep_index].flow;
let bep_head = best_pump.curve[bep_index].head;;
  
// =========================
// 🔹 SYSTEM CURVE
// =========================

let system_curve = [];

for (let q of curve_flow) {

  let q_m3s = q / 3600;

  let h_system = elevation +
    (10.67 * length * Math.pow(q_m3s, 1.852)) /
    (Math.pow(C, 1.852) * Math.pow(std_diameter, 4.87));

  system_curve.push(h_system);
}

  // =========================
// 🔹 FIND INTERSECTION
// =========================



for (let i = 0; i < curve_flow.length; i++) {

  let hp = curve_head[i];
  let hs = system_curve[i];

  let diff = Math.abs(hp - hs);

  if (diff < min_diff) {
    min_diff = diff;
    intersection_flow = curve_flow[i];
    intersection_head = hp;
  }
}
  
// نقطة التشغيل
let operating_point = {
  x: intersection_flow,
y: intersection_head
};

// حذف الرسم القديم (مهم)
if (window.chart) {
  window.chart.destroy();
}

  // =========================
// 🔹 BEP ANALYSIS
// =========================

let diff_flow = Math.abs(flow_pump - bep_flow);

let bep_status = "";

if (diff_flow < 1) {
  bep_status = "✔️ Near BEP (Optimal)";
} else if (diff_flow < 2) {
  bep_status = "⚠️ Acceptable";
} else {
  bep_status = "❌ Far from BEP";
}
// =========================
// 🔹 UPDATE REAL VALUES
// =========================

flow_pump = intersection_flow;
tdh = intersection_head;
// رسم جديد
window.chart = new Chart(ctx, {
  type: "line",

  data: {
    labels: curve_flow,
    datasets: [
      {
        label: "Pump Curve",
        data: curve_head,
        borderWidth: 3,
        tension: 0.4,
        fill: false,
        borderColor: "orange"
      },
      {
  label: "BEP",
  data: [{
    x: bep_flow,
    y: bep_head
  }],
  type: "scatter",
  pointRadius: 7,
  pointBackgroundColor: "green"
},
      {
        label: "System Curve",
        data: system_curve,
        borderDash: [5, 5],
        borderWidth: 2,
        fill: false
      },
      {
        label: "Operating Point",
        data: [{
          x: flow_pump,
          y: tdh
        }],
        type: "scatter",
        pointRadius: 6,
        pointBackgroundColor: "red"
      }
    ]
  }, // 🔴 فاصلة مهمة هنا

  options: {
    scales: {
      x: {
        title: {
          display: true,
          text: "Flow (m³/hr)"
        }
      },
      y: {
        title: {
          display: true,
          text: "Head (m)"
        }
      }
    }
  }

}); // 🔴 هذا القوس + السيمي كولون كانوا ناقصين
  
  
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

if (best_pump) {

  document.getElementById("pump_select").innerText =
    best_pump.name +
    " | Flow: " + flow_pump.toFixed(2) +
    " | Head: " + tdh.toFixed(2);

} else {

  document.getElementById("pump_select").innerText =
    "❌ No Suitable Pump";
}
  
document.getElementById("recommendation").innerText =
  "💡 Best Design → " + best_config +
  " | Cost: $" + best_cost.toFixed(2) + "/day";
  
document.getElementById("energy").innerText = energy.toFixed(2);
document.getElementById("cost").innerText = cost.toFixed(2);
document.getElementById("ai_result").innerText =
  "Save up to " + ((cost - best_cost)/cost * 100).toFixed(1) + "% energy";
  
document.getElementById("bep_status").innerText = bep_status;
document.getElementById("pump_flow").innerText = flow_pump.toFixed(2);
document.getElementById("opt_zones").innerText = best_zone;
  
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

