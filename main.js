// =========================
// 🔹 GLOBAL DATA
// =========================
window.addEventListener("load", () => {
  let saved = localStorage.getItem("last_design");
  if (saved) {
    console.log("Loaded previous design");
  }
});


let isRunning = false;

function updateStatus(text, color = "#00ff88") {
  let el = document.querySelector(".status");
  if (!el) return;
  el.innerText = text;
  el.style.color = color;
}


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

setInterval(() => {
  let statusEl = document.querySelector(".status");

  if (!statusEl) return;

  if (window.current_design_data) {
    statusEl.innerText = "✔ System Ready";
  } else {
    statusEl.innerText = "⏳ Waiting for Input";
  }

}, 3000);


// =========================
// 🔹 MAIN ENGINE
// =========================

function calculate() {

  if (isRunning) return;
  isRunning = true;

  updateStatus("⏳ Calculating...", "#ffaa00");

  try {

    // =========================
    // 🔹 INPUT
    // =========================
    let input = getInputs();

    if (!input) {
      updateStatus("❌ Invalid Input", "red");
      return;
    }

    // =========================
    // 🔹 CORE CALCULATION
    // =========================
    let flow = calculateFlow(input);
    let hyd = calculateHydraulics(flow, input);

    let pump = selectPump(hyd, flow);

    // =========================
    // 🔹 FALLBACK PUMP
    // =========================
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

      if (!pump) {
        alert("No suitable pump found");
        return;
      }
    }

    // =========================
    // 🔹 ENERGY & OPTIMIZATION
    // =========================
    let energy = calculateEnergy(hyd, flow, input);
    let opt = optimizeSystem(input, flow);

    // =========================
    // 🔹 DRAW CHART
    // =========================
    if (pump) {
      drawFullCurve(pump, flow, hyd, input);
    }

    // =========================
    // 🔹 OPERATING POINT
    // =========================
    let system = generateSystemCurve(flow, input);
    let op = findOperatingPoint(pump, system);

    if (!op) {
      console.warn("No operating point found");
    }

    let mid = Math.floor(pump.curve.length / 2);
    let bep = pump.curve[mid];

    let bepStatus = getBEPStatus(op, bep);

    // =========================
    // 🔹 UPDATE UI
    // =========================
    updateUI(flow, hyd, pump, energy, opt, input, bepStatus);

    // =========================
    // 🔹 AI ANALYSIS
    // =========================
    let ai = runAIAnalysis(flow, hyd, pump, op, input, energy);

    let report = generateFullReport(
      flow,
      hyd,
      pump,
      op,
      input,
      energy,
      ai
    );

    let kpi = computeKPIs(flow, hyd, pump, input, energy);

let summary = `
Score: ${ai.score}/100

Hydraulics: ${
  kpi.HL_ratio > 0.5 ? "❌ Critical" :
  kpi.HL_ratio > 0.4 ? "⚠️ High" :
  kpi.HL_ratio > 0.3 ? "⚠️ Moderate" :
  "✅ Optimal"
}
Pump: ${kpi.pumpMargin > 1.3 ? "⚠️ Oversized" : "✅ OK"}
Irrigation: ${kpi.balance > 1.1 ? "⚠️ Over" : (kpi.balance < 0.9 ? "⚠️ Under" : "✅ Balanced")}
Energy: ${energy.power > 1 ? "⚠️ High" : "✅ Efficient"}
`;

setText("analysis_text", summary + "\n\n" + ai.text);
    
    setText("ai_score", ai.score + " / 100");
    setText("ai_status", ai.status);
    setText("full_report", report);
    if (ai.score >= 90) {
  setText("ai_status", "🔥 OPTIMAL DESIGN");
}

    // =========================
    // 🔹 SAVE DATA
    // =========================
    window.current_design = {
      zones: input.zones,
      velocity: input.velocity,
      diameter: hyd.diameter,
      pump: pump.name,
      energy: energy.energy
    };

    window.current_design_data = {
      flow: flow,
      hyd: hyd,
      pump: pump,
      op: op,
      input: input,
      energy: energy,
      ai: ai
    };

    updateStatus("✔ System Ready", "#00ff88");

  } catch (err) {

    console.error("Calculation Error:", err);
    updateStatus("❌ Error occurred", "red");

  } finally {

    // 🔥 يضمن عدم تجميد النظام
    isRunning = false;
  }
}

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
  // ===== VALIDATION =====
