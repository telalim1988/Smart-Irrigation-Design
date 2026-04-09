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

  // 🔹 عرض النتيجة
  document.querySelectorAll(".box span")[0].innerText = flow.toFixed(2);

}
