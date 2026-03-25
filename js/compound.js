let lineChartInstance = null;
let pieChartInstance = null;
let areaChartInstance = null;

function formatCurrency(value) {
  return new Intl.NumberFormat("es-CH", {
    style: "currency",
    currency: "CHF",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function mostrarError(message) {
  const errorEl = document.getElementById("compoundError");
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

function ocultarError() {
  const errorEl = document.getElementById("compoundError");
  errorEl.textContent = "";
  errorEl.classList.add("hidden");
}

function updateAnnual() {
  const monthly = parseFloat(document.getElementById("monthly").value) || 0;
  document.getElementById("annual").value = (monthly * 12).toFixed(2);
}

function limpiarGraficos() {
  if (lineChartInstance) lineChartInstance.destroy();
  if (pieChartInstance) pieChartInstance.destroy();
  if (areaChartInstance) areaChartInstance.destroy();
}

function renderTable(rows) {
  const tbody = document.getElementById("compoundTableBody");

  if (!rows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="compound-empty">No hay datos para mostrar.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = rows.map(row => `
    <tr>
      <td>${row.year}</td>
      <td>${row.age}</td>
      <td>${formatCurrency(row.capitalAportado)}</td>
      <td>${formatCurrency(row.interesTotal)}</td>
      <td>${formatCurrency(row.capitalGenerado)}</td>
    </tr>
  `).join("");
}

function renderSummary(finalContributed, finalGenerated) {
  const finalInterest = finalGenerated - finalContributed;

  document.getElementById("finalContributed").textContent = formatCurrency(finalContributed);
  document.getElementById("finalGenerated").textContent = formatCurrency(finalGenerated);
  document.getElementById("finalInterest").textContent = formatCurrency(finalInterest);
}

function renderCharts(labels, aportado, generado, interes, finalContributed, finalGenerated) {
  limpiarGraficos();

  const lineCtx = document.getElementById("lineChart").getContext("2d");
  lineChartInstance = new Chart(lineCtx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Capital Aportado",
          data: aportado,
          borderColor: "#58a6ff",
          backgroundColor: "rgba(88, 166, 255, 0.15)",
          borderWidth: 3,
          fill: false,
          tension: 0.35,
          pointRadius: 4
        },
        {
          label: "Capital Generado",
          data: generado,
          borderColor: "#2ea043",
          backgroundColor: "rgba(46, 160, 67, 0.15)",
          borderWidth: 3,
          fill: false,
          tension: 0.35,
          pointRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: "#e6edf3" }
        }
      },
      scales: {
        x: {
          ticks: { color: "#e6edf3" },
          grid: { color: "#30363d" }
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#e6edf3" },
          grid: { color: "#30363d" }
        }
      }
    }
  });

  const pieCtx = document.getElementById("pieChart").getContext("2d");
  pieChartInstance = new Chart(pieCtx, {
    type: "doughnut",
    data: {
      labels: ["Capital Aportado", "Interés Generado"],
      datasets: [{
        data: [finalContributed, Math.max(finalGenerated - finalContributed, 0)],
        backgroundColor: ["#58a6ff", "#2ea043"],
        borderColor: "#161b22",
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#e6edf3" }
        }
      }
    }
  });

  const areaCtx = document.getElementById("areaChart").getContext("2d");
  areaChartInstance = new Chart(areaCtx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Interés Acumulado",
        data: interes,
        borderColor: "#f2cc60",
        backgroundColor: "rgba(242, 204, 96, 0.20)",
        borderWidth: 3,
        fill: true,
        tension: 0.35,
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: "#e6edf3" }
        }
      },
      scales: {
        x: {
          ticks: { color: "#e6edf3" },
          grid: { color: "#30363d" }
        },
        y: {
          beginAtZero: true,
          ticks: { color: "#e6edf3" },
          grid: { color: "#30363d" }
        }
      }
    }
  });
}

function calcularCompound() {
  ocultarError();

  const principal = parseFloat(document.getElementById("principal").value);
  const monthly = parseFloat(document.getElementById("monthly").value);
  const ratePercent = parseFloat(document.getElementById("rate").value);
  const years = parseInt(document.getElementById("years").value, 10);
  const age = parseInt(document.getElementById("age").value, 10);

  if (
    isNaN(principal) ||
    isNaN(monthly) ||
    isNaN(ratePercent) ||
    isNaN(years) ||
    isNaN(age)
  ) {
    mostrarError("Por favor, completa todos los campos con valores válidos.");
    return;
  }

  if (principal < 0 || monthly < 0 || ratePercent < 0 || years <= 0 || age <= 0) {
    mostrarError("Revisa los datos: no puede haber valores negativos y los años/edad deben ser mayores que cero.");
    return;
  }

  const monthlyRate = (ratePercent / 100) / 12;
  const totalMonths = years * 12;

  const rows = [];
  const labels = [];
  const aportadoData = [];
  const generadoData = [];
  const interesData = [];

  for (let y = 1; y <= years; y++) {
    const periods = y * 12;

    let fvMonthly;
    if (monthlyRate !== 0) {
      fvMonthly = monthly * (((1 + monthlyRate) ** periods - 1) / monthlyRate);
    } else {
      fvMonthly = monthly * periods;
    }

    const fvPrincipal = principal * ((1 + monthlyRate) ** periods);
    const totalAtYear = fvPrincipal + fvMonthly;
    const contributedAtYear = principal + (monthly * periods);
    const interestAtYear = totalAtYear - contributedAtYear;

    rows.push({
      year: y,
      age: age + y - 1,
      capitalAportado: contributedAtYear,
      interesTotal: interestAtYear,
      capitalGenerado: totalAtYear
    });

    labels.push(age + y - 1);
    aportadoData.push(Number(contributedAtYear.toFixed(2)));
    generadoData.push(Number(totalAtYear.toFixed(2)));
    interesData.push(Number(interestAtYear.toFixed(2)));
  }

  let finalGenerated;
  if (monthlyRate !== 0) {
    finalGenerated =
      principal * ((1 + monthlyRate) ** totalMonths) +
      monthly * (((1 + monthlyRate) ** totalMonths - 1) / monthlyRate);
  } else {
    finalGenerated = principal + (monthly * totalMonths);
  }

  const finalContributed = principal + (monthly * totalMonths);

  renderTable(rows);
  renderSummary(finalContributed, finalGenerated);
  renderCharts(
    labels,
    aportadoData,
    generadoData,
    interesData,
    Number(finalContributed.toFixed(2)),
    Number(finalGenerated.toFixed(2))
  );
}

document.addEventListener("DOMContentLoaded", () => {
  const monthlyInput = document.getElementById("monthly");
  if (monthlyInput) {
    monthlyInput.addEventListener("input", updateAnnual);
  }
  updateAnnual();
});