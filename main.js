// =========================
// 🔹 GLOBAL DATA
// =========================

function setText(id, value) {
  let el = document.getElementById(id);

  if (!el) {
    console.warn("Missing element:", id);
    return;
  }

  el.innerText = value;
}


let standard_diameters = [
  0.020, 0.025, 0.032, 0.040, 0.050,
  0.063, 0.075, 0.090, 0.110, 0.160
];

let pumps = [

  {
    name: "Pump A (Low)",
    curve: [
      { flow: 0, head: 16 },
      { flow: 2, head: 15 },
      { flow: 4, head: 13.5 },
      { flow: 6, head: 11 },
      { flow: 8, head: 8 },
      { flow: 10, head: 5 }
    ]
  },

  {
    name: "Pump B (Medium)",
    curve: [
      { flow: 0, head: 22 },
      { flow: 3, head: 20 },
      { flow: 6, head: 17 },
      { flow: 9, head: 13 },
      { flow: 12, head: 9 },
      { flow: 15, head: 5 }
    ]
  },

  {
    name: "Pump C (High)",
    curve: [
      { flow: 0, head: 30 },
      { flow: 5, head: 27 },
      { flow: 10, head: 23 },
      { flow: 15, head: 18 },
      { flow: 20, head: 12 },
      { flow: 25, head: 6 }
    ]
  },

  {
    name: "Pump D (High Flow)",
    curve: [
      { flow: 0, head: 20 },
      { flow: 10, head: 18 },
      { flow: 20, head: 15 },
      { flow: 30, head: 11 },
      { flow: 40, head: 7 },
      { flow: 50, head: 3 }
    ]
  }

];

// =========================
// 🔹 MAIN ENGINE
// =========================

function calculate() {

  let input = getInputs();
  if (!input) return;

  let flow = calculateFlow(input);
  let hyd = calculateHydraulics(flow, input);

let pump = selectPump(hyd, flow);

// 🔥 FALLBACK (ضعه هنا مباشرة)
if (!pump) {
  console.warn("⚠️ No exact pump match — fallback used");

  let best = pumps.reduce((best, p) => {
    let h = interpolateHead(flow.per_zone, p.curve);

    if (!best || h > best.head) {
      return { pump: p, head: h };
    }
    return best;
  }, null);

  pump = best ? best.pump : null;
}

  let energy = calculateEnergy(hyd, flow, input);
  let opt = optimizeSystem(input, flow);
  
if (pump) {
  drawFullCurve(pump, flow, hyd, input);
}
  drawFullCurve(pump, flow, hyd, input);
  
let system = generateSystemCurve(flow, input);
let op = findOperatingPoint(pump, system);

let mid = Math.floor(pump.curve.length / 2);
let bep = pump.curve[mid];

let bepStatus = getBEPStatus(op, bep);
updateUI(flow, hyd, pump, energy, opt, input, bepStatus);
  // 🔥 Generate Analysis
let ai = runAIAnalysis(flow, hyd, pump, op, input, energy);

 // عرض النتائج
setText("analysis_text", ai.text);
setText("ai_score", ai.score + " / 100");
setText("ai_status", ai.status);
  
// 🔥 Show in UI
setText("analysis_text", analysis);
  

  // حفظ التصميم
  window.current_design = {
    zones: input.zones,
    velocity: input.velocity,
    diameter: hyd.diameter,
    pump: pump.name,
    energy: energy.energy
  };

}


// =========================
// 🔹 INPUTS
// =========================

function getInputs() {

  let data = {
    et0: parseFloat(document.getElementById("et0").value),
    kc: parseFloat(document.getElementById("kc").value),
    area: parseFloat(document.getElementById("area").value),
    hours: parseFloat(document.getElementById("hours").value),
    zones: parseInt(document.getElementById("zones").value),
    velocity: parseFloat(document.getElementById("velocity").value),
    pipe_length: parseFloat(document.getElementById("length").value), // ✅
    elevation: parseFloat(document.getElementById("elevation").value),
    material: document.getElementById("material").value,
    tariff: parseFloat(document.getElementById("tariff").value)
  };

  for (let key in data) {
    if (key !== "material" && (isNaN(data[key]) || data[key] <= 0)) {
      alert("⚠️ Invalid input: " + key);
      return null;
    }
  }

  return data;
}

// =========================
// 🔹 FLOW
// =========================

function calculateFlow(input) {

  let efficiency = 0.9;

  let etc = input.et0 * input.kc;
  let gross = etc / efficiency;

  let volume = (gross * input.area) / 1000;
  let flow = volume / input.hours;

  let per_zone = flow / input.zones;

  return {
    total: flow,
    per_zone: per_zone,
    m3s: per_zone / 3600
  };
}

