// ========================================
// WWTP AI Digital Twin Simulator
// Version Control
// ========================================

const APP_INFO = {
    name: "WWTP AI Digital Twin Simulator",
    version: "V14 Professional",
    release: "Stable",
    build: "2026.03",
    branch: "MAIN"
};
// ================= OPERATION MODE =================

window.operationMode = "AUTO";
const SIMULATOR_VERSION = "WWTP Simulator V12 AI Professional";
let baseFlowDaily = null;
let dailyResults = [];
let chartNH4 = null;
let chartNH4data = [];
let chartFlow = [];
let chartMLSS = [];
let chartSLR = [];
let dynamicMLSS = null;
let dailyChart = null;
// ===== GAUGE CHARTS =====
let gaugeMLSS=null;
let gaugeNH4=null;
let gaugeEnergy=null;

// ==============24h Chart Data Storage =================


let flowData = [];
let mlssData = [];
let nh4Data = [];
let slrData = [];
let chartHours = [];
let simulationStarted = false;
// ================= DIGITAL TWIN CALIBRATION =================


// ===== REAL PLANT DATA (Calibration Reference) =====

let plantData = {

NH4_real: null,
MLSS_real: null,
SLR_real: null

};

// ================= TAB SYSTEM =================
function openTab(evt, tabName){

document.querySelectorAll(".panel").forEach(function(panel){
panel.classList.remove("active");
});

let selected = document.getElementById(tabName);

if(selected){
selected.classList.add("active");
}

  // Optional: highlight active button
  if(evt){
    document.querySelectorAll(".sidebar button").forEach(function(btn){
      btn.classList.remove("active");
    });
    evt.currentTarget.classList.add("active");
  }
}

// ================= GLOBAL =================
window.onerror = function(msg, url, line){
  console.error("ERROR:", msg, "line:", line);
};


let reportData = null;

// ================= COLOR =================
function getNH4Color(value){
  if(value > 10) return "#ff4d4d";
  if(value > 2) return "#f1c40f";
  return "#00ff90";
}

// =================================================== MAIN Run Simulation =======================================================================

