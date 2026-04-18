// =========================
// 🔹 GLOBAL DATA
// =========================

let standard_diameters = [
  0.020, 0.025, 0.032, 0.040, 0.050,
  0.063, 0.075, 0.090, 0.110, 0.160
];

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

  let input = getInputs();

  if (!input) return;

  let flowData = calculateFlow(input);

  let hydraulics = calculateHydraulics(flowData, input);

let pump = selectPump(hydraulics, flowData);
  if (!pump) {
    alert("❌ No suitable pump");
    return;
  }

 let energy = calculateEnergy(hydraulics, flowData, input);

  let optimization = optimizeSystem(input, flowData);

  let curve = analyzeSystemCurve(hydraulics, pump, input);

  updateUI(flowData, hydraulics, pump, energy, optimization, curve);

  saveDesign(input, energy);


 // =========================
// 🔹 SAVE CURRENT DESIGN
// =========================

window.current_design = {
  zones: input.zones,
  velocity: input.velocity,
  diameter: hydraulics.diameter,
  pump: pump.name,
  energy: energy.energy
};

}

function getInputs() {

  let data = {
    et0: parseFloat(et0.value),
    kc: parseFloat(kc.value),
    area: parseFloat(area.value),
    hours: parseFloat(hours.value),
    zones: parseInt(zones.value),
    velocity: parseFloat(velocity.value),
    length: parseFloat(length.value),
    elevation: parseFloat(elevation.value),
    material: material.value,
    tariff: parseFloat(tariff.value)
  };

  for (let key in data) {
    if (isNaN(data[key])) {
      alert("⚠️ Fill all inputs");
      return null;
    }
  }

  return data;
}



function calculateFlow(input) {

  let efficiency = input.system === "drip" ? 0.9 : 0.75;

  let etc = input.et0 * input.kc;
  let gross = etc / efficiency;

  let volume = (gross * input.area) / 1000;
  let flow = volume / input.hours;

  let flow_zone = flow / input.zones;

  return {
    total: flow,
    per_zone: flow_zone,
    m3s: flow_zone / 3600
  };
}


function calculateHydraulics(flow, input) {

  let C = getC(input.material);

  let d = Math.sqrt((4 * flow.m3s) / (Math.PI * input.velocity));

  let std_d = standard_diameters.find(x => x >= d)
            || standard_diameters.at(-1);

  let hf = 10.67 * input.length * Math.pow(flow.m3s, 1.852) /
           (Math.pow(C, 1.852) * Math.pow(std_d, 4.87));

  let tdh = hf + input.elevation;

  return { diameter: std_d, hf, tdh };
}



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



function optimizeSystem(input, flow) {

  let best = { cost: Infinity };

  let velocities = [0.6, 0.8, 1.0, 1.2];

  for (let v of velocities) {

    let d = Math.sqrt((4 * flow.m3s) / (Math.PI * v));

    let std_d = standard_diameters.find(x => x >= d);

    if (!std_d) continue;

    let cost = std_d * 100; // placeholder

    if (cost < best.cost) {
      best = { velocity: v, diameter: std_d, cost };
    }
  }

  return best;

}



function analyzeSystemCurve(hyd, pump, input) {

  let intersection = findIntersection(pump.curve, hyd, input);

  return intersection;
}


  function updateUI(flow, hyd, pump, energy, opt, curve) {

  pump_flow.innerText = flow.per_zone.toFixed(2);
  tdh.innerText = hyd.tdh.toFixed(2);

  power.innerText = energy.power.toFixed(2);
  cost.innerText = energy.cost.toFixed(2);

  opt_diameter.innerText = opt.diameter.toFixed(3);

}