// =========================
// 🔹 HYDRAULICS
// =========================

function calculateHydraulics(flow, input) {

  let C = getC(input.material);

  let d = Math.sqrt((4 * flow.m3s) / (Math.PI * input.velocity));

  let std_d = standard_diameters.find(x => x >= d)
    || standard_diameters.at(-1);

  let hf = 10.67 * input.pipe_length * Math.pow(flow.m3s, 1.852) /
           (Math.pow(C, 1.852) * Math.pow(std_d, 4.87));

  let tdh = hf + input.elevation;

  return { diameter: std_d, hf, tdh };
}

// =========================
// 🔹 PUMP
// =========================

function selectPump(hyd, flow) {

  let best = null;
  let bestScore = Infinity;

  for (let pump of pumps) {

    let head = interpolateHead(flow.per_zone, pump.curve);

    if (head === null || head < hyd.tdh) continue;

    let mid = Math.floor(pump.curve.length / 2);
    let diff = Math.abs(flow.per_zone - pump.curve[mid].flow);

    if (diff < bestScore) {
      bestScore = diff;
      best = pump;
    }
  }

  return best;
}

function interpolateHead(flow, curve) {

  for (let i = 0; i < curve.length - 1; i++) {

    let p1 = curve[i];
    let p2 = curve[i + 1];

    if (flow >= p1.flow && flow <= p2.flow) {

      return p1.head +
        ((flow - p1.flow) / (p2.flow - p1.flow)) *
        (p2.head - p1.head);
    }
  }

  if (flow < curve[0].flow) return curve[0].head;
  if (flow > curve[curve.length - 1].flow) return curve[curve.length - 1].head;

  return curve[curve.length - 1].head;
}


function generateSystemCurve(flow, input) {

  let C = getC(input.material);

  let Qs = [];
  let Hs = [];

  let maxFlow = flow.per_zone * 1.5;

  // 🔥 حساب القطر مرة واحدة
  let q_design = flow.per_zone / 3600;

  let d = Math.sqrt((4 * q_design) / (Math.PI * input.velocity));

  let std_d = standard_diameters.find(x => x >= d) || standard_diameters.at(-1);

  // 🔁 loop
  for (let q = 0.1; q <= maxFlow; q += 0.2) {

    let q_m3s = q / 3600;

    let hf = 10.67 * input.pipe_length * Math.pow(q_m3s, 1.852) /
             (Math.pow(C, 1.852) * Math.pow(std_d, 4.87));

    let H = hf + input.elevation;

    Qs.push(q);
    Hs.push(H);
  }

  return { Qs, Hs };
}



function findOperatingPoint(pump, system) {

  if (!system || !system.Qs || !system.Hs) return null;

  for (let i = 0; i < system.Qs.length; i++) {

    let q = system.Qs[i];
    let systemHead = system.Hs[i];

    let pumpHead = interpolateHead(q, pump.curve);

    if (pumpHead === null) continue;

    let diff = Math.abs(pumpHead - systemHead);

    if (diff < 0.5) {
      return { flow: q, head: pumpHead };
    }
  }

  return null;
}



let pumpChart = null;

function drawFullCurve(pump, flow, hyd, input) {

  let ctx = document.getElementById("pumpChart");
  if (!ctx) return;

  // =========================
  // 🔹 Pump Curve (XY)
  // =========================
  let pumpData = pump.curve.map(p => ({
    x: p.flow,
    y: p.head
  }));

  // 🔹 BEP (منتصف المنحنى)
  let mid = Math.floor(pump.curve.length / 2);
  let bep = pump.curve[mid];

  // =========================
  // 🔹 System Curve
  // =========================
  let system = generateSystemCurve(flow, input);

  let systemData = system.Qs.map((q, i) => ({
    x: q,
    y: system.Hs[i]
  }));

  // =========================
  // 🔹 Operating Point
  // =========================
  let op = findOperatingPoint(pump, system);

  let opData = op ? [{
    x: op.flow,
    y: op.head
  }] : [];

  // =========================
  // 🔹 BEP Point
  // =========================
  let bepData = [{
    x: bep.flow,
    y: bep.head
  }];

  // =========================
  // 🔹 Destroy old chart
  // =========================
  if (pumpChart) pumpChart.destroy();

  // =========================
  // 🔹 Create Chart
  // =========================
  pumpChart = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [

        // 🔵 Pump Curve
        {
          label: 'Pump Curve',
          data: pumpData,
          borderWidth: 3,
          tension: 0.3,
          parsing: false
        },

        // 🟡 System Curve
        {
          label: 'System Curve',
          data: systemData,
          borderWidth: 3,
          borderDash: [6, 6],
          tension: 0.3,
          parsing: false
        },

        // 🔴 Operating Point
        {
          label: 'Operating Point',
          data: opData,
          pointRadius: 7,
          pointBackgroundColor: 'red',
          showLine: false,
          parsing: false
        },

        // 🟢 BEP
        {
          label: 'BEP',
          data: bepData,
          pointRadius: 6,
          pointBackgroundColor: 'green',
          showLine: false,
          parsing: false
        }

      ]
    },

    options: {
      responsive: true,

      plugins: {
        legend: {
          labels: { color: '#fff' }
        }
      },

      scales: {

        x: {
          type: 'linear',   // 🔥 مهم جدًا (XY mode)
          title: {
            display: true,
            text: 'Flow (m³/hr)',
            color: '#fff'
          },
          ticks: { color: '#fff' }
        },

        y: {
          title: {
            display: true,
            text: 'Head (m)',
            color: '#fff'
          },
          ticks: { color: '#fff' }
        }

      }
    }
  });
}