function runSimulation(){
  
simulationStarted = true;
console.log("Operation Mode:", window.operationMode);

flowData = [];
mlssData = [];
nh4Data  = [];
slrData  = [];
chartHours = [];

for(let h=0; h<24; h++){

let flow = 35000 + 20000*Math.sin(h/24*Math.PI);
let mlss = 2800 + 400*Math.sin(h/24*Math.PI);
let nh4  = 6 - 2*Math.sin(h/24*Math.PI);
let slr  = 70 + 20*Math.sin(h/24*Math.PI);

chartHours.push(h);

flowData.push(flow);
mlssData.push(mlss);
nh4Data.push(nh4);
slrData.push(slr);

}

drawDailyChart();

let settlingStatus = "Unknown";

  document.getElementById("results").innerHTML = "Simulation started...";

  // ========= INPUTS =========
  let Q = parseFloat(document.getElementById("flow").value);
  let COD = parseFloat(document.getElementById("cod").value);
  let TKN = parseFloat(document.getElementById("tkn").value);
  
  // ===== READ REAL PLANT NH4 =====
  let plantNH4_input = parseFloat(document.getElementById("plantNH4").value);
  // ===== READ REAL PLANT MLSS =====

  let plantMLSS_input = parseFloat(document.getElementById("plantMLSS").value);
// ===== READ REAL PLANT SLR =====

let plantSLR_input = parseFloat(document.getElementById("plantSLR").value);

if(!isNaN(plantSLR_input)){
plantData.SLR_real = plantSLR_input;
}
  if(!isNaN(plantMLSS_input)){
  plantData.MLSS_real = plantMLSS_input;
  }
  if(!isNaN(plantNH4_input)){
  plantData.NH4_real = plantNH4_input;
  }
  
  let T = parseFloat(document.getElementById("temp").value);
  let V = parseFloat(document.getElementById("volume").value);
  let clarifierArea = parseFloat(document.getElementById("clarifierArea").value);
  let aerationTanks = parseInt(document.getElementById("aerationNumber").value);
  let clarifierNumber = parseInt(document.getElementById("clarifierNumber").value);
  // MLSS from process
  let mlss = XR;
  let MLSS_kg_m3 = mlss / 1000;
    
let clarifierFlows = [];
let baseFlow = Q / clarifierNumber;

for(let i=0;i<clarifierNumber;i++){

  let factor = 0.9 + Math.random()*0.2;
  clarifierFlows.push(baseFlow * factor);

}
    // ===== SLR PER CLARIFIER =====
let slrPerClarifier = [];

for(let i = 0; i < clarifierNumber; i++){

  let areaPerClarifier = clarifierArea;

  let flow_i = (clarifierFlows && clarifierFlows[i]) ? clarifierFlows[i] : Q;
    

  let solids_i = flow_i * MLSS_kg_m3;

  let slr_i = solids_i / areaPerClarifier;

  slrPerClarifier.push(slr_i);

}
    // ===== Uneven Clarifier Distribution =====
  clarifierFlows = [];
  let totalFactor = 0;

// generate random factors
for(let i=0;i<clarifierNumber;i++){

let factor = 0.8 + Math.random()*0.4;   // 0.8 → 1.2
clarifierFlows.push(factor);
totalFactor += factor;

}

// normalize flows so total = Q
for(let i=0;i<clarifierNumber;i++){

clarifierFlows[i] = Q * (clarifierFlows[i] / totalFactor);

}
    
  // ===== V14 STEP 1 – PROCESS TRAINS =====
  let trains = clarifierNumber;
    // ===== V14 STEP 2 – FLOW PER TRAIN =====
  let flowPerTrain = Q / trains;
  // ========= TOTAL CLARIFIER AREA =========
  let totalClarifierArea = clarifierArea * clarifierNumber;
  let SRT_input = parseFloat(document.getElementById("srt").value);
  let zones = parseInt(document.getElementById("zones").value);
  let DO = parseFloat(document.getElementById("doTarget").value);
  const XR = Number(document.getElementById("xr").value);

  // ===== Default SVI initialization =====
let SVI = 100;

  // ========= STORM EVENT =========
let stormFactor = 1.0;

// Example storm trigger
if (Q > 1.3 * 100000){
    stormFactor = 1.5;
}
  let Q_effective = Q * stormFactor;
  let COD_storm = COD / stormFactor;
  let TKN_storm = TKN / stormFactor;

if([Q,COD,TKN,T,V,SRT_input,zones,DO,XR,clarifierArea,clarifierNumber].some(isNaN)){
alert("Please fill all fields correctly");
return;
}

  if(XR <= 0){ alert("XR must be > 0"); return; }
  if(zones < 1) zones = 1;

  // ========= KINETICS =========
  let mu20 = 0.9;
  let kd20 = 0.08;
  let theta_mu = 1.07;
  let theta_kd = 1.04;
  let Y = 0.65;

  let muT = mu20 * Math.pow(theta_mu,(T-20));
  let kdT = kd20 * Math.pow(theta_kd,(T-20));
  let muNet = muT - kdT;

  if(muNet <= 0){
    alert("Temperature too low");
    return;
  }

  // ========= SRTmin =========
  let SRTmin = 1 / muNet;

  // ========= LOAD =========
  let CODkg = COD / 1000;
  let BOD = COD_storm * 0.65;
  let BODkg = BOD / 1000;
 
  let Load = Q_effective * BODkg;

  // ========= INITIAL MLSS =========
  let MLSS_kg = (Y * Load * SRT_input) / (V * (1 + kdT * SRT_input));
  let MLSS = MLSS_kg * 1000;
  // ===== DIGITAL TWIN CALIBRATION =====
MLSS = MLSS * calibration.MLSS_factor;
  let TotalBiomass = MLSS_kg * V;

  // ===== SLUDGE INVENTORY =====
  let sludgeInventory = TotalBiomass / 1000; // tons
  let Px = Y * Load;
  
  // ===== SLUDGE PRODUCTION =====
let sludgeProduction = Px / 1000; // tons/day
  let FM;
  FM = Load / (V * MLSS_kg);
  
  // ========= DO AUTO OPTIMIZATION =========
let DO_auto = DO;
  // Adjust DO based on loading conditions
if (FM < 0.15){
    DO_auto = 1.5;   // low load
}
else if (FM < 0.30){
    DO_auto = 2.0;   // normal load
}
else{
    DO_auto = 2.5;   // high load
}

  // ========= OPERATION MODE BASED ON F/M =========

let WAS_min, WAS_max;
let MLSS_low, MLSS_high;
let processMode;
  
  // ========= CLOSED LOOP SRT CONTROL =========

  let XR_kg = XR / 1000;
  let SRT_target = SRT_input;

  let Biomass = TotalBiomass;
  let WAS = Biomass / (SRT_target * XR_kg);

  // Dynamic loop
  for(let i = 0; i < 8; i++){

      let Production = Px;
      let Decay = kdT * Biomass;
      let Wasted = WAS * XR_kg;

      Biomass = Biomass + Production - Decay - Wasted;

      if(Biomass < 0) Biomass = 0;

      let MLSS_loop = Biomass / V;
      WAS = (MLSS_loop * V) / (SRT_target * XR_kg);
  
  // ===== OPERATIONAL WAS LIMITS =====

// Apply limits
if (WAS < WAS_min) WAS = WAS_min;
if (WAS > WAS_max) WAS = WAS_max;

// 3️⃣ MLSS biological protection
let MLSS_current = Biomass / V * 1000;

if (MLSS_current < MLSS_low) {
    WAS = WAS_min;   // protect biomass
}

if (MLSS_current > MLSS_high) {
    WAS = WAS_max;   // avoid over-thick sludge
  
     }
    
  }
  
  // Final update
  TotalBiomass = Biomass;
  MLSS_kg = TotalBiomass / V;
  MLSS = MLSS_kg * 1000;

  let SRT = (MLSS_kg * V) / (WAS * XR_kg);
  
  // ===== SRT DEVIATION MONITOR =====

let SRT_deviation = SRT - SRT_target;

let SRT_status;

if (Math.abs(SRT_deviation) < 0.5){
    SRT_status = "On Target";
}
else if (SRT_deviation > 0){
    SRT_status = "SRT Above Target";
}
else{
    SRT_status = "SRT Below Target";
}

  // ========= PERFORMANCE =========
  
  let nitrificationFactor = SRT / SRTmin;

// ========= NITRIFICATION SAFETY =========

let nitrificationStatus;

if (nitrificationFactor > 4){
    nitrificationStatus = "Very Safe";
}
else if (nitrificationFactor > 2){
    nitrificationStatus = "Safe";
}
else if (nitrificationFactor > 1.2){
    nitrificationStatus = "Warning";
}
else{
    nitrificationStatus = "Nitrification Failure Risk";
}
  // ========= AMMONIA =========

let NH4_target = 10;

let K_DO = 0.5;
let DO_factor = DO_auto / (K_DO + DO_auto);

let mu_effective = muNet * DO_factor;

let NH4out = TKN / (1 + mu_effective * SRT);
  // ===== DIGITAL TWIN CALIBRATION =====

NH4out = NH4out * calibration.NH4_factor;

let NPI = ((TKN - NH4out) / TKN) * 100;

  // ========= ENERGY MODEL (Dynamic Aeration) =========

let O2carbon = 1.42 * Load;
let O2nitrification = 4.57 * (TKN - NH4out) * Q / 1000;

let O2total = O2carbon + O2nitrification;

// Energy depends on DO level
let aerationFactor = DO_auto / 2.0;

let energy = O2total * 1.3 * aerationFactor;

let energyPerM3 = energy / Q;

  // ========= PROFESSIONAL OPERATION MODE (Stress Based) =========

let stressScore = 0;

// 1️⃣ F/M stress
if (FM > 0.45) stressScore += 1;
if (FM < 0.20) stressScore += 1;

// 2️⃣ MLSS stress
if (MLSS > 8000) stressScore += 1;
if (MLSS < 2500) stressScore += 1;

// 3️⃣ Energy stress
if (energyPerM3 > 1.8) stressScore += 1;

// 4️⃣ NH4 compliance stress
if (NH4out > NH4_target) stressScore += 1;
  
// ========= RAS CONTROL BASED ON MLSS =========

// Target MLSS
let MLSS_target = 4000;

// Calculate deviation
let MLSS_error = MLSS - MLSS_target;

let RAS_ratio;

// MLSS too low → increase RAS
if (MLSS_error < -1000){
    RAS_ratio = 0.9;
}

// slightly low
else if (MLSS_error < -300){
    RAS_ratio = 0.75;
}

// normal operation
else if (MLSS_error < 300){
    RAS_ratio = 0.6;
}

// slightly high
else if (MLSS_error < 1000){
    RAS_ratio = 0.5;
}

// MLSS too high
else{
    RAS_ratio = 0.4;
}

// Calculate RAS flow
let RAS = Q * RAS_ratio;

// Safety limits
if (RAS > 1.2 * Q){
    RAS = 1.2 * Q;
}

if (RAS < 0.25 * Q){
    RAS = 0.25 * Q;
}

// Update ratio
RAS_ratio = RAS / Q;
  
// ===== Mode Decision =====

if (stressScore >= 2) {

    operationMode = "High Stress";

    WAS_min = 0.008 * Q;
    WAS_max = 0.04 * Q;

    MLSS_low = 2500;
    MLSS_high = 6500;

}
else if (stressScore === 1) {

    operationMode = "Moderate Stress";

    WAS_min = 0.005 * Q;
    WAS_max = 0.03 * Q;

    MLSS_low = 3000;
    MLSS_high = 7500;

}
else {

    operationMode = "Stable";

    WAS_min = 0.004 * Q;
    WAS_max = 0.02 * Q;

    MLSS_low = 3500;
    MLSS_high = 8000;

}

  // ========= AUTO SRT =========
  let SRT_auto = SRT;
  while(SRT_auto < 30){
    SRT_auto += 0.5;
    let NH4_test = TKN / (1 + muNet * SRT_auto);
    if(NH4_test <= NH4_target) break;
  }

 // ========= SECONDARY CLARIFIER MODEL =========

// Convert flow to m³/hour
let Q_hour = Q / 24;

// Hydraulic Loading Rate
let HLR = Q_hour / totalClarifierArea;


// ========= CLARIFIER LOAD =========



// solids entering clarifier
let solidsInfluent = (Q + RAS) * MLSS_kg_m3;

// Solids Loading Rate
let SLR = solidsInfluent / totalClarifierArea;
  // ===== DIGITAL TWIN CALIBRATION =====
SLR = SLR * calibration.SLR_factor;

   // ========= IMPROVED SVI MODEL =========

// ===== Dynamic SVI base =====

let SVI_base = 90 + (FM * 180);

// MLSS effect (high MLSS worsens settling)
let MLSS_factor = 1;

if (MLSS > 5000){
    MLSS_factor = 1.2;
}
else if (MLSS > 7000){
    MLSS_factor = 1.35;
}

// SRT effect (older sludge settles better)
let SRT_factor = 1;

if (SRT > 12){
    SRT_factor = 0.9;
}
else if (SRT > 20){
    SRT_factor = 0.8;
}

// Final SVI
SVI = SVI_base * MLSS_factor * SRT_factor;

// ========= SETTLING VELOCITY MODEL =========

// Convert MLSS to g/L
let MLSS_g = MLSS / 1000;

// empirical settling constants
let V0 = 8;     
let k = 0.35;

// Vesilind settling model
let Vs_base = V0 * Math.exp(-k * MLSS_g);

// Safe SVI value
let sviSafe = (SVI && SVI > 0) ? SVI : 100;

// Final settling velocity
let Vs = Vs_base * (100 / sviSafe);

// realistic limits
if (Vs < 0.3) Vs = 0.3;
if (Vs > 12) Vs = 12;

  // ========= SLUDGE FLUX MODEL =========

// MLSS in g/L
let X = MLSS / 1000;

// solids flux
let sludgeFlux = X * Vs;

// compression effect when SVI high
if (SVI > 150){
    sludgeFlux *= 0.85;
}

if (SVI > 200){
    sludgeFlux *= 0.7;
}

// flux limit (empirical factor)
let fluxLimit = sludgeFlux * 1.2;

// convert clarifier loading to hourly basis
let loadingFlux = SLR / 24;

// flux condition
let fluxStatus;

if (loadingFlux < sludgeFlux){
    fluxStatus = "Safe Flux";
}
else if (loadingFlux < fluxLimit){
    fluxStatus = "Flux Near Limit";
}
else{
    fluxStatus = "Flux Overload Risk";
}

  // ========= CLARIFIER CAPACITY CHECK =========

// Solids flux (kg/m2/h)
let solidsFlux = MLSS_g * Vs;

// Convert current solids loading to kg/m2/h
let SLR_hour = SLR / 24;

// Clarifier capacity evaluation
let clarifierCapacityStatus;

if (SLR_hour < solidsFlux * 0.5){
    clarifierCapacityStatus = "High Clarifier Capacity";
}
else if (SLR_hour < solidsFlux){
    clarifierCapacityStatus = "Moderate Capacity";
}
else{
    clarifierCapacityStatus = "Washout Risk";
}

// Hydraulic warning
let clarifierHydraulicWarning = "";

if (HLR > 3){
    clarifierHydraulicWarning = "Hydraulic Overload";
}
  // ========= STATE POINT CLARIFIER ANALYSIS =========

let criticalFlux = sludgeFlux * 1.4;

let clarifierSafety = criticalFlux - loadingFlux;

let clarifierUtilization = (loadingFlux / criticalFlux) * 100;

let statePointStatus;

if (clarifierUtilization < 50){
    statePointStatus = "Low Clarifier Loading";
}
else if (clarifierUtilization < 75){
    statePointStatus = "Normal Clarifier Operation";
}
else if (clarifierUtilization < 90){
    statePointStatus = "High Clarifier Loading";
}
else{
    statePointStatus = "Critical Clarifier Condition";
}
  
 
// ========= SETTLING STATUS =========

if (SVI < 100){
settlingStatus = "Excellent Settling";
}
else if (SVI < 150){
settlingStatus = "Good Settling";
}
else if (SVI < 200){
settlingStatus = "Moderate Settling";
}
else{
settlingStatus = "Bulking Risk";
}
// limits
if (SVI < 70) SVI = 70;
if (SVI > 250) SVI = 250;

  

// ========= CLARIFIER EFFLUENT TSS MODEL =========

// Base TSS from solids loading
let TSS_base;

if (SLR < 80){
    TSS_base = 8;
}
else if (SLR < 120){
    TSS_base = 12;
}
else if (SLR < 180){
    TSS_base = 20;
}
else if (SLR < 250){
    TSS_base = 40;
}
else{
    TSS_base = 80;
}

// Settling correction using SVI
let settlingFactor = Math.pow((SVI / 100), 1.2);

let TSS_eff = TSS_base * settlingFactor;

// realistic limits
if (TSS_eff < 5) TSS_eff = 5;
if (TSS_eff > 150) TSS_eff = 150;
  
// تأثير قابلية الترسيب (SVI)
if (SVI > 180){
    TSS_eff *= 1.5;
}
else if (SVI > 150){
    TSS_eff *= 1.2;
}

// Clarifier condition
let clarifierStatus;

if (SLR < 80){
    clarifierStatus = "Excellent Settling";
}
else if (SLR < 120){
    clarifierStatus = "Normal Operation";
}
else{
    clarifierStatus = "Clarifier Overloaded";
}

// ========= DYNAMIC SLUDGE BLANKET MODEL =========

// sludge settling factor
let blanketSettlingFactor = Math.pow(SVI / 100,1.2);

// solids loading influence
let loadingFactor = SLR / 100;

// estimate blanket height
let blanketHeight = 1 + (blanketSettlingFactor * loadingFactor);

// limit values
if (blanketHeight < 0.5) blanketHeight = 0.5;
if (blanketHeight > 4) blanketHeight = 4;

// blanket condition
let blanketStatus;

if (blanketHeight < 1){
    blanketStatus = "Low Blanket";
}
else if (blanketHeight < 2){
    blanketStatus = "Normal Blanket";
}
else if (blanketHeight < 3){
    blanketStatus = "Rising Blanket";
}
else{
    blanketStatus = "Washout Risk";
}

  // ========= CLARIFIER WASHOUT PREDICTOR =========

let washoutRisk = 0;

// 1) Flux margin (how close loading is to sludge flux)
let fluxRatio = loadingFlux / sludgeFlux;

if (fluxRatio > 0.9){
    washoutRisk += 40;
}
else if (fluxRatio > 0.75){
    washoutRisk += 20;
}

// 2) SVI effect
if (SVI > 200){
    washoutRisk += 25;
}
else if (SVI > 150){
    washoutRisk += 10;
}

// 3) Blanket height
if (blanketHeight > 3){
    washoutRisk += 25;
}
else if (blanketHeight > 2){
    washoutRisk += 10;
}

// 4) RAS ratio influence
if (RAS_ratio > 0.9){
    washoutRisk += 10;
}

if (washoutRisk > 100){
    washoutRisk = 100;
}

// Risk status
let washoutStatus;

if (washoutRisk < 25){
    washoutStatus = "Low Risk";
}
else if (washoutRisk < 50){
    washoutStatus = "Moderate Risk";
}
else if (washoutRisk < 75){
    washoutStatus = "High Risk";
}
else{
    washoutStatus = "Critical Washout Risk";
}


   // ========= STRATEGY =========
  
  let strategy = "Current operation acceptable";
  if(NH4out > NH4_target){
    strategy = "Increase SRT to " + SRT_auto.toFixed(1) + " days";
  }
  
// ========= OPERATOR ADVISOR =========

let advisorList = [];

if (clarifierStatus === "Clarifier Overloaded"){
    advisorList.push("Reduce MLSS by increasing WAS to reduce clarifier solids loading.");
}

if (blanketStatus === "Washout Risk"){
    advisorList.push("Reduce RAS flow and increase sludge wasting.");
}

if (FM > 0.40){
    if (MLSS < 3500){
        advisorList.push("Organic loading high. Consider increasing MLSS or aeration capacity.");
    } else {
        advisorList.push("Organic loading high but MLSS already elevated. Reduce MLSS slightly to protect clarifier.");
    }
}

if (NH4out > 10){
advisorList.push("Check DO level or increase SRT for better nitrification.");
}

if (advisorList.length === 0){
    advisorList.push("System operating within normal parameters.");
}

let advisorHTML = advisorList.map(a => "• " + a).join("<br>");

  // ========= ALARM SYSTEM =========

let alarmList = [];

  if (SVI >= 180){
    alarmList.push("⚠ Sludge Bulking Detected");
}
    if (SVI > 200){
    alarmList.push("⚠ Severe Bulking Sludge Condition");
}
  
if (SVI > 150 && DO < 1.5){
advisorList.push("Possible filamentous bulking due to low DO. Increase aeration.");
}

  if (stormFactor > 1){
    alarmList.push("⚠ Storm Flow Event Detected");
}

if (clarifierStatus === "Clarifier Overloaded"){
    alarmList.push("⚠ Clarifier Overloaded");
}

  if (clarifierUtilization > 90){
    alarmList.push("⚠ Clarifier approaching critical loading");
}

if (blanketStatus === "Washout Risk"){
    alarmList.push("⚠ Sludge Washout Risk");
}

if (FM > 0.40){
alarmList.push("⚠ High F/M Loading");
}

if (FM > 0.55){
alarmList.push("⚠ Critical Organic Loading");
}

if (NH4out > 10){
alarmList.push("⚠ High Ammonia in Effluent");
}

  if (fluxStatus === "Flux Overload Risk"){
    alarmList.push("⚠ Clarifier Flux Limit Exceeded");
}

let alarmHTML = alarmList.map(a => a).join("<br>");


  // ========= PLANT HEALTH SCORE =========

let healthScore = 100;

if (FM > 0.35) healthScore -= 10;
if (NH4out > 10) healthScore -= 10;
if (clarifierStatus === "Clarifier Overloaded") healthScore -= 20;
if (blanketStatus === "Washout Risk") healthScore -= 20;
if (energyPerM3 > 1.2) healthScore -= 10;

if (healthScore < 0) healthScore = 0;

  // ========= PROCESS STABILITY INDEX =========

let stabilityScore = 100;

// F/M stability
if (FM > 0.45) stabilityScore -= 20;
else if (FM > 0.35) stabilityScore -= 10;

// SRT stability
if (SRT < 6) stabilityScore -= 20;
else if (SRT < 8) stabilityScore -= 10;

// NH4 compliance
if (NH4out > 10) stabilityScore -= 25;
else if (NH4out > 5) stabilityScore -= 10;

// Clarifier loading
if (clarifierUtilization > 90) stabilityScore -= 25;
else if (clarifierUtilization > 75) stabilityScore -= 10;

// Energy efficiency
if (energyPerM3 > 1.5) stabilityScore -= 10;

if (stabilityScore < 0) stabilityScore = 0;
  
  // ========= AI AUTOMATIC PROCESS CONTROL =========

let aiWAS = WAS;
let aiRAS = RAS;
let aiDO = DO_auto;
// ================= OPERATION MODE CONTROL =================

if(window.operationMode === "AUTO"){

// AI controls plant
WAS = aiWAS;
RAS = aiRAS;
DO_auto = aiDO;

}

else{

// Operator controls plant
// use user inputs (no AI override)

console.log("Operator Mode Active");

}
  
let aiMLSS_target;
  
// ========= AI MLSS TARGET OPTIMIZATION =========

if (FM >= 0.30){
    aiMLSS_target = 3200;
}
else if (FM >= 0.25){
    aiMLSS_target = 3500;
}
else if (FM >= 0.15){
    aiMLSS_target = 4000;
}
else{
    aiMLSS_target = 4500;
}

   // ===== Optimization Suggestions =====

// MLSS below AI target
if (MLSS < aiMLSS_target - 300){
advisorList.push("MLSS slightly below optimal target. Consider reducing WAS slightly to increase biomass.");
}

// MLSS too high
if (MLSS > aiMLSS_target + 800){
advisorList.push("MLSS above optimal range. Consider increasing WAS to improve oxygen transfer.");
}

// Clarifier underloaded
if (clarifierUtilization < 35){
advisorList.push("Clarifier underloaded. Biomass inventory could be increased safely.");
}

// Energy optimization
if (energyPerM3 > 1.2){
advisorList.push("Aeration energy relatively high. Review DO setpoint optimization.");
}

// F/M optimization
if (FM > 0.35 && FM < 0.45){
advisorList.push("Organic loading slightly elevated. Increasing MLSS may improve process stability.");
}

// MLSS control
if (MLSS > aiMLSS_target + 500){
    aiWAS = WAS * 1.2;
}
else if (MLSS < aiMLSS_target - 500){
    aiWAS = WAS * 0.8;
}
  
// ===== Forecast-aware AI control =====

if(predNH4 > 5){
    aiWAS = WAS * 0.9;
}

if(predMLSS < aiMLSS_target){
    aiWAS = WAS * 0.9;
}
  
// ===== Clarifier protection =====
if (SLR > 200){
    aiWAS = WAS * 1.35;
    aiRAS = RAS * 0.75;
}

if (SVI > 160){
    aiWAS = WAS * 1.25;
}

  // Nitrification control
if (nitrificationFactor < 2){
    aiDO = DO_auto + 0.5;
}

  // DO limits
if (aiDO > 3) aiDO = 3;
if (aiDO < 1.5) aiDO = 1.5;
  
  // ===== Energy optimization =====
if (nitrificationFactor > 6){
    aiDO = aiDO - 0.3;
}
// ========= AI MLSS CONTROL ADVISOR =========

let mlssControlAction;

let mlssDeviation = MLSS - aiMLSS_target;

if (Math.abs(mlssDeviation) < 200){
    mlssControlAction = "MLSS on target – maintain current wasting.";
}
else if (mlssDeviation > 0){
    mlssControlAction = "MLSS above target – increase WAS slightly.";
}
else{
    mlssControlAction = "MLSS below target – reduce WAS slightly.";
}
  // ========= AI CLARIFIER PROTECTION =========

let clarifierProtectionAction = "None";

let clarifierRisk = loadingFlux / sludgeFlux;

// High clarifier risk
if (clarifierRisk > 0.9 || blanketHeight > 3){

    clarifierProtectionAction = "High risk – increase WAS and reduce RAS";

    aiWAS = aiWAS * 1.20;
    aiRAS = aiRAS * 0.85;

}

// Moderate risk
else if (clarifierRisk > 0.75 || blanketHeight > 2.5){

    clarifierProtectionAction = "Moderate risk – slightly increase WAS";

    aiWAS = aiWAS * 1.10;

}

  // ========= AI OPERATOR DECISION ENGINE =========

let operatorDecision = "System operating normally";

// Priority 1 — Clarifier safety
if (clarifierProtectionAction !== "None"){
    operatorDecision = clarifierProtectionAction;
}

// Priority 2 — Nitrification protection
else if (NH4out > 8){
    operatorDecision = "Increase SRT or raise DO slightly to improve nitrification";
}

// Priority 3 — MLSS optimization
else if (mlssControlAction.includes("increase WAS")){
    operatorDecision = "Increase WAS slightly to reduce MLSS";
}

else if (mlssControlAction.includes("reduce WAS")){
    operatorDecision = "Reduce WAS slightly to increase MLSS";
}

// Priority 4 — Energy optimization
else if (energyPerM3 > 1.5){
    operatorDecision = "Review aeration setpoint to reduce energy consumption";
}
  // ========= AI TREND RISK PREDICTOR =========

let trendRiskMessage = "No immediate process risk predicted";

// NH4 trend analysis
if (predNH4 > NH4out + 1){
    trendRiskMessage = "NH4 predicted to increase – check aeration or SRT";
}

// MLSS trend analysis
if (predMLSS < MLSS - 300){
    trendRiskMessage = "MLSS predicted to decrease – monitor sludge wasting";
}

// Clarifier loading trend
if (predSLR > SLR * 1.15){
    trendRiskMessage = "Clarifier loading predicted to increase – monitor sludge blanket";
}

  // ========= PROCESS SAFETY GUARDIAN =========

let processSafetyStatus = "SAFE";

// Biomass collapse risk
if (MLSS < 2000){
    processSafetyStatus = "Risk of biomass loss";
}

// SRT collapse
if (SRT < 3){
    processSafetyStatus = "Critical SRT – risk of process failure";
}

// Ammonia shock
if (NH4out > 15){
    processSafetyStatus = "High ammonia – nitrification failure risk";
}

// Clarifier washout
if (loadingFlux > sludgeFlux){
    processSafetyStatus = "Clarifier overload – sludge washout risk";
}

// Sludge blanket risk
if (blanketHeight > 3){
    processSafetyStatus = "High sludge blanket – washout possible";
}
  
  console.log("Flux:", sludgeFlux, loadingFlux, fluxStatus);

reportData = {

MLSS: MLSS,
aiMLSS_target: aiMLSS_target,
TotalBiomass: TotalBiomass,
  sludgeInventory: sludgeInventory,
FM: FM,
SRT: SRT,
  SRT_target: SRT_target,
SRT_deviation: SRT_deviation,
SRT_status: SRT_status,
NH4out: NH4out,
nitrificationStatus: nitrificationStatus,
energyPerM3: energyPerM3,
operationMode: operationMode,
healthScore: healthScore,
  stabilityScore: stabilityScore,
  sludgeProduction: sludgeProduction,

HLR: HLR,
SLR: SLR,
Vs: Vs,
sludgeFlux: sludgeFlux,
loadingFlux: loadingFlux,
fluxStatus: fluxStatus,

SVI: SVI,
settlingStatus: settlingStatus,
TSS_eff: TSS_eff,
blanketHeight: blanketHeight,
blanketStatus: blanketStatus,
  washoutRisk: washoutRisk,
washoutStatus: washoutStatus,

WAS: WAS,
RAS: RAS,
Q: Q,
V: V,
XR: XR,
TKN: TKN,
mu_effective: mu_effective,
totalClarifierArea: totalClarifierArea,
operatorDecision: operatorDecision,
  trendRiskMessage: trendRiskMessage,
  processSafetyStatus: processSafetyStatus,
aiWAS: aiWAS,
aiRAS: aiRAS,
aiDO: aiDO,  
mlssControlAction: mlssControlAction,
  clarifierProtectionAction: clarifierProtectionAction,
alarmHTML: alarmHTML,
advisorHTML: advisorHTML,

criticalFlux: criticalFlux,
clarifierUtilization: clarifierUtilization,
statePointStatus: statePointStatus

};

  
// ========= RESULTS =========

document.getElementById("results").innerHTML = `

<h3>⚙️ Process Performance</h3>

<div class="result-grid">

<div class="result-card">
<div class="card-label">MLSS</div>
<div class="card-value">${MLSS.toFixed(0)} mg/L</div>
</div>

<div class="result-card">
<div class="card-label">AI Target MLSS</div>
<div class="card-value">${aiMLSS_target.toFixed(0)} mg/L</div>
</div>

<div class="result-card">
<div class="card-label">Total Biomass</div>
<div class="card-value">${TotalBiomass.toFixed(0)} kg</div>
</div>

<div class="result-card">
<div class="card-label">Sludge Inventory</div>
<div class="card-value">${sludgeInventory.toFixed(2)} tons</div>
</div>

<div class="result-card">
<div class="card-label">F/M Ratio</div>
<div class="card-value">${FM.toFixed(3)}</div>
</div>

<div class="result-card">
<div class="card-label">SRT</div>
<div class="card-value">${SRT.toFixed(2)} days</div>
</div>

<div class="result-card">
<div class="card-label">NH4 Effluent</div>
<div class="card-value">${NH4out.toFixed(2)} mg/L</div>
</div>

<div class="result-card">
<div class="card-label">Energy</div>
<div class="card-value">${energyPerM3.toFixed(2)} kWh/m³</div>
</div>

<div class="result-card">
<div class="card-label">Plant Health</div>
<div class="card-value">${healthScore}/100</div>
</div>

</div>

<h3>🏗 Clarifier Performance</h3>

<div class="clarifier-grid">

<div class="clarifier-card">
<div class="clarifier-title">HLR</div>
<div class="clarifier-value">${HLR.toFixed(2)} m/h</div>
</div>

<div class="clarifier-card">
<div class="clarifier-title">Solids Loading</div>
<div class="clarifier-value">${SLR.toFixed(1)} kg/m²/d</div>
</div>

<div class="clarifier-card">
<div class="clarifier-title">Settling Velocity</div>
<div class="clarifier-value">${Vs.toFixed(2)} m/h</div>
</div>

<div class="clarifier-card">
<div class="clarifier-title">Sludge Flux</div>
<div class="clarifier-value">${sludgeFlux.toFixed(2)} kg/m²/h</div>
</div>

<div class="clarifier-card">
<div class="clarifier-title">Flux Loading</div>
<div class="clarifier-value">${loadingFlux.toFixed(2)} kg/m²/h</div>
</div>

<div class="clarifier-card">
<div class="clarifier-title">SVI</div>
<div class="clarifier-value">${SVI.toFixed(0)} mL/g</div>
</div>

<div class="clarifier-card">
<div class="clarifier-title">Blanket Height</div>
<div class="clarifier-value">${blanketHeight.toFixed(2)} m</div>
</div>

<div class="clarifier-card">
<div class="clarifier-title">Clarifier Utilization</div>
<div class="clarifier-value">${clarifierUtilization.toFixed(1)} %</div>
</div>

</div>


<h3>🤖 AI Operation</h3>

<div class="ai-grid">

<div class="ai-card">
<div class="ai-title">WAS Flow</div>
<div class="ai-value">${WAS.toFixed(0)} m³/day</div>
</div>

<div class="ai-card">
<div class="ai-title">RAS Flow</div>
<div class="ai-value">${RAS.toFixed(0)} m³/day</div>
</div>

<div class="ai-card">
<div class="ai-title">AI Suggested DO</div>
<div class="ai-value">${aiDO.toFixed(2)} mg/L</div>
</div>

<div class="ai-card">
<div class="ai-title">Operator Decision</div>
<div class="ai-value">${operatorDecision}</div>
</div>

</div>


<h3>🚨 Process Alarms</h3>

<div class="alarm-console">

${alarmHTML}

</div>

<h3>🧠 Operator Advice</h3>

<div class="advisor-panel">

${advisorHTML}

</div>
`;

// ========= KPI =========
document.getElementById("kpiNH4").querySelector("p").innerText = NH4out.toFixed(2);
document.getElementById("kpiEnergy").querySelector("p").innerText = energyPerM3.toFixed(2);
document.getElementById("kpiSRT").querySelector("p").innerText = SRT.toFixed(1);
document.getElementById("kpiMLSS").querySelector("p").innerText = MLSS.toFixed(0);

// ===== NH4 PROFILE CALCULATION =====

let nh4Profile = [];

for(let i=0;i<zones;i++){

let fraction = (i+1)/zones;

let nh4 = TKN * Math.exp(-mu_effective * SRT * fraction);

nh4Profile.push(nh4);

}

drawNH4Profile(nh4Profile);

console.log("Simulation Complete");

updateControlRoom();
updatePlantStatus();
updateBioWinDashboard();
updateProcessAlarm();
updatePrediction();
updateGauges();
calibrateNH4();
calibrateMLSS();
calibrateSLR();
updateCalibrationDashboard();
updateFlowsheet();
generateTrains(aerationTanks, clarifierNumber, clarifierFlows, slrPerClarifier);

// open operations tab
document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
document.getElementById("operations").classList.add("active");
    
/* ===== Advanced Process Intelligence ===== */

document.getElementById("fluxStatus").innerText = fluxStatus;
document.getElementById("statePointStatus").innerText = statePointStatus;
document.getElementById("settlingStatus").innerText = settlingStatus;
document.getElementById("effluentTSS").innerText = TSS_eff.toFixed(1);
document.getElementById("criticalFlux").innerText = criticalFlux.toFixed(2);

document.getElementById("targetSRT").innerText = SRT_target.toFixed(2);
document.getElementById("srtDeviation").innerText = SRT_deviation.toFixed(2);
document.getElementById("srtStatus").innerText = SRT_status;
document.getElementById("nitrificationStatus").innerText = nitrificationStatus;
document.getElementById("sludgeProtection").innerText = clarifierProtectionAction;


/* ===== AI Process Intelligence ===== */

document.getElementById("aiWAS").innerText = aiWAS.toFixed(0) + " m³/d";
document.getElementById("aiRAS").innerText = aiRAS.toFixed(0) + " m³/d";
document.getElementById("aiMLSSControl").innerText = mlssControlAction;
document.getElementById("aiClarifierProtection").innerText = clarifierProtectionAction;
document.getElementById("aiDecision").innerText = operatorDecision;
document.getElementById("aiTrendRisk").innerText = trendRiskMessage;
    
}