function getC(material) {
  return material === "pvc" ? 150 :
         material === "hdpe" ? 140 : 120;
  for (let key in data) {
  if (key !== "material" && isNaN(data[key])) {
    alert("⚠️ Fill all inputs");
    return null;
  }
}
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


function applyOptimization() {

  let best_zone = document.getElementById("opt_zones").innerText;

  if (best_zone === "---") {
    alert("Run design first");
    return;
  }

  // 🔹 تحويل إلى رقم
  best_zone = parseInt(best_zone);

  // 🔹 تحديث input
  document.getElementById("zones").value = best_zone;

  // 🔥 إعادة تشغيل الحساب
  calculate();
}


function runAIEngine() {

  // =========================
  // 🔹 READ INPUTS AGAIN
  // =========================

  let area = parseFloat(document.getElementById("area").value);
  let zones = parseInt(document.getElementById("zones").value);
  let velocity = parseFloat(document.getElementById("velocity").value);
  let length = parseFloat(document.getElementById("length").value);
  let elevation = parseFloat(document.getElementById("elevation").value);
  let hours = parseFloat(document.getElementById("hours").value);
  let tariff = parseFloat(document.getElementById("tariff").value);
 // =========================
// 🔹 MATERIAL → C VALUE
// =========================

let material = document.getElementById("material").value;

let C;

if (material === "pvc") {
  C = 150;
} else if (material === "hdpe") {
  C = 140;
} else if (material === "steel") {
  C = 120;
}
  
  // 🔹 Water
  let ET0 = parseFloat(document.getElementById("et0").value);
  let Kc = parseFloat(document.getElementById("kc").value);

  // =========================
  // 🔹 CALCULATE FLOW
  // =========================

  let water_req = ET0 * Kc; // mm/day

  let total_flow = (water_req * area) / 1000; // m³/day

  total_flow = total_flow / hours; // m³/hr
  

  let best_config = null;
  let best_score = Infinity;

  let velocities = [0.6, 0.8, 1.0, 1.2, 1.5];

  for (let z = 1; z <= 6; z++) {
    for (let v of velocities) {

      let flow_per_zone = total_flow / z;
      let flow_m3s = flow_per_zone / 3600;

      // 🔹 Diameter
      let d = Math.sqrt((4 * flow_m3s) / (Math.PI * v));

      let std_d = standard_diameters.find(diam => diam >= d);
      if (!std_d) std_d = standard_diameters[standard_diameters.length - 1];

      // 🔹 Head Loss
      let hf = 10.67 * length * Math.pow(flow_m3s, 1.852) /
               (Math.pow(C, 1.852) * Math.pow(std_d, 4.87));


      let tdh = hf + elevation;

      // 🔹 Pump selection
      for (let pump of pumps) {

        let pump_head = interpolateHead(flow_per_zone, pump.curve);

        if (pump_head === null) continue;

        // 🔹 Power
        let power = (1000 * 9.81 * flow_m3s * tdh) / 1000 / 0.75;

        let energy = power * hours;

        let cost = energy * tariff;

        // 🔹 BEP
        let mid = Math.floor(pump.curve.length / 2);
        let bep = pump.curve[mid].flow;

        let diff = Math.abs(flow_per_zone - bep);

        // 🔥 Score
        let score = cost + diff;

        if (score < best_score) {
          best_score = score;

          best_config = {
            zones: z,
            velocity: v,
            diameter: std_d,
            pump: pump.name,
            flow: flow_per_zone,
            head: tdh,
            energy: energy,
            cost: cost
          };
        }
      }
    }
  }

  return best_config;
}



function runFullAI() {

  let result = runAIEngine();
  // =========================
// 🔹 SAVE AI DESIGN
// =========================

window.ai_design = result;

  if (!result) {
    alert("❌ No optimal design found");
    return;
  }

  // 🔥 تطبيق النتائج
  document.getElementById("zones").value = result.zones;
  document.getElementById("velocity").value = result.velocity;

  // إعادة الحساب
  calculate();

  // عرض النتائج
  document.getElementById("pump_select").innerText =
    result.pump + " | Flow: " + result.flow.toFixed(2);

  document.getElementById("opt_diameter").innerText =
    result.diameter.toFixed(3);

  document.getElementById("opt_zones").innerText =
    result.zones;

  // =========================
// 🔹 DISPLAY COMPARISON
// =========================

let before = window.current_design;
let after = window.ai_design;

if (before && after) {

  document.getElementById("comp_zones").innerText =
    before.zones + " → " + after.zones;

  document.getElementById("comp_velocity").innerText =
    before.velocity + " → " + after.velocity;

  document.getElementById("comp_diameter").innerText =
    before.diameter.toFixed(3) + " → " + after.diameter.toFixed(3);

  document.getElementById("comp_pump").innerText =
    before.pump + " → " + after.pump;

  let saving = ((before.energy - after.energy) / before.energy) * 100;

  document.getElementById("comp_energy").innerText =
    saving.toFixed(1) + "% Saving 🔥";
}
}


function generateReport() {

  // 🔹 تحقق
  let flow = document.getElementById("pump_flow").innerText;

  if (flow === "0" || flow === "---") {
    alert("⚠️ Run design first");
    return;
  }

  // =========================
  // 🔹 تعبئة البيانات
  // =========================

  document.getElementById("rep_project").innerHTML = `
    Area: ${document.getElementById("area").value} m²<br>
    Zones: ${document.getElementById("zones").value}<br>
    Emitter: ${document.getElementById("emitter_flow").value} L/hr<br>
    Operating Hours: ${document.getElementById("hours").value}
  `;

  document.getElementById("rep_results").innerHTML = `
    Flow: ${document.getElementById("pump_flow").innerText} m³/hr<br>
    Head: ${document.getElementById("pump_head").innerText} m<br>
    Energy: ${document.getElementById("energy").innerText} kWh/day
  `;

  document.getElementById("rep_pump").innerHTML = `
    ${document.getElementById("pump_select").innerText}<br>
    Status: ${document.getElementById("pump_status").innerText}
  `;

  document.getElementById("rep_ai").innerHTML = `
    Optimal Zones: ${document.getElementById("opt_zones").innerText}<br>
    Diameter: ${document.getElementById("opt_diameter").innerText}<br>
    Velocity: ${document.getElementById("opt_velocity").innerText}
  `;

  // 🔹 Chart
  let chartCanvas = document.getElementById("myChart");

  if (chartCanvas && chartCanvas.toDataURL) {
    document.getElementById("rep_chart").src =
      chartCanvas.toDataURL("image/png");
  }

  // 🔹 Date
  document.getElementById("rep_date").innerText =
    new Date().toLocaleDateString();

  // 🔥 تصدير
  generatePDF();
}

function generatePDF() {

  let report = document.getElementById("report");

  let clone = report.cloneNode(true);

  clone.style.display = "block";
  clone.style.position = "absolute";
  clone.style.left = "-9999px";

  document.body.appendChild(clone);

 html2pdf().set({
  margin: 10,
  filename: "HydroSmart_Report.pdf",
  html2canvas: {
    scale: 2,
    ignoreElements: (el) => el.tagName === "IMG"
  },
  jsPDF: {
    unit: "mm",
    format: "a4",
    orientation: "portrait"
  }
}).from(clone).save();
    }