function getBEPStatus(op, bep) {
  if (!op || !bep) return "No Data";

  let diff = Math.abs(op.flow - bep.flow);

  if (diff < 0.5) return "Near BEP ✅";
  if (diff < 2) return "Acceptable ⚠️";
  return "Far from BEP ❌";
}

// =========================
// 🔹 ENERGY
// =========================

function calculateEnergy(hyd, flow, input) {

  let Q = flow.per_zone / 3600;

  let power = (1000 * 9.81 * Q * hyd.tdh) / 1000 / 0.75;

  let energy = power * input.hours;

  return {
    power,
    energy,
    cost: energy * input.tariff
  };
}

// =========================
// 🔹 OPTIMIZATION
// =========================

function optimizeSystem(input, flow) {

  let best = { cost: Infinity };

  let velocities = [0.6, 0.8, 1.0, 1.2];

  for (let v of velocities) {

    let d = Math.sqrt((4 * flow.m3s) / (Math.PI * v));

    let std_d = standard_diameters.find(x => x >= d) || standard_diameters.at(-1);

    if (!std_d) continue;

    let cost = std_d * 100;

    if (cost < best.cost) {
      best = { velocity: v, diameter: std_d, cost };
    }
  }

  return best;
}

// =========================
// 🤖 FULL AI ENGINE
// =========================

function runAIEngine(input) {

  let best = null;

  // 🔁 نجرب عدد Zones
  for (let z = 1; z <= 10; z++) {

    let tempInput = { ...input, zones: z };

    // 🔹 الحسابات
    let flow = calculateFlow(tempInput);
    let hyd = calculateHydraulics(flow, tempInput);
    let energy = calculateEnergy(hyd, flow, tempInput);
    // 🔹 شرط السلامة
    if (hyd.velocity > 2 || hyd.velocity < 0.6) continue;

    // 🔹 اختيار الأفضل (أقل طاقة)
    if (!best || energy.energy < best.energy.energy) {
      best = {
        zones: z,
        flow,
        hyd,
        energy
      };
    }
  }

  return best;
}

function runFullAI() {

  let input = getInputs();

  let result = runAIEngine(input);

  if (!result) {
    alert("No valid design found");
    return;
  }

  setText("opt_zones", result.zones);
  setText("opt_diameter", result.hyd.diameter.toFixed(3));
  setText("opt_velocity", result.hyd.velocity.toFixed(2));

  setText("comp_energy", result.energy.energy.toFixed(2));

  setText("recommendation", "✔ AI Optimized Design");
 
}



// =========================
// 🔍 ANALYSIS ENGINE
// =========================