/* ========================================================== Generic KPI updater ============================================================== */
function updateKPIs(map){
  Object.keys(map).forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    let v = map[id];

    if(v === undefined || v === null){
      el.innerText = "--";
      return;
    }

    // إذا كان رقم
    if(typeof v === "number"){
      el.innerText = Number.isFinite(v) ? v.toString() : "--";
    }else{
      el.innerText = v;
    }
  });
}


  // ================================================= TOGGLE OPERATION MODE =====================================================================

function toggleOperationMode(){

if(window.operationMode === "AUTO"){

window.operationMode = "OPERATOR";

}
else{

window.operationMode = "AUTO";

}

document.getElementById("modeButton").innerText =
"Mode: " + window.operationMode;

}

// =================================================== APPLY CALIBRATION ====================================================================

function applyCalibration(){

let nh4 = parseFloat(document.getElementById("calNH4").value);
let mlss = parseFloat(document.getElementById("calMLSS").value);
let slr = parseFloat(document.getElementById("calSLR").value);

if(isNaN(nh4) || isNaN(mlss) || isNaN(slr)){
alert("Invalid calibration values");
return;
}

calibration.NH4_factor = nh4;
calibration.MLSS_factor = mlss;
calibration.SLR_factor = slr;

console.log("Calibration updated:", calibration);

}