if (data.velocity < 0.6 || data.velocity > 2) {
  alert("Velocity must be between 0.6 – 2 m/s");
  return null;
}

if (data.et0 <= 0 || data.et0 > 15) {
  alert("ET0 out of realistic range (0–15)");
  return null;
}

if (data.zones < 1 || data.zones > 50) {
  alert("Zones must be between 1–50");
  return null;
}

if (data.area <= 0) {
  alert("Invalid area");
  return null;
}

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

  let selected_d = standard_diameters[0];
  let hf = 0;
  let tdh = 0;

  // 🔁 Loop لاختيار القطر المناسب
  for (let d of standard_diameters) {

    let hf_temp = 10.67 * input.pipe_length * Math.pow(flow.m3s, 1.852) /
                  (Math.pow(C, 1.852) * Math.pow(d, 4.87));

    let tdh_temp = hf_temp + input.elevation;

    let HL_ratio = hf_temp / tdh_temp;

    // 🎯 شرط التصميم
    if (HL_ratio <= 0.35) {
      selected_d = d;
      hf = hf_temp;
      tdh = tdh_temp;
      break;
    }

    // fallback → أكبر قطر
    selected_d = d;
    hf = hf_temp;
    tdh = tdh_temp;
  }

  return {
    diameter: selected_d,
    hf,
    tdh
  };
}

// =========================
// 🔹 PUMP
// =========================