function runAIAnalysis(flow, hyd, pump, op, input, energy) {

  let report = "";
  let score = 100;

  // =========================
  // 🔹 HYDRAULICS
  // =========================
  if (input.velocity < 0.6) {
    report += "⚠️ Low velocity may cause sedimentation.\n";
    score -= 10;
  } else if (input.velocity > 2) {
    report += "⚠️ High velocity may cause pipe wear and losses.\n";
    score -= 10;
  } else {
    report += "✅ Hydraulic velocity is within optimal range.\n";
  }

  // =========================
  // 🔹 PUMP PERFORMANCE
  // =========================
  let mid = Math.floor(pump.curve.length / 2);
  let bep = pump.curve[mid];

  if (op) {
    let diff = Math.abs(op.flow - bep.flow);

    if (diff < 0.5) {
      report += "✅ Pump operating near BEP (high efficiency).\n";
    } else if (diff < 2) {
      report += "⚠️ Pump slightly off BEP.\n";
      score -= 5;
    } else {
      report += "❌ Pump far from BEP (inefficient).\n";
      score -= 15;
    }
  }

  // =========================
  // 🔹 OVERSIZING CHECK
  // =========================
  let pumpHead = interpolateHead(flow.per_zone, pump.curve);

  if (pumpHead > hyd.tdh * 1.3) {
    report += "⚠️ Pump oversized → energy waste.\n";
    score -= 10;
  }

  // =========================
  // 🔹 ENERGY
  // =========================
  if (energy.power > 1) {
    report += "⚠️ High power consumption.\n";
    score -= 5;
  } else {
    report += "✅ Energy consumption is efficient.\n";
  }

  // =========================
  // 🔹 FINAL RATING
  // =========================
  let status = "EXCELLENT";

  if (score < 85) status = "GOOD";
  if (score < 70) status = "MODERATE";
  if (score < 50) status = "POOR";

  return {
    text: report,
    score: score,
    status: status
  };
}
// =========================
// 🔹 UI
// =========================

function updateUI(flow, hyd, pump, energy, opt, input, bepStatus){

    let pump_head = interpolateHead(flow.per_zone, pump.curve);

if (pump_head === null || isNaN(pump_head)) {
  pump_head = 0;
}
  // 🔥 حماية المضخة (توضع هنا بالضبط)
  if (!pump) {
    setText("pump_select", "No Pump Found");
    setText("pump_status", "❌ No Pump");

    // تنظيف باقي القيم المرتبطة بالمضخة
    setText("pump_head", "---");
    setText("bep_status", "---");

    return; // ⛔ إيقاف باقي التنفيذ
  }

  bepStatus = bepStatus || "---";
  let bepBox = document.getElementById("bep_box");

if (bepStatus.includes("Optimal")) {
  bepBox.className = "box success";
} else if (bepStatus.includes("Acceptable")) {
  bepBox.className = "box warning";
} else {
  bepBox.className = "box danger";
}

  
  // 🔹 Pump Status
 let status = (pump_head && pump_head >= hyd.tdh)
  ? "✔️ Pump Suitable"
  : "❌ Not Suitable";

  // 🔹 Alerts
  
  let alert = "OK";

  if (input.velocity > 2) alert = "⚠️ High Velocity";
  if (input.velocity < 0.6) alert = "⚠️ Low Velocity";
  let alertBox = document.getElementById("alerts_box");

if (alert === "OK") {
  alertBox.className = "box success";
} else {
  alertBox.className = "box danger";
}

  // 🔹 Recommendation
 let rec = "OK";
if (pump_head > hyd.tdh * 1.5) {
  rec = "⚠️ Pump oversized — reduce pump size";
}

if (alert !== "OK") rec = "Adjust velocity";

if (bepStatus && bepStatus.includes("Far")) {
  rec = "Adjust zones to reach BEP";
}
 let recBox = document.getElementById("rec_box");

if (rec.includes("OK")) {
  recBox.className = "box success";
} else {
  recBox.className = "box warning";
}
setText("recommendation", rec);

  // =========================
  // 🔥 UI (موحد بالكامل)
  // =========================

  setText("flow_zone", flow.per_zone.toFixed(2));
  setText("head_loss", hyd.hf.toFixed(2));
  setText("tdh", hyd.tdh.toFixed(2));

  setText("pump_flow", flow.per_zone.toFixed(2));

  setText("pump_head", pump_head.toFixed(2));
  setText("pump_status", status);

  setText("power", energy.power.toFixed(2));
 setText("energy", energy?.energy?.toFixed(2) || "---");
  setText("cost", energy.cost.toFixed(2));

 setText("pipe_diameter", hyd.diameter.toFixed(3));
setText("std_diameter", hyd.diameter.toFixed(3)); // ✅ إصلاح

 setText("opt_diameter", opt?.diameter?.toFixed(3) || "---");
  setText("opt_velocity", opt?.velocity || "---");

  setText("pump_select", pump?.name || "---");

  setText("alerts", alert);
  setText("recommendation", rec);
  bepStatus = bepStatus || "No Data";
  setText("bep_status", bepStatus);

}

// =========================
// 🔹 UTIL
// =========================

function getC(material) {
  return material === "pvc" ? 150 :
         material === "hdpe" ? 140 : 120;
}