// ============================================= AUTO NH4 CALIBRATION =========================================================================

function calibrateNH4(){

if(plantData.NH4_real === null){
console.log("No plant NH4 data available");
return;
}

if(reportData === null){
console.log("Run simulation first");
return;
}

let simNH4 = reportData.NH4out;

if(simNH4 <= 0) return;

calibration.NH4_factor = plantData.NH4_real / simNH4;

console.log("NH4 Calibration Factor:", calibration.NH4_factor);

}

// ============================================= AUTO MLSS CALIBRATION ===========================================================

function calibrateMLSS(){

if(plantData.MLSS_real === null){
console.log("No plant MLSS data available");
return;
}

if(reportData === null){
console.log("Run simulation first");
return;
}

let simMLSS = reportData.MLSS;

if(simMLSS <= 0) return;

calibration.MLSS_factor = plantData.MLSS_real / simMLSS;

console.log("MLSS Calibration Factor:", calibration.MLSS_factor);

}

// ======================================================== AUTO SLR CALIBRATION ========================================================

function calibrateSLR(){

if(plantData.SLR_real === null){
console.log("No plant SLR data available");
return;
}

if(reportData === null){
console.log("Run simulation first");
return;
}

let simSLR = reportData.SLR;

if(simSLR <= 0) return;

calibration.SLR_factor = plantData.SLR_real / simSLR;

console.log("SLR Calibration Factor:", calibration.SLR_factor);

}

