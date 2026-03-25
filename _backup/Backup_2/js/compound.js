function calcularInteres() {
  const capital = parseFloat(document.getElementById("capital").value) || 0;
  const tasa = parseFloat(document.getElementById("tasa").value) / 100 || 0;
  const años = parseInt(document.getElementById("años").value) || 0;
  const aporte = parseFloat(document.getElementById("aporte").value) || 0;

  let total = capital;

  for (let i = 0; i < años * 12; i++) {
    total += aporte;
    total *= (1 + tasa / 12);
  }

  document.getElementById("resultado").innerText =
    "Valor final: $" + total.toFixed(2);
}