function selectPump(hyd, flow) {

  let best = null;
  let bestScore = Infinity;

  for (let pump of pumps) {

    // 🔹 حساب Head عند التدفق المطلوب
    let pumpHead = interpolateHead(flow.per_zone, pump.curve);

    let margin = pumpHead / hyd.tdh;

    // 🔹 تحديد BEP (منتصف الكيرف)
    let mid = Math.floor(pump.curve.length / 2);
    let bep = pump.curve[mid];

    // 🔹 الفرق عن BEP
    let diff = Math.abs(flow.per_zone - bep.flow);

    let deviation = diff / bep.flow;
    if (margin > 1.8) continue;

    // 🔹 Score محسّن
    let score = 0;

// 🔹 BEP deviation (الأهم)
score += deviation * 70;

// 🔹 Margin penalty (غير خطي)
if (margin > 1.5) {
  score += (margin - 1.5) * 50; // عقوبة قوية
}
else {
  score += (margin - 1) * 30;
}
  }
  if (!best) {
  console.warn("⚠️ No suitable pump found — consider redesign");
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

if (diff / systemHead < 0.05) {
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
    if (tempInput.velocity > 2 || tempInput.velocity < 0.6) continue;

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


// =========================
// 🤖 AUTO DESIGN ENGINE (NEW)
// =========================
function autoOptimizeSystem(input) {

  let best = null;
  let bestScore = -Infinity;

  let velocities = [0.8, 1.0, 1.2];
  let zoneOptions = [1, 2, 3, 4, 5];

  for (let v of velocities) {
    for (let z of zoneOptions) {

      let tempInput = { ...input, velocity: v, zones: z };

      let flow = calculateFlow(tempInput);
      let hyd = calculateHydraulics(flow, tempInput);
      let pump = selectPump(hyd, flow);

      if (!pump) continue;

      let energy = calculateEnergy(hyd, flow, tempInput);

      let op = findOperatingPoint(pump, generateSystemCurve(flow, tempInput));

      let ai = runAIAnalysis(flow, hyd, pump, op, tempInput, energy);

      if (ai.score > bestScore) {
        bestScore = ai.score;
        best = {
          input: tempInput,
          flow,
          hyd,
          pump,
          energy,
          ai
        };
      }
    }
  }

  return best;
}


function runFullAI() {

  let input = getInputs();
  if (!input) return;

  let result = autoOptimizeSystem(input);

  if (!result) {
    alert("No optimal design found");
    return;
  }

  // 🔹 عرض النتائج المحسنة
  setText("opt_zones", result.input.zones);
  setText("opt_diameter", result.hyd.diameter.toFixed(3));
  setText("opt_velocity", result.input.velocity.toFixed(2));

  setText("pump_select", result.pump.name);

  setText("energy", result.energy.energy.toFixed(2));

  setText("recommendation", "🚀 AUTO OPTIMIZED DESIGN APPLIED");

  // 🔥 تحديث النظام بالقيم الجديدة
  document.getElementById("zones").value = result.input.zones;
  document.getElementById("velocity").value = result.input.velocity;

  // 🔁 إعادة الحساب
  calculate();
}


// =========================
// 🔹 KPI ENGINE (NEW)
// =========================
function computeKPIs(flow, hyd, pump, input, energy) {

  let pumpHead = interpolateHead(flow.per_zone, pump.curve);

  let HL_ratio = hyd.hf / hyd.tdh;

  let requiredWater = (input.et0 * input.kc * input.area) / 1000;
  let actualWater;

let mode = document.getElementById("mode").value;

if (mode === "zone") {
  // Sequential irrigation
  actualWater = flow.per_zone * input.hours * input.zones;
} else {
  // Full system
  actualWater = flow.total * input.hours;
}
 let efficiencyFactor = 0.9; // drip efficiency

let adjustedRequired = requiredWater / efficiencyFactor;

let balance = actualWater / adjustedRequired;

  let pumpMargin = pumpHead / hyd.tdh;

  return {
    HL_ratio,
    requiredWater,
    actualWater,
    balance,
    pumpMargin
  };
}

// =========================
// 🔍 ANALYSIS ENGINE
// =========================

function runAIAnalysis(flow, hyd, pump, op, input, energy) {

  let report = "";
  let score = 85;

  let kpi = computeKPIs(flow, hyd, pump, input, energy);

  // =========================
  // 🔹 HYDRAULICS (Velocity)
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
  // 🔹 HEAD LOSS RATIO
  // =========================
  if (kpi.HL_ratio > 0.5) {
  report += "❌ Critical head loss (" + (kpi.HL_ratio * 100).toFixed(1) + "% of TDH)\n";
  score -= 20;
}
else if (kpi.HL_ratio > 0.4) {
  report += "⚠️ High head loss\n";
  score -= 12;
}
else if (kpi.HL_ratio > 0.3) {
  report += "⚠️ Moderate head loss\n";
  score -= 6;
}
else {
  report += "✅ Head loss within optimal range\n";
}
  if (kpi.HL_ratio > 0.5) {
  score = Math.min(score, 60);
}
  // =========================
  // 🔹 PUMP PERFORMANCE (BEP)
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
  // 🔹 PUMP MATCHING
  // =========================
  let pumpHead = interpolateHead(flow.per_zone, pump.curve);

  if (kpi.pumpMargin > 1.3) {
    report += "⚠️ Pump oversized (" + (kpi.pumpMargin * 100).toFixed(0) + "% head margin)\n";
    score -= 10;
  }
  else if (kpi.pumpMargin < 1.05) {
    report += "⚠️ Low safety margin (risk under load)\n";
    score -= 10;
  }
  else {
    report += "✅ Pump correctly matched\n";
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
  // 🔹 IRRIGATION BALANCE
  // =========================
  if (kpi.balance > 1.2) {
  report += "⚠️ Over-irrigation detected (significant excess water)\n";
}
else if (kpi.balance > 1.05) {
  report += "⚠️ Slight over-irrigation (within acceptable range)\n";
}
  else {
    report += "✅ Irrigation demand matched\n";
  }

  // =========================
  // 🔹 SYSTEM LOGIC LINK
  // =========================
  if (kpi.pumpMargin > 1.2 && kpi.balance > 1.05) {
    report += "⚠️ Excess pressure likely causing over-irrigation\n";
    score -= 5;
  }

  // =========================
  // 🔹 FINAL STATUS
  // =========================
  let status = "EXCELLENT";

  if (score < 85) status = "GOOD";
  if (score < 70) status = "MODERATE";
  if (score < 50) status = "POOR";

  // Clamp
  if (score > 100) score = 100;
  if (score < 0) score = 0;

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



function generateFullReport(flow, hyd, pump, op, input, energy, ai) {
let kpi = computeKPIs(flow, hyd, pump, input, energy);
  let mid = Math.floor(pump.curve.length / 2);
  let bep = pump.curve[mid];
let operationMode = document.getElementById("mode").value;

let modeComment = operationMode === "zone"
  ? "Irrigation is applied sequentially across zones."
  : "Irrigation is applied to the full system simultaneously.";
  let pumpHead = interpolateHead(flow.per_zone, pump.curve);
  let margin = pumpHead / hyd.tdh;

  // =========================
  // 🔹 Pump Classification
  // =========================
  let pumpStatus = "WELL MATCHED";
  let pumpComment = "";

  if (margin > 1.3) {
    pumpStatus = "OVERSIZED";
    pumpComment = "The pump delivers significantly higher head than required.";
  } else if (margin < 1.05) {
    pumpStatus = "UNDERDESIGNED";
    pumpComment = "The pump is very close to minimum required head.";
  } else {
    pumpStatus = "OPTIMAL";
    pumpComment = "The pump is well matched to system requirements.";
  }

  // =========================
  // 🔹 BEP Analysis
  // =========================
  let bepStatus = "UNKNOWN";
  let bepComment = "";

  if (op) {
    let diff = Math.abs(op.flow - bep.flow);

    if (diff < 1) {
      bepStatus = "NEAR BEP";
      bepComment = "Pump operates at optimal efficiency.";
    } else if (diff < 3) {
      bepStatus = "MODERATE";
      bepComment = "Pump operates within acceptable efficiency range.";
    } else {
      bepStatus = "FAR FROM BEP";
      bepComment = "Pump operates outside optimal efficiency range.";
    }
  }

  // =========================
  // 🔹 Efficiency Label
  // =========================
  let efficiencyLabel = "GOOD";

if (
  pumpStatus === "OPTIMAL" &&
  bepStatus === "NEAR BEP" &&
  kpi.HL_ratio < 0.3 &&
  kpi.balance >= 0.95 &&
  kpi.balance <= 1.05
) {
  efficiencyLabel = "EXCELLENT";
}
else if (kpi.balance > 1.1 || kpi.HL_ratio > 0.35) {
  efficiencyLabel = "SUBOPTIMAL";
}

  // =========================
  // 🔹 Chart Interpretation (Dynamic)
  // =========================
  let chartComment = "";

  if (bepStatus === "NEAR BEP") {
    chartComment = "The pump curve intersects the system curve near the BEP, indicating optimal operation.";
  } else if (bepStatus === "FAR FROM BEP") {
    chartComment = "The intersection occurs far from BEP, indicating inefficient operation.";
  } else {
    chartComment = "The intersection is within acceptable operating range.";
  }

  // =========================
  // 🔹 Optimization Suggestion
  // =========================
  let optimizationBlock = "";

  if (pumpStatus === "OVERSIZED") {
    optimizationBlock = `
9. PUMP OPTIMIZATION SCENARIO
------------------------------
The pump is oversized relative to system requirements.

Recommended action:
- Select a smaller pump closer to TDH
- Improve energy efficiency
`;
  } else if (pumpStatus === "UNDERDESIGNED") {
    optimizationBlock = `
9. PUMP OPTIMIZATION SCENARIO
------------------------------
The pump is close to minimum required head.

Recommended action:
- Select a slightly higher head pump for safety margin
`;
  }

  // =========================
  // 🔹 Conclusion (Dynamic)
  // =========================
  let conclusion = "";

if (efficiencyLabel === "EXCELLENT") {
  conclusion = "The system is optimally designed and operates at high efficiency. No modification required.";
}
else if (efficiencyLabel === "GOOD") {
  conclusion = "The system is stable and acceptable, with minor room for optimization.";
}
else {
  conclusion = "The system requires optimization due to hydraulic or irrigation imbalance.";
}
  let irrigationComment = "";

if (kpi.balance > 1.1) {
  irrigationComment = "The system delivers excess water, which may lead to inefficiency or waterlogging.";
}
else if (kpi.balance < 0.9) {
  irrigationComment = "The system may not meet crop water requirements.";
}
else {
  irrigationComment = "Water supply matches crop demand.";
}

  return `
==============================
SMART IRRIGATION DESIGN REPORT
==============================

1. PROJECT OVERVIEW
-------------------
This report presents a full hydraulic and pump performance analysis.

2. INPUT DATA
-------------
ET0: ${input.et0}
Kc: ${input.kc}
Area: ${input.area} m²
Zones: ${input.zones}
Velocity: ${input.velocity} m/s

3. HYDRAULIC RESULTS
--------------------
Flow per Zone: ${flow.per_zone.toFixed(2)} m³/hr
TDH: ${hyd.tdh.toFixed(2)} m
Head Loss: ${hyd.hf.toFixed(2)} m
Diameter: ${hyd.diameter.toFixed(3)} m

4. PUMP SELECTION
-----------------
Pump: ${pump.name}
Pump Head: ${pumpHead.toFixed(2)} m
TDH: ${hyd.tdh.toFixed(2)} m

Status: ${pumpStatus}
${pumpComment}

5. PUMP CURVE ANALYSIS
----------------------
Operating Point: ${op?.flow?.toFixed(2) || "N/A"} m³/hr
BEP: ${bep.flow} m³/hr

Status: ${bepStatus}
${bepComment}

${chartComment}

6. ENERGY ANALYSIS
------------------
Power: ${energy.power.toFixed(2)} kW
Energy: ${energy.energy.toFixed(2)} kWh

${energy.power < 1 ? "Energy efficient operation." : "Energy consumption is relatively high."}

7. SYSTEM PERFORMANCE
---------------------
Hydraulic: ${input.velocity >= 0.6 && input.velocity <= 2 ? "Good" : "Needs Adjustment"}
Pump Matching: ${pumpStatus}
Efficiency Level: ${efficiencyLabel}

8. AI ASSESSMENT
----------------
Score: ${ai.score}/100

${ai.text}

${optimizationBlock}

10. CONCLUSION
--------------
${conclusion}

==============================
END OF REPORT
==============================
`;
}
function downloadReport() {
  let text = document.getElementById("full_report").innerText;

  let blob = new Blob([text], { type: "text/plain" });
  let link = document.createElement("a");

  link.href = URL.createObjectURL(blob);
  link.download = "Irrigation_Report.txt";
  link.click();
}

function generateReport() {

  if (!window.current_design_data) {
    alert("Run calculation first");
    return;
  }

  let d = window.current_design_data;

  let report = generateFullReport(
    d.flow,
    d.hyd,
    d.pump,
    d.op,
    d.input,
    d.energy,
    d.ai
  );

  setText("full_report", report);
}


function getChartImage() {
  let canvas = document.getElementById("pumpChart");
  return canvas.toDataURL("image/png", 1.0);
}




async function exportPDF() {

  const { jsPDF } = window.jspdf;
  let doc = new jsPDF();

  // =========================
  // 🔹 Get Data
  // =========================
  let reportText = document.getElementById("full_report").innerText;
  let chartImage = getChartImage();

  // =========================
  // 🔹 Title
  // =========================
 doc.setFont("helvetica", "bold");
doc.setFontSize(14);
doc.text("Smart Irrigation Report", 15, 15);

doc.setDrawColor(0, 150, 255);
doc.line(15, 18, 195, 18);

  // =========================
  // 🔹 Chart Image
  // =========================
  doc.addImage(chartImage, "PNG", 15, 30, 180, 90);

  // =========================
  // 🔹 Report Text
  // =========================
  doc.setFont("courier", "normal");
  doc.setFontSize(9);

  let y = 130;

  let lines = doc.splitTextToSize(reportText, 180);

  lines.forEach(line => {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, 15, y);
    y += 5;
  });

  // =========================
  // 🔹 Save
  // =========================
  doc.save("Irrigation_Report.pdf");
}


function safeExport() {

  if (!window.current_design_data) {

    // تشغيل الحساب تلقائياً
    calculate();

    if (!window.current_design_data) {
      alert("⚠️ Failed to generate data");
      return;
    }
  }

  generateReport();
  exportPDF();
}


function runFullExport() {

  if (!window.current_design_data) {
    calculate();
  }

  generateReport();
  exportPDF();
}