// ==================================================== CALIBRATION DASHBOARD =================================================================

function updateCalibrationDashboard(){

let nh4El = document.getElementById("calNH4factor");
let mlssEl = document.getElementById("calMLSSfactor");
let slrEl = document.getElementById("calSLRfactor");
let accEl = document.getElementById("modelAccuracy");

if(nh4El) nh4El.innerText = calibration.NH4_factor.toFixed(2);
if(mlssEl) mlssEl.innerText = calibration.MLSS_factor.toFixed(2);
if(slrEl) slrEl.innerText = calibration.SLR_factor.toFixed(2);

// ===== MODEL ACCURACY =====

if(plantData.NH4_real !== null && reportData){

let error =
Math.abs(plantData.NH4_real - reportData.NH4out)
/
plantData.NH4_real;

let accuracy = (1 - error) * 100;

if(accEl) accEl.innerText = accuracy.toFixed(1) + " %";

}

}

// =================================================== WWTP AI Control Room ====================================================================

function updateControlRoom(){

if(!reportData) return;

function setValue(id,value){
let el = document.getElementById(id);
if(el) el.innerText = value;
}

function setColor(id,value,warn,critical){

let el = document.getElementById(id);
if(!el) return;

if(value >= critical){
el.style.color = "#ff4d4d";   // red
}
else if(value >= warn){
el.style.color = "#f1c40f";   // yellow
}
else{
el.style.color = "#00ff90";   // green
}

}

// values
setValue("crMLSS", reportData.MLSS.toFixed(0));
setValue("crSRT", reportData.SRT.toFixed(1));
setValue("crFM", reportData.FM.toFixed(3));
setValue("crNH4", reportData.NH4out.toFixed(2));
setValue("crEnergy", reportData.energyPerM3.toFixed(2));
setValue("crHealth", reportData.healthScore);
  setValue("crSafety", reportData.processSafetyStatus);
  let safetyEl = document.getElementById("crSafety");

if(safetyEl){

if(reportData.processSafetyStatus === "SAFE"){
safetyEl.style.color = "#00ff90";   // green
}

else if(reportData.processSafetyStatus.includes("Risk")){
safetyEl.style.color = "#f1c40f";   // yellow
}

else{
safetyEl.style.color = "#ff4d4d";   // red
}

}
setValue("crFlux", reportData.clarifierUtilization.toFixed(1)+" %");

 // ===== Plant Status Evaluation =====

let status = "STABLE";

if(reportData.NH4out > 15 || reportData.FM > 0.55 || reportData.clarifierUtilization > 90){
status = "CRITICAL";
}
else if(reportData.NH4out > 10 || reportData.FM > 0.45 || reportData.clarifierUtilization > 70){
status = "WARNING";
}

document.getElementById("plantStatus").innerText = "PLANT STATUS: " + status;
// colors (updated realistic limits)

setColor("crFM", reportData.FM,0.45,0.55);        // F/M limits
setColor("crNH4", reportData.NH4out,10,15);       // NH4 limits
setColor("crEnergy", reportData.energyPerM3,1.2,1.8);
setColor("crHealth", 100-reportData.healthScore,30,50);
setColor("crFlux", reportData.clarifierUtilization,70,90);
  
}

// =================================================== update Plant Status ====================================================================

function updatePlantStatus(){

if(!reportData) return;

let status = "STABLE";
let color = "#00ff90";

if(reportData.NH4out > 15 ||
   reportData.FM > 0.55 ||
   reportData.clarifierUtilization > 90){

status = "CRITICAL";
color = "#ff4d4d";

}
else if(reportData.NH4out > 10 ||
        reportData.FM > 0.45 ||
        reportData.clarifierUtilization > 70){

status = "WARNING";
color = "#f1c40f";

}

let el = document.getElementById("plantStatus");

if(el){
el.innerText = "PLANT STATUS: " + status;
el.style.color = color;
}

}

// =================================================== AI 24h Prediction ===================================================================

function updatePrediction(){

if(!reportData) return;

// simple trend model (24h prediction)

// NH4 prediction
let nh4Future = reportData.NH4out * (1 + (reportData.FM - 0.25));

// MLSS prediction
let mlssFuture = reportData.MLSS * (1 - 0.05);

// Clarifier loading prediction
let slrFuture = reportData.SLR * (1 + (reportData.FM - 0.30));

// limits
if(nh4Future < 0) nh4Future = 0;

// update UI
document.getElementById("predNH4").innerText =
nh4Future.toFixed(2) + " mg/L";

document.getElementById("predMLSS").innerText =
mlssFuture.toFixed(0) + " mg/L";

document.getElementById("predSLR").innerText =
slrFuture.toFixed(1) + " kg/m²/d";

}

// ======================================================== Operator Scenario Test =============================================================

function runScenario(){

// ===== INPUT =====
let WAS_test = parseFloat(document.getElementById("testWAS").value);
let RAS_ratio_test = parseFloat(document.getElementById("testRAS").value);

if(isNaN(WAS_test) || isNaN(RAS_ratio_test)){
alert("Enter WAS and RAS values");
return;
}

// ===== READ CURRENT PLANT DATA =====
let Q = reportData.Q;
let V = reportData.V;
let XR_scenario = reportData.XR / 1000;
let TKN = reportData.TKN;
let mu = reportData.mu_effective;
let clarArea = reportData.totalClarifierArea;

let MLSS_current = reportData.MLSS / 1000; // kg/m3

// ===== ORGANIC LOAD =====
let Load = reportData.FM * V * MLSS_current;

// ===== STEP 1 : RECALCULATE SRT =====
let biomass = MLSS_current * V;

let SRT_test = biomass / (WAS_test * XR_scenario);

// limit SRT
if(SRT_test < 0.5) SRT_test = 0.5;
if(SRT_test > 30) SRT_test = 30;

// ===== STEP 2 : RECALCULATE MLSS =====
let Y = 0.65;
let kd = 0.08;

let MLSS_test =
(Y * Load * SRT_test) /
(V * (1 + kd * SRT_test));

let MLSS_mg = MLSS_test * 1000;

// ===== STEP 3 : RECALCULATE F/M =====
let FM_test = Load / (V * MLSS_test);

// ===== STEP 4 : RECALCULATE NH4 =====
let NH4_test = TKN / (1 + mu * SRT_test);

// ===== STEP 5 : CLARIFIER SOLIDS LOAD =====
let RAS_test = Q * RAS_ratio_test;

let solidsInfluent =
(Q + RAS_test) * MLSS_test;

let SLR_test =
solidsInfluent / clarArea;

// ===== STEP 6 : CLARIFIER CONDITION =====
let clarStatus = "Safe";

if(SLR_test > 120){
clarStatus = "Warning";
}

if(SLR_test > 180){
clarStatus = "Overloaded";
}

// ===== STEP 7 : PLANT STATUS =====

let plantStatus = "Stable";

if(NH4_test > 15 || FM_test > 0.55 || SLR_test > 180){
plantStatus = "Critical";
}
else if(NH4_test > 10 || FM_test > 0.45 || SLR_test > 120){
plantStatus = "Warning";
}
else{
plantStatus = "Stable";
}
  
// ===== STEP 8 : DISPLAY RESULTS =====
document.getElementById("scMLSS").innerText =
MLSS_mg.toFixed(0);

document.getElementById("scSRT").innerText =
SRT_test.toFixed(2);

document.getElementById("scFM").innerText =
FM_test.toFixed(3);

document.getElementById("scNH4").innerText =
NH4_test.toFixed(2);

document.getElementById("scSLR").innerText =
SLR_test.toFixed(1);

document.getElementById("scPlantStatus").innerText =
plantStatus;

// ===== OPTIONAL CLARIFIER STATUS =====
let clarEl = document.getElementById("scClarifierStatus");

if(clarEl){
clarEl.innerText = clarStatus;
}

}


// ================================================== NH4 PROFILE CHART ====================================================================

function drawNH4Profile(data){
  
// ================= PROCESS ZONES BACKGROUND =================
  const processZones = {

id:'processZones',

beforeDraw(chart){

const {ctx, chartArea:{left,right,top,bottom,width}} = chart;

let zones = chart.data.labels.length;
let zoneWidth = width / zones;

ctx.save();

// ===== ANOXIC ZONE =====
ctx.fillStyle = "rgba(0,120,255,0.10)";
ctx.fillRect(left, top, zoneWidth*2, bottom-top);

// ===== TRANSITION ZONE =====
ctx.fillStyle = "rgba(255,180,0,0.10)";
ctx.fillRect(left + zoneWidth*2, top, zoneWidth*2, bottom-top);

// ===== AEROBIC ZONE =====
ctx.fillStyle = "rgba(0,255,120,0.10)";
ctx.fillRect(left + zoneWidth*4, top, zoneWidth*(zones-4), bottom-top);

ctx.restore();

}

};

const ctx = document.getElementById("nh4Chart").getContext("2d");

let zones = data.length;
// ===== DETECT NITRIFICATION COMPLETION =====

let completionZone = null;

for(let i=0;i<data.length;i++){
if(data[i] < 1){
completionZone = i;
break;
}
}

  // ===== DETECT NITRIFICATION RISK =====

let riskZone = null;
let NH4_target = 5;

for(let i=0;i<data.length;i++){
if(data[i] > NH4_target){
riskZone = i;
break;
}
}
  
  // ================= NITRIFICATION MARKER =================

const nitrificationMarker = {

id:'nitrificationMarker',

afterDraw(chart){

if(completionZone === null) return;

const {ctx, chartArea:{left,top,bottom,width}} = chart;

let zones = chart.data.labels.length;
let zoneWidth = width / zones;

let x = left + zoneWidth * completionZone;

ctx.save();

ctx.strokeStyle = "#00ff90";
ctx.setLineDash([6,6]);

ctx.beginPath();
ctx.moveTo(x, top);
ctx.lineTo(x, bottom);
ctx.stroke();

ctx.fillStyle="#00ff90";
ctx.fillText("Nitrification Complete", x+5, top+15);

ctx.restore();

}

};

  // ================= NITRIFICATION RISK MARKER =================

const nitrificationRiskMarker = {

id:'nitrificationRiskMarker',

afterDraw(chart){

if(riskZone === null) return;

const {ctx, chartArea:{left,top,bottom,width}} = chart;

let zones = chart.data.labels.length;
let zoneWidth = width / zones;

let x = left + zoneWidth * riskZone;

ctx.save();

ctx.strokeStyle = "#ff3b3b";
ctx.setLineDash([4,4]);

ctx.beginPath();
ctx.moveTo(x, top);
ctx.lineTo(x, bottom);
ctx.stroke();

ctx.fillStyle="#ff3b3b";
ctx.fillText("Nitrification Risk", x+5, top+30);

ctx.restore();

}

};
  

let labels = [];
for(let i=1;i<=zones;i++){
labels.push("Zone " + i);
}

// ===== LIMITS =====
let NH4_limit = 10;
NH4_target = 5;

let limitLine = new Array(zones).fill(NH4_limit);
let targetLine = new Array(zones).fill(NH4_target);

// ===== RECOMMENDED DO =====
let doProfile = [];

for(let i=0;i<zones;i++){

if(i < 2) doProfile.push(1.2);
else if(i < 4) doProfile.push(2.0);
else doProfile.push(2.5);

}

// ===== DESTROY OLD CHART =====
if(chartNH4){
chartNH4.destroy();
}

// ===== CHART =====
chartNH4 = new Chart(ctx,{

type:'line',

data:{
labels:labels,

datasets:[

{
label:"NH4 Profile",
data:data,
borderColor:"#0066ff",
backgroundColor:"transparent",
borderWidth:3,
pointRadius:4,
tension:0.35,
yAxisID:'yNH4'
},

{
label:"NH4 Target",
data:targetLine,
borderColor:"#00c853",
borderDash:[6,6],
borderWidth:2,
pointRadius:0,
yAxisID:'yNH4'
},

{
label:"NH4 Limit",
data:limitLine,
borderColor:"#ff3b3b",
borderDash:[6,6],
borderWidth:2,
pointRadius:0,
yAxisID:'yNH4'
},

{
label:"Recommended DO",
data:doProfile,
borderColor:"#ffa500",
borderDash:[4,4],
borderWidth:2,
pointRadius:3,
tension:0.3,
yAxisID:'yDO'
}

]

},

options:{

responsive:true,
maintainAspectRatio:false,

interaction:{
mode:'index',
intersect:false
},

plugins:{
legend:{
labels:{
color:"#ddd"
}
}
},

scales:{

yNH4:{
type:'linear',
position:'left',
title:{
display:true,
text:"NH4 (mg/L)"
},
grid:{color:"#1f2d3d"}
},

yDO:{
type:'linear',
position:'right',
title:{
display:true,
text:"DO Recommendation (mg/L)"
},
grid:{drawOnChartArea:false}
},

x:{
title:{
display:true,
text:"Aeration Tank Zones"
},
grid:{color:"#1f2d3d"}
}

}

},

plugins:[processZones,nitrificationMarker,nitrificationRiskMarker]


});

}
// =================================================== AI Report ====================================================================

function exportAIReport(){

if(!reportData){
alert("Run simulation first");
return;
}

const { jsPDF } = window.jspdf;
let doc = new jsPDF();

let today = new Date().toLocaleDateString();

let y = 20;


/// ================= HEADER =================

try {

let logo = new Image();
logo.src = "logo-header.png";   // ضع هنا اسم ملف الشعار

doc.addImage(logo,"PNG",20,8,35,15);

} catch(e) {

console.log("Logo not loaded");

}

doc.setFont("helvetica","bold");
doc.setFontSize(18);

doc.text("WWTP AI DIGITAL TWIN REPORT",105,15,{align:"center"});

doc.setFont("helvetica","normal");
doc.setFontSize(10);

doc.text("Date: "+today,190,15,{align:"right"});

// Header line
doc.setDrawColor(0,70,140);
doc.setLineWidth(1);
doc.line(20,25,190,25);

y = 35;


// ================= EXECUTIVE SUMMARY =================

doc.setFont("helvetica","bold");
doc.setFontSize(14);

doc.text("EXECUTIVE SUMMARY",20,y);

y += 10;

doc.setFont("helvetica","normal");
doc.setFontSize(11);

let summary =
"The wastewater treatment plant currently operates with MLSS concentration of "
+ reportData.MLSS.toFixed(0)
+ " mg/L and F/M ratio of "
+ reportData.FM.toFixed(3)
+ ". Effluent ammonia concentration is "
+ reportData.NH4out.toFixed(2)
+ " mg/L indicating stable nitrification performance. ";

summary +=
"The clarifier operates with solids loading rate of "
+ reportData.SLR.toFixed(1)
+ " kg/m²/d and utilization of "
+ reportData.clarifierUtilization.toFixed(1)
+ "% which indicates stable clarification conditions.";

doc.text(summary,20,y,{maxWidth:170});

y += 20;


// ================TABLE FUNCTION ===============

function row(label,value){

// ===== TABLE ROW =====

doc.setDrawColor(180);
doc.setLineWidth(0.2);

// horizontal line
doc.line(20,y-3,190,y-3);

// parameter column
doc.setFont("helvetica","normal");
doc.text(label,25,y);

// value column
doc.setFont("helvetica","bold");
doc.text(value,150,y,{align:"right"});

y += 8;

// bottom line
doc.line(20,y-3,190,y-3);

if(y > 270){

doc.addPage();

y = 25;

}

}


// ================= PROCESS PERFORMANCE =================

doc.setFont("helvetica","bold");
doc.setFontSize(13);

doc.text("PROCESS PERFORMANCE",20,y);
doc.setDrawColor(0,102,204);   // Blue
doc.setLineWidth(0.8);
doc.line(20,y+2,190,y+2);
  

y += 10;

doc.setFont("helvetica","normal");
doc.setFontSize(11);

row("MLSS",reportData.MLSS.toFixed(0)+" mg/L");
row("AI Target MLSS",reportData.aiMLSS_target.toFixed(0)+" mg/L");
row("F/M Ratio",reportData.FM.toFixed(3));
row("SRT",reportData.SRT.toFixed(2)+" days");
row("NH4 Effluent",reportData.NH4out.toFixed(2)+" mg/L");
row("Energy Consumption",reportData.energyPerM3.toFixed(2)+" kWh/m³");
row("Plant Health Score",reportData.healthScore+" /100");


// ================= CLARIFIER PERFORMANCE =================

y += 10;

doc.setFont("helvetica","bold");
doc.setFontSize(13);

doc.text("CLARIFIER PERFORMANCE",20,y);
doc.setDrawColor(0,102,204);   // Blue
doc.setLineWidth(0.8);
doc.line(20,y+2,190,y+2);

y += 10;

doc.setFont("helvetica","normal");

row("HLR",reportData.HLR.toFixed(2)+" m/h");
row("Solids Loading Rate",reportData.SLR.toFixed(1)+" kg/m²/d");
row("Settling Velocity",reportData.Vs.toFixed(2)+" m/h");
row("Sludge Flux",reportData.sludgeFlux.toFixed(2)+" kg/m²/h");
row("Critical Flux",reportData.criticalFlux.toFixed(2)+" kg/m²/h");
row("Clarifier Utilization",reportData.clarifierUtilization.toFixed(1)+" %");
row("State Point Condition",reportData.statePointStatus);


// ================= AI OPERATION =================

y += 10;

doc.setFont("helvetica","bold");
doc.setFontSize(13);

doc.text("AI OPERATION STRATEGY",20,y);
doc.setDrawColor(0,102,204);   // Blue
doc.setLineWidth(0.8);
doc.line(20,y+2,190,y+2);

y += 10;

doc.setFont("helvetica","normal");

row("WAS Flow",reportData.WAS.toFixed(0)+" m³/day");
row("RAS Flow",reportData.RAS.toFixed(0)+" m³/day");
row("AI Suggested WAS",reportData.aiWAS.toFixed(0)+" m³/day");
row("AI Suggested RAS",reportData.aiRAS.toFixed(0)+" m³/day");
row("AI Suggested DO",reportData.aiDO.toFixed(2)+" mg/L");

  // ================= DIGITAL TWIN CALIBRATION =================

y += 10;

doc.setFont("helvetica","bold");
doc.setFontSize(13);

doc.text("DIGITAL TWIN CALIBRATION",20,y);
doc.setDrawColor(0,102,204);   // Blue
doc.setLineWidth(0.8);
doc.line(20,y+2,190,y+2);

y += 10;

doc.setFont("helvetica","normal");
doc.setFontSize(11);

row("NH4 Calibration Factor", calibration.NH4_factor.toFixed(2));
row("MLSS Calibration Factor", calibration.MLSS_factor.toFixed(2));
row("SLR Calibration Factor", calibration.SLR_factor.toFixed(2));

  // ===== MODEL ACCURACY =====

let accuracyText = "Not Available";

if(plantData.NH4_real !== null){

let error = Math.abs(plantData.NH4_real - reportData.NH4out) / plantData.NH4_real;

let accuracy = (1 - error) * 100;

accuracyText = accuracy.toFixed(1) + " %";

}

row("Digital Twin Accuracy", accuracyText);

  
// ================= NH4 PROFILE CHART =================

if(y > 170){
doc.addPage();
y = 20;
}

doc.setFont("helvetica","bold");
doc.setFontSize(13);

doc.text("AMMONIA PROFILE ALONG AERATION BASIN",20,y);
doc.setDrawColor(0,102,204);   // Blue
doc.setLineWidth(0.8);
doc.line(20,y+2,190,y+2);

y += 10;

try{

let canvas = document.getElementById("nh4Chart");

if(canvas){

let imgData = canvas.toDataURL("image/png");

doc.addImage(imgData,"PNG",20,y,170,80);

y += 90;

}

}catch(e){

doc.text("NH4 chart not available.",20,y);

}


// ================= CHART INTERPRETATION =================

doc.setFont("helvetica","italic");
doc.setFontSize(10);

doc.text(
"The ammonia profile illustrates the biological nitrification process across aeration zones. "
+"A gradual reduction of ammonia concentration indicates effective ammonia oxidation and sufficient sludge age.",
20,
y,
{maxWidth:170}
);

y += 15;


// ================= PROCESS INTERPRETATION =================

doc.setFont("helvetica","bold");
doc.setFontSize(13);

doc.text("PROCESS INTERPRETATION",20,y);
doc.setDrawColor(0,102,204);   // Blue
doc.setLineWidth(0.8);
doc.line(20,y+2,190,y+2);

y += 10;

doc.setFont("helvetica","normal");
doc.setFontSize(11);

let interpretation = [];

if(reportData.FM > 0.30)
interpretation.push("High organic loading observed in biological reactor.");

if(reportData.SVI > 150)
interpretation.push("Sludge settleability may affect clarifier stability.");

if(reportData.loadingFlux > reportData.sludgeFlux)
interpretation.push("Clarifier approaching solids loading limit.");

if(reportData.NH4out > 5)
interpretation.push("Ammonia concentration slightly elevated.");

if(reportData.healthScore > 80)
interpretation.push("Overall plant performance is stable.");


interpretation.forEach(t=>{
doc.text("- "+t,20,y);
y += 6;
});

y += 10;


// ================= OPERATIONAL RECOMMENDATIONS =================

doc.setFont("helvetica","bold");
doc.setFontSize(13);

doc.text("OPERATIONAL RECOMMENDATIONS",20,y);
doc.setDrawColor(0,102,204);   // Blue
doc.setLineWidth(0.8);
doc.line(20,y+2,190,y+2);

y += 10;

doc.setFont("helvetica","normal");
doc.setFontSize(11);

let rec = [];

if(reportData.FM > 0.30)
rec.push("Increase MLSS concentration or optimize aeration capacity.");

if(reportData.SVI > 150)
rec.push("Monitor filamentous bacteria and optimize sludge age.");

if(reportData.NH4out > 5)
rec.push("Increase SRT or dissolved oxygen to improve nitrification.");

if(reportData.clarifierUtilization > 70)
rec.push("Monitor clarifier solids loading conditions.");

if(rec.length===0)
rec.push("Plant operating within optimal conditions.");

rec.forEach(r=>{
doc.text("- "+r,20,y);
y += 6;
});


// ================= SIGNATURE =================

y += 20;

if(y > 250){
doc.addPage();
y = 40;
}

doc.line(25,y,85,y);
doc.line(125,y,185,y);

doc.text("Process Engineer",55,y+8,{align:"center"});
doc.text("Operations Engineer",155,y+8,{align:"center"});


// ================= FOOTER =================

doc.setFontSize(9);

doc.text(
"Generated by WWTP AI Simulator Digital Twin Platform",
105,
285,
{align:"center"}
);

doc.save("WWTP_AI_Digital_Twin_Report.pdf");

}

// ===== Run AI Analysis=====
async function runAIAnalysis(){

let data = {

MLSS: reportData.MLSS,
FM: reportData.FM,
SRT: reportData.SRT,
NH4: reportData.NH4out,
SVI: reportData.SVI,
SLR: reportData.SLR,
flux: reportData.sludgeFlux,
energy: reportData.energyPerM3

};

try{

let response = await fetch(
"http://127.0.0.1:3000/analyze",
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body: JSON.stringify(data)
}
);

let result = await response.json();

document.getElementById("aiAnalysis").innerText = result;

}
catch(error){

document.getElementById("aiAnalysis").innerText =
"AI analysis failed";

}

}

// =================================================== 24h SIMULATION ====================================================================

let simHour = 0;
let simTimer = null;

function runDailySimulation(){

// ===== Reset Data =====
dailyResults = [];
chartHours = [];
chartFlow = [];
chartMLSS = [];
chartNH4data = [];
chartSLR = [];

dynamicMLSS = null;

document.getElementById("dailyResultsBody").innerHTML = "";

// ===== Save Base Flow =====
if(baseFlowDaily === null){
baseFlowDaily = parseFloat(document.getElementById("flow").value);
}

console.log("24h simulation started");

// ===== Reset Time =====
simHour = 0;

if(simTimer){
clearInterval(simTimer);
}

// ===== Start Simulation Loop =====
simTimer = setInterval(function(){

// ===== Stop After 24 Hours =====
if(simHour >= 24){

clearInterval(simTimer);
drawDailyChart();

console.log("24h simulation completed");

return;

}

// ===== Update Clock =====
let timeEl = document.getElementById("simHour");

if(timeEl){
timeEl.innerText = String(simHour).padStart(2,'0') + ":00";
}

// ===== Dynamic Flow Profile =====
let flowFactor = 1 + 0.3 * Math.sin((2 * Math.PI / 24) * (simHour - 7));

let dynamicFlow = baseFlowDaily * flowFactor;

let flowInput = document.getElementById("flow");

if(flowInput){
flowInput.value = dynamicFlow.toFixed(0);
}

// ===== Apply Dynamic Biomass State =====
if(dynamicMLSS !== null){

let xrInput = document.getElementById("xr");

if(xrInput){
xrInput.value = dynamicMLSS.toFixed(0);
}

}

// ===== Run Plant Simulation =====
runSimulation();

// ===== Dynamic Mass Balance =====
let Y = 0.65;
let kd = 0.08;

let Q = reportData.Q;
let V = reportData.V;

let MLSS_current = reportData.MLSS;

let Load = reportData.FM * V * (MLSS_current/1000);

let growth = Y * Load;
let decay = kd * MLSS_current/1000 * V;

let biomass = MLSS_current/1000 * V;

let biomassNext = biomass + growth - decay;

let MLSS_next = (biomassNext / V) * 1000;

dynamicMLSS = MLSS_next;

// ===== Store Results =====
dailyResults.push({
hour: simHour,
flow: document.getElementById("flow").value,
mlss: reportData.MLSS,
nh4: reportData.NH4out,
slr: reportData.SLR
});

// ===== Update Chart Data =====
chartHours.push(simHour);
chartFlow.push(parseFloat(reportData.Q));
chartMLSS.push(reportData.MLSS);
chartNH4data.push(reportData.NH4out);
chartSLR.push(reportData.SLR);

// ===== Update Results Table =====
let table = document.getElementById("dailyResultsBody");

if(table){

let row = table.insertRow();

row.insertCell(0).innerText = simHour + ":00";
row.insertCell(1).innerText = dailyResults[dailyResults.length-1].flow;
row.insertCell(2).innerText = dailyResults[dailyResults.length-1].mlss.toFixed(0);
row.insertCell(3).innerText = dailyResults[dailyResults.length-1].nh4.toFixed(2);
row.insertCell(4).innerText = dailyResults[dailyResults.length-1].slr.toFixed(1);

}

// ===== Next Hour =====
simHour++;

},1000);

}
// ===================================================  Draw Daily Chart  ====================================================================

function drawDailyChart(){
 if(!simulationStarted){

const canvas = document.getElementById("dailyChart");
const ctx = canvas.getContext("2d");

ctx.clearRect(0,0,canvas.width,canvas.height);

// خلفية خفيفة
ctx.fillStyle = "rgba(0,0,0,0.25)";
ctx.fillRect(0,0,canvas.width,canvas.height);

// النص الرئيسي
ctx.fillStyle = "#00e5ff";
ctx.font = "bold 22px Arial";
ctx.textAlign = "center";

ctx.fillText(
"SYSTEM IDLE",
canvas.width/2,
canvas.height/2 - 20
);

// النص الثاني
ctx.fillStyle = "#ffffff";
ctx.font = "16px Arial";

ctx.fillText(
"Press AI24 to Start Simulation",
canvas.width/2,
canvas.height/2 + 20
);

return;
}

const canvas = document.getElementById("dailyChart");
if(!canvas) return;

const ctx = canvas.getContext("2d");

if(typeof dailyChart !== "undefined" && dailyChart){
dailyChart.destroy();
}

dailyChart = new Chart(ctx,{

type:'line',

data:{
labels: chartHours.map(h => h + ":00"),

datasets:[

{
label:'Flow (m3/d)',
data:flowData,
borderColor:'#2aa1ff',
tension:0.35,
yAxisID:'yFlow'
},

{
label:'MLSS (mg/L)',
data:mlssData,
borderColor:'#00ff9c',
tension:0.35,
yAxisID:'yMLSS'
},

{
label:'NH4 (mg/L)',
data:nh4Data,
borderColor:'#ffd000',
tension:0.35,
yAxisID:'yNH4'
},

{
label:'SLR (kg/m2/d)',
data:slrData,
borderColor:'#ff4d4d',
tension:0.35,
yAxisID:'ySLR'
}

]

},

options:{
responsive:true,
maintainAspectRatio:false,

interaction:{
mode:'index',
intersect:false
},

stacked:false,

scales:{

yFlow:{
type:'linear',
position:'left',
title:{
display:true,
text:'Flow (m³/d)'
}
},

yMLSS:{
type:'linear',
position:'right',
grid:{ drawOnChartArea:false },
title:{
display:true,
text:'MLSS (mg/L)'
}
},

yNH4:{
type:'linear',
position:'right',
grid:{ drawOnChartArea:false },
title:{
display:true,
text:'NH4 (mg/L)'
}
},

ySLR:{
type:'linear',
position:'right',
grid:{ drawOnChartArea:false },
title:{
display:true,
text:'SLR (kg/m²/d)'
}
}

}

}

});

}


// ==================================================================================================================
// SHOW APPLICATION VERSION
// ==================================================================================================================
function showAppVersion() {
    const versionElement = document.getElementById("appVersion");

    if (versionElement) {
        versionElement.innerText =
        `${APP_INFO.name} — ${APP_INFO.version}`;
    }
}

document.addEventListener("DOMContentLoaded", showAppVersion);

// ================================================== FLOWSHEET UPDATE =============================================================

function updateFlowsheet(){

if(!reportData) return;

function set(id,value){

let el=document.getElementById(id);

if(el) el.innerText=value;

}

set("fsFlow", reportData.Q.toFixed(0));
set("fsMLSS", reportData.MLSS.toFixed(0));
set("fsSRT", reportData.SRT.toFixed(1));
set("fsNH4", reportData.NH4out.toFixed(2));
set("fsSLR", reportData.SLR.toFixed(1));
set("fsSVI", reportData.SVI.toFixed(0));
set("fsRAS", reportData.RAS.toFixed(0));
set("fsWAS", reportData.WAS.toFixed(0));

updateFlowsheetStatus();

}


function updateFlowsheetStatus(){

let aeration = document.querySelector(".aeration");
let clarifier = document.querySelector(".clarifier");
let effluent = document.querySelector(".effluent");

if(!reportData) return;

// Reset classes
[aeration,clarifier,effluent].forEach(el=>{
if(el){
el.classList.remove("stable","warning","critical");
}
});

// Aeration condition

if(reportData.FM > 0.45){

aeration.classList.add("warning");

}

else{

aeration.classList.add("stable");

}

// Clarifier condition

if(reportData.clarifierUtilization > 90){

clarifier.classList.add("critical");

}

else if(reportData.clarifierUtilization > 70){

clarifier.classList.add("warning");

}

else{

clarifier.classList.add("stable");

}

// Effluent condition

if(reportData.NH4out > 10){

effluent.classList.add("critical");

}

else if(reportData.NH4out > 5){

effluent.classList.add("warning");

}

else{

effluent.classList.add("stable");

}

}

// ===================================================== UNIT PANEL =====================================================

function openUnitPanel(unit){

if(!reportData) return;

document.getElementById("unitPanel").style.display="flex";

if(unit==="aeration"){

document.getElementById("unitTitle").innerText="Aeration Tank";

document.getElementById("panelMLSS").innerText=
reportData.MLSS.toFixed(0)+" mg/L";

document.getElementById("panelSRT").innerText=
reportData.SRT.toFixed(1)+" days";

document.getElementById("panelFM").innerText=
reportData.FM.toFixed(3);

document.getElementById("panelNH4").innerText=
reportData.NH4out.toFixed(2)+" mg/L";

document.getElementById("panelEnergy").innerText=
reportData.energyPerM3.toFixed(2)+" kWh/m³";

}

}

function closeUnitPanel(){

document.getElementById("unitPanel").style.display="none";

}

// ================= OPERATOR CONTROL ============================

function applyOperatorControl(){

let DO = parseFloat(document.getElementById("ctrlDO").value);
let WAS = parseFloat(document.getElementById("ctrlWAS").value);
let RAS = parseFloat(document.getElementById("ctrlRAS").value);

if(isNaN(DO) || isNaN(WAS) || isNaN(RAS)){

alert("Please enter valid control values");

return;

}

// store operator settings

window.operatorControl = {

DO: DO,
WAS: WAS,
RAS: RAS

};

console.log("Operator control applied:", window.operatorControl);

// run simulation again

runSimulation();

closeUnitPanel();

}

// ================= PROCESS ALARM =================

function updateProcessAlarm(){

let alarmBox = document.getElementById("processAlarm");

if(!alarmBox || !reportData) return;

alarmBox.classList.remove("warning","critical");

let message = "SYSTEM STATUS: NORMAL";

// NH4 alarm

if(reportData.NH4out > 10){

alarmBox.classList.add("critical");

message = "⚠ HIGH AMMONIA IN EFFLUENT";

}

// Clarifier overload

else if(reportData.clarifierUtilization > 90){

alarmBox.classList.add("critical");

message = "⚠ CLARIFIER OVERLOAD";

}

// Bulking

else if(reportData.SVI > 180){

alarmBox.classList.add("warning");

message = "⚠ SLUDGE BULKING RISK";

}

// Energy

else if(reportData.energyPerM3 > 1.5){

alarmBox.classList.add("warning");

message = "⚠ HIGH ENERGY CONSUMPTION";

}

alarmBox.innerText = message;

}

// ================= PROCESS GAUGES =================

function createGauge(canvasId,label,maxValue){

return new Chart(

document.getElementById(canvasId),

{

type:"doughnut",

data:{

labels:[label],

datasets:[{

data:[0,maxValue],

backgroundColor:["#00ff90","#1c2b40"],

borderWidth:0

}]

},

options:{

cutout:"70%",

plugins:{legend:{display:false}},

rotation:-90,

circumference:180

}

}

);

}

function updateGauges(){

if(!reportData) return;

// create gauges once

if(!gaugeMLSS){

gaugeMLSS=createGauge("gaugeMLSS","MLSS",8000);
gaugeNH4=createGauge("gaugeNH4","NH4",15);
gaugeEnergy=createGauge("gaugeEnergy","Energy",2);

}

// update values

gaugeMLSS.data.datasets[0].data=[reportData.MLSS,8000-reportData.MLSS];
gaugeNH4.data.datasets[0].data=[reportData.NH4out,15-reportData.NH4out];
gaugeEnergy.data.datasets[0].data=[reportData.energyPerM3,2-reportData.energyPerM3];

gaugeMLSS.update();
gaugeNH4.update();
gaugeEnergy.update();

// text values

document.getElementById("gMLSS").innerText=
reportData.MLSS.toFixed(0)+" mg/L";

document.getElementById("gNH4").innerText=
reportData.NH4out.toFixed(2)+" mg/L";

document.getElementById("gEnergy").innerText=
reportData.energyPerM3.toFixed(2)+" kWh/m³";

}

// ================= BIOWIN DASHBOARD =================

function updateBioWinDashboard(){

if(!reportData) return;

// values

document.getElementById("bioMLSS").innerText=
reportData.MLSS.toFixed(0);

document.getElementById("bioSRT").innerText=
reportData.SRT.toFixed(1);

document.getElementById("bioFM").innerText=
reportData.FM.toFixed(3);

document.getElementById("bioNH4").innerText=
reportData.NH4out.toFixed(2);

document.getElementById("bioEnergy").innerText=
reportData.energyPerM3.toFixed(2);

// bars

document.getElementById("barMLSSbio").style.width=
Math.min(reportData.MLSS/8000*100,100)+"%";

document.getElementById("barSRTbio").style.width=
Math.min(reportData.SRT/30*100,100)+"%";

document.getElementById("barFMbio").style.width=
Math.min(reportData.FM/0.6*100,100)+"%";

document.getElementById("barNH4bio").style.width=
Math.min(reportData.NH4out/15*100,100)+"%";

document.getElementById("barEnergybio").style.width=
Math.min(reportData.energyPerM3/2*100,100)+"%";

}

// ===== TAB NAVIGATION =====

function openTab(tabName){

let sections = document.querySelectorAll(".tab-content");

sections.forEach(section=>{
section.classList.remove("active");
});

let target = document.getElementById(tabName);

if(target){
target.classList.add("active");
}

}


// ===== ==================================================V14 STEP 3 – DRAW PROCESS TRAINS =======================================================

function generateTrains(aerationTanks, clarifierNumber, clarifierFlows, slrPerClarifier){

  let container = document.getElementById("trainContainer");
  if(!container) return;

  container.innerHTML = "";

// ===== Dynamic Tank Width =====
let tankWidth = Math.max(80, 220 - (clarifierNumber * 10));

  // ===== AERATION =====
 let aerRow = document.createElement("div");
aerRow.style.display = "flex";
aerRow.style.gap = "20px";
aerRow.style.flexWrap = "wrap";
aerRow.style.justifyContent = "center";
  aerRow.style.marginTop = "10px";

  for(let i = 0; i < aerationTanks; i++){

    let aer = document.createElement("div");
    aer.className = "process aeration";
    aer.style.width = tankWidth + "px";

    aer.innerHTML = `
      <div class="process-title">Aeration ${i+1}</div>
    `;

    aerRow.appendChild(aer);
  }

  container.appendChild(aerRow);

  // ===== SPLIT =====
  let split = document.createElement("div");
  split.innerHTML = "SPLIT";
  split.style.textAlign = "center";
  split.style.margin = "15px";
  split.style.color = "#00ffe5";
    
  split.style.fontWeight = "bold";
  split.style.fontSize = "16px";
  split.style.letterSpacing = "2px";
  let verticalLine = document.createElement("div");
  verticalLine.className = "split-line";

container.appendChild(verticalLine);
    
 container.appendChild(split);
  // ===== DISTRIBUTION LINE =====
let distLine = document.createElement("div");
distLine.className = "split-distribution";
distLine.style.maxWidth = "900px";
distLine.style.margin = "10px auto";

container.appendChild(distLine);

// ===== CLARIFIERS =====
let clRow = document.createElement("div");
clRow.style.display = "flex";
clRow.style.gap = "20px";
clRow.style.flexWrap = "wrap";
clRow.style.justifyContent = "center";

for(let i = 0; i < clarifierNumber; i++){

 let cl = document.createElement("div");
cl.className = "process clarifier";
let slr = slrPerClarifier ? slrPerClarifier[i] : 0;

// ===== COLOR INDICATOR =====
if(slr > 200){
  cl.style.border = "2px solid #ff4d4d"; // red
}
else if(slr > 120){
  cl.style.border = "2px solid #f1c40f"; // yellow
}
else{
  cl.style.border = "2px solid #00ff90"; // green
}
cl.style.width = tankWidth + "px";

let flow = clarifierFlows ? clarifierFlows[i].toFixed(0) : "--";
let slrVal = slrPerClarifier ? slrPerClarifier[i].toFixed(1) : "--";

cl.innerHTML = `
<div class="process-title">Clarifier ${i+1}</div>
<div class="process-value">
Flow: ${flow} m³/d<br>
SLR: ${slrVal}
</div>
`;
  clRow.appendChild(cl);
}

container.appendChild(clRow);

}

