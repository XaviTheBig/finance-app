let currentYear = new Date().getFullYear();
let years = [];

for (let i = -7; i <= 2; i++) {
  years.push(currentYear + i);
}

let filaAnios = document.getElementById("filaAnios");
let filaEPS = document.getElementById("filaEPS");
let filaGrowth = document.getElementById("filaGrowth");

let chart;
let chartPrecio;
let ultimoResumenTikr = null;

function renderYearInputs(newYears = years) {
  years = newYears.map(Number);

  filaAnios.innerHTML = "<th>Año</th>";
  filaEPS.innerHTML = "<th>EPS</th>";
  filaGrowth.innerHTML = "<th>Growth</th>";

  years.forEach((year, index) => {
    filaAnios.innerHTML += `<td>${year}</td>`;
    filaEPS.innerHTML += `<td><input type="number" step="0.01" id="eps${index}"></td>`;
    filaGrowth.innerHTML += `<td id="growth${index}"></td>`;
  });

  if (years.length >= 10) {
    document.getElementById("year1").innerText = years[7];
    document.getElementById("year2").innerText = years[8];
    document.getElementById("year3").innerText = years[9];
  }
}

renderYearInputs(years);

function aplicarColor(id, valor) {
  let el = document.getElementById(id);
  if (!el) return;
  if (valor > 0) el.style.color = "lime";
  else if (valor < 0) el.style.color = "red";
  else el.style.color = "white";
}

function calcularTIR(valorFuturo, precioActual, años) {
  if (!valorFuturo || !precioActual || valorFuturo <= 0 || precioActual <= 0) return NaN;
  return Math.pow(valorFuturo / precioActual, 1 / años) - 1;
}

function calcularCAGR(epsInicial, epsFinal, años) {
  if (!epsInicial || !epsFinal || epsInicial <= 0 || epsFinal <= 0 || años <= 0) return NaN;
  return Math.pow(epsFinal / epsInicial, 1 / años) - 1;
}

function mostrarTIR(id, valor) {
  let el = document.getElementById(id);
  if (!el) return;
  if (!Number.isFinite(valor)) {
    el.innerText = "—";
    return;
  }
  let porcentaje = valor * 100;
  el.innerText = porcentaje.toFixed(1) + "%";
  aplicarColor(id, porcentaje);
}

function setImportStatus(msg, tipo = "info") {
  const el = document.getElementById("tikrImportStatus");
  if (!el) return;
  el.textContent = msg;
  el.className = "import-status " + tipo;
}

function limpiarImportTikr() {
  const textarea = document.getElementById("pasteEPS");
  if (textarea) textarea.value = "";
  setImportStatus("", "info");
}

function normalizeLine(line) {
  return line.replace(/\s+/g, " ").trim();
}

function getYearFromDateHeader(token) {
  const match = token.match(/\b\d{1,2}\/\d{1,2}\/(\d{2,4})\b/);
  if (!match) return null;
  let y = Number(match[1]);
  if (y < 100) y += 2000;
  return y;
}

function extractYearsFromHeader(line) {
  const matches = [...line.matchAll(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g)];
  return matches.map(m => getYearFromDateHeader(m[0])).filter(Boolean);
}

function parseNumberToken(token) {
  if (!token) return null;
  let cleaned = String(token)
    .replace(/[$€£]/g, "")
    .replace(/,/g, "")
    .replace(/x/gi, "")
    .replace(/%/g, "")
    .trim();

  let negative = false;
  if (/^\(.*\)$/.test(cleaned)) {
    negative = true;
    cleaned = cleaned.replace(/[()]/g, "");
  }

  if (cleaned === "" || cleaned.toUpperCase() === "PRO") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return negative ? -value : value;
}

function splitTikrLine(line) {
  return line
    .split(/\t+/)
    .map(c => c.trim())
    .filter(c => c !== "");
}

function findLine(lines, labels) {
  const normalizedLabels = labels.map(l => l.toLowerCase());
  return lines.find(line => {
    const lower = normalizeLine(line).toLowerCase();
    return normalizedLabels.some(label => lower.startsWith(label));
  }) || null;
}

function extractRowValues(line, labelCandidates) {
  if (!line) return [];
  let row = line;
  for (const label of labelCandidates) {
    const re = new RegExp("^" + label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    row = row.replace(re, "");
  }

  const parts = splitTikrLine(row);
  if (parts.length > 1) {
    return parts.map(parseNumberToken).filter(v => v !== null);
  }

  const matches = [...row.matchAll(/\(?-?[$€£]?\d[\d,]*(?:\.\d+)?\)?\s*x?%?/gi)];
  return matches.map(m => parseNumberToken(m[0])).filter(v => v !== null);
}

function average(values) {
  const clean = values.filter(Number.isFinite);
  if (!clean.length) return NaN;
  return clean.reduce((a, b) => a + b, 0) / clean.length;
}

function lastFinite(values) {
  for (let i = values.length - 1; i >= 0; i--) {
    if (Number.isFinite(values[i])) return values[i];
  }
  return NaN;
}

function inferTableType(lines) {
  const joined = lines.join("\n").toLowerCase();
  if (joined.includes("actuals & forward estimates")) return "estimates";
  if (joined.includes("multiples | tikr.com")) return "multiples";
  return "unknown";
}

function splitDateValuesAndCagr(values, yearsCount) {
  // En la tabla de Estimates, TIKR suele añadir una columna final "CAGR".
  // Para rellenar la calculadora usamos solo los valores alineados con fechas.
  if (yearsCount && values.length > yearsCount) {
    return { values: values.slice(0, yearsCount), cagr: values[yearsCount] };
  }
  return { values, cagr: NaN };
}

function parseTikrTable(rawText) {
  const lines = rawText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  const headerLine = lines.find(line => /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(line));
  const allYears = headerLine ? extractYearsFromHeader(headerLine) : [];
  const tableType = inferTableType(lines);

  const epsNormalizedLine = findLine(lines, ["EPS Normalized"]);
  const epsGaapLine = findLine(lines, ["EPS (GAAP)"]);
  const epsDilutedLine = findLine(lines, ["LTM Diluted EPS Before Extra"]);
  const peLine = findLine(lines, ["LTM Price / Diluted EPS (P/E)"]);
  const ntmPeLine = findLine(lines, ["NTM Price / Normalized Earnings (P/E)"]);
  const priceLine = lines.find(line => {
    const lower = normalizeLine(line).toLowerCase();
    return lower.startsWith("price close") || lower === "price" || lower.startsWith("price ");
  }) || null;

  const revenueLine = findLine(lines, ["Revenue"]);
  const ebitMarginLine = findLine(lines, ["% EBIT Margins"]);
  const netIncomeMarginLine = findLine(lines, ["% Net Income Margins"]);
  const roeLine = findLine(lines, ["Return on Equity (%)"]);
  const fcfLine = findLine(lines, ["Free Cash Flow"]);
  const fcfMarginLine = findLine(lines, ["% Free Cash Flow Margins"]);

  const rawEpsValues = epsNormalizedLine
    ? extractRowValues(epsNormalizedLine, ["EPS Normalized"])
    : epsDilutedLine
      ? extractRowValues(epsDilutedLine, ["LTM Diluted EPS Before Extra"])
      : epsGaapLine
        ? extractRowValues(epsGaapLine, ["EPS (GAAP)"])
        : [];

  const epsSeries = splitDateValuesAndCagr(rawEpsValues, allYears.length);

  const peValues = peLine ? extractRowValues(peLine, ["LTM Price / Diluted EPS (P/E)"]) : [];
  const ntmPeValues = ntmPeLine ? extractRowValues(ntmPeLine, ["NTM Price / Normalized Earnings (P/E)"]) : [];
  const priceValues = priceLine ? extractRowValues(priceLine, ["Price Close", "Price"]) : [];

  const revenueSeries = splitDateValuesAndCagr(revenueLine ? extractRowValues(revenueLine, ["Revenue"]) : [], allYears.length);
  const ebitMarginSeries = splitDateValuesAndCagr(ebitMarginLine ? extractRowValues(ebitMarginLine, ["% EBIT Margins"]) : [], allYears.length);
  const netIncomeMarginSeries = splitDateValuesAndCagr(netIncomeMarginLine ? extractRowValues(netIncomeMarginLine, ["% Net Income Margins"]) : [], allYears.length);
  const roeSeries = splitDateValuesAndCagr(roeLine ? extractRowValues(roeLine, ["Return on Equity (%)"]) : [], allYears.length);
  const fcfSeries = splitDateValuesAndCagr(fcfLine ? extractRowValues(fcfLine, ["Free Cash Flow"]) : [], allYears.length);
  const fcfMarginSeries = splitDateValuesAndCagr(fcfMarginLine ? extractRowValues(fcfMarginLine, ["% Free Cash Flow Margins"]) : [], allYears.length);

  return {
    tableType,
    allYears,
    epsValues: epsSeries.values,
    epsCagrTikr: epsSeries.cagr,
    epsSource: epsNormalizedLine ? "EPS Normalized" : epsDilutedLine ? "LTM Diluted EPS Before Extra" : epsGaapLine ? "EPS (GAAP)" : null,
    peValues,
    ntmPeValues,
    priceValues,
    revenueValues: revenueSeries.values,
    revenueCagrTikr: revenueSeries.cagr,
    ebitMargins: ebitMarginSeries.values,
    ebitMarginCagrTikr: ebitMarginSeries.cagr,
    netIncomeMargins: netIncomeMarginSeries.values,
    roeValues: roeSeries.values,
    fcfValues: fcfSeries.values,
    fcfCagrTikr: fcfSeries.cagr,
    fcfMargins: fcfMarginSeries.values
  };
}

function takeAlignedLastN(yearsInput, valuesInput, n = 10) {
  if (!valuesInput.length) return { years: [], values: [] };
  const count = Math.min(n, valuesInput.length, yearsInput.length || valuesInput.length);
  const values = valuesInput.slice(-count);
  const selectedYears = yearsInput.length ? yearsInput.slice(-count) : values.map((_, i) => currentYear - count + 1 + i);
  return { years: selectedYears, values };
}

function setInputValue(id, value, decimals = 2) {
  const el = document.getElementById(id);
  if (!el || !Number.isFinite(value)) return;
  el.value = Number(value).toFixed(decimals);
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function fillFromTikr(parsed) {
  const aligned = takeAlignedLastN(parsed.allYears, parsed.epsValues, 10);
  if (aligned.values.length < 3) {
    throw new Error("No se han encontrado suficientes datos de EPS en la tabla pegada.");
  }

  renderYearInputs(aligned.years);
  aligned.values.forEach((val, i) => setInputValue("eps" + i, val, 2));

  if (parsed.peValues.length) {
    const cleanPe = parsed.peValues.filter(Number.isFinite);
    const perBajo = Math.min(...cleanPe);
    const perHistorico = average(cleanPe);
    const perEstimado = parsed.ntmPeValues.length ? lastFinite(parsed.ntmPeValues) : lastFinite(cleanPe);

    setInputValue("perBajo", perBajo, 2);
    setInputValue("perHistorico", perHistorico, 2);
    setInputValue("perEstimado", perEstimado, 2);
  }

  if (parsed.priceValues.length) {
    setInputValue("precioActual", lastFinite(parsed.priceValues), 2);
  }

  updateTikrSummary(parsed, aligned);
}

function formatPercent(value) {
  return Number.isFinite(value) ? value.toFixed(1) + "%" : "—";
}

function calcCagrFromValues(values) {
  const firstIndex = values.findIndex(v => Number.isFinite(v) && v > 0);
  const lastIndex = values.map(v => Number.isFinite(v) && v > 0).lastIndexOf(true);
  if (firstIndex < 0 || lastIndex <= firstIndex) return NaN;
  return calcularCAGR(values[firstIndex], values[lastIndex], lastIndex - firstIndex) * 100;
}

function updateTikrSummary(parsed, aligned) {
  const epsCagr = Number.isFinite(parsed.epsCagrTikr) ? parsed.epsCagrTikr : calcCagrFromValues(aligned.values);
  const revenueCagr = Number.isFinite(parsed.revenueCagrTikr) ? parsed.revenueCagrTikr : calcCagrFromValues(parsed.revenueValues);
  const lastEbitMargin = lastFinite(parsed.ebitMargins);
  const lastRoe = lastFinite(parsed.roeValues);
  const lastFcf = lastFinite(parsed.fcfValues);
  const lastFcfMargin = lastFinite(parsed.fcfMargins);
  const lastNetMargin = lastFinite(parsed.netIncomeMargins);

  setText("tikrCagrEPS", formatPercent(epsCagr));
  setText("tikrCagrRevenue", formatPercent(revenueCagr));
  setText("tikrLastEbitMargin", formatPercent(lastEbitMargin));
  setText("tikrLastRoe", formatPercent(lastRoe));
  setText("tikrLastFcf", Number.isFinite(lastFcf) ? lastFcf.toLocaleString("es-ES") : "—");

  const insights = [];
  insights.push(`<p><strong>Fuente EPS detectada:</strong> ${parsed.epsSource || "No detectada"}.</p>`);

  if (Number.isFinite(epsCagr)) {
    insights.push(`<p><strong>CAGR EPS:</strong> ${formatPercent(epsCagr)}. ${epsCagr >= 15 ? "Crecimiento fuerte." : epsCagr >= 8 ? "Crecimiento razonable." : "Crecimiento moderado o débil."}</p>`);
  }

  if (Number.isFinite(lastEbitMargin)) {
    insights.push(`<p><strong>Margen EBIT último:</strong> ${formatPercent(lastEbitMargin)}. ${lastEbitMargin >= 25 ? "Margen muy alto." : lastEbitMargin >= 15 ? "Margen sólido." : "Margen bajo o normal."}</p>`);
  }

  if (Number.isFinite(lastRoe)) {
    insights.push(`<p><strong>ROE último:</strong> ${formatPercent(lastRoe)}. ${lastRoe >= 20 ? "Rentabilidad sobre capital muy buena." : lastRoe >= 12 ? "Rentabilidad aceptable." : "Rentabilidad baja."}</p>`);
  }

  if (Number.isFinite(lastFcfMargin)) {
    insights.push(`<p><strong>Margen FCF último:</strong> ${formatPercent(lastFcfMargin)}. ${lastFcfMargin < 10 ? "Atención: la conversión a caja parece débil en el último dato." : "Conversión a caja razonable."}</p>`);
  }

  if (parsed.fcfValues.length >= 2) {
    const prev = parsed.fcfValues[parsed.fcfValues.length - 2];
    const last = lastFinite(parsed.fcfValues);
    if (Number.isFinite(prev) && Number.isFinite(last) && prev !== 0) {
      const change = ((last - prev) / Math.abs(prev)) * 100;
      insights.push(`<p><strong>FCF último vs año anterior:</strong> ${formatPercent(change)}. ${change < -30 ? "Caída fuerte; conviene revisar CapEx, inversión en IA/datacenters u otros factores." : "Sin alerta fuerte por variación anual."}</p>`);
    }
  }

  insights.push(`<p class="helper-text"><strong>Nota:</strong> estos insights son automáticos. Revisa siempre si los datos pegados son históricos, estimados o mezcla de ambos antes de tomar una decisión.</p>`);

  setText("tikrInsights", "");
  const box = document.getElementById("tikrInsights");
  if (box) box.innerHTML = insights.join("");

  ultimoResumenTikr = {
    epsCagr,
    revenueCagr,
    lastEbitMargin,
    lastNetMargin,
    lastRoe,
    lastFcf,
    lastFcfMargin
  };
}

// TICKER
function setTicker() {
  let input = document.getElementById("inputTicker");
  let output = document.getElementById("tickerNombre");
  if (!input || !output) return;
  output.innerText = "Activo: " + input.value;
}

// PEGAR DATOS
function pegarDatos() {
  let texto = document.getElementById("pasteEPS").value;
  if (!texto.trim()) return;

  try {
    const parsed = parseTikrTable(texto);
    const looksLikeTikr = parsed.epsValues.length || parsed.peValues.length || parsed.revenueValues.length;

    if (looksLikeTikr) {
      fillFromTikr(parsed);
      setImportStatus("Tabla TIKR cargada correctamente. Revisa los PER sugeridos antes de calcular.", "ok");
      return;
    }
  } catch (error) {
    setImportStatus(error.message, "error");
    return;
  }

  // Fallback: mantiene la lógica antigua para pegar solo una lista de EPS.
  let valores = texto.match(/-?\d+(\.\d+)?/g);
  if (!valores) return;
  valores = valores.map(Number);
  let ultimos = valores.slice(-10);
  ultimos.forEach((val, i) => {
    let input = document.getElementById("eps" + i);
    if (input) input.value = val;
  });
  setImportStatus("Lista simple de EPS cargada.", "ok");
}

// CALCULAR
function calcular() {
  let eps = [];
  for (let i = 0; i < years.length; i++) {
    const input = document.getElementById("eps" + i);
    eps[i] = input ? parseFloat(input.value) : NaN;
  }

  for (let i = 1; i < eps.length; i++) {
    const cell = document.getElementById("growth" + i);
    if (!cell) continue;
    if (eps[i - 1] && eps[i]) {
      let growth = ((eps[i] - eps[i - 1]) / eps[i - 1]) * 100;
      cell.innerText = growth.toFixed(1) + "%";
      aplicarColor("growth" + i, growth);
    } else {
      cell.innerText = "";
    }
  }

  let perBajo = parseFloat(document.getElementById("perBajo").value);
  let perHistorico = parseFloat(document.getElementById("perHistorico").value);
  let perEstimado = parseFloat(document.getElementById("perEstimado").value);
  let precioActual = parseFloat(document.getElementById("precioActual").value);

  let eps1 = eps[7];
  let eps2 = eps[8];
  let eps3 = eps[9];

  function calcValor(eps, per) { return eps * per; }
  function calcUpside(valor) { return ((valor - precioActual) / precioActual) * 100; }
  function printMoney(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerText = Number.isFinite(val) ? "$" + val.toFixed(2) : "—";
  }
  function printUpside(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    let upside = calcUpside(val);
    el.innerText = Number.isFinite(upside) ? upside.toFixed(1) + "%" : "—";
    aplicarColor(id, upside);
  }

  let b1 = calcValor(eps1, perBajo);
  let b2 = calcValor(eps2, perBajo);
  let b3 = calcValor(eps3, perBajo);

  let h1 = calcValor(eps1, perHistorico);
  let h2 = calcValor(eps2, perHistorico);
  let h3 = calcValor(eps3, perHistorico);

  let e1 = calcValor(eps1, perEstimado);
  let e2 = calcValor(eps2, perEstimado);
  let e3 = calcValor(eps3, perEstimado);

  printMoney("bajo1", b1); printMoney("bajo2", b2); printMoney("bajo3", b3);
  printMoney("hist1", h1); printMoney("hist2", h2); printMoney("hist3", h3);
  printMoney("est1", e1); printMoney("est2", e2); printMoney("est3", e3);

  [
    ["upB1", b1], ["upB2", b2], ["upB3", b3],
    ["upH1", h1], ["upH2", h2], ["upH3", h3],
    ["upE1", e1], ["upE2", e2], ["upE3", e3]
  ].forEach(([id,val])=>printUpside(id, val));

  let tirB = calcularTIR(b3, precioActual, 3);
  let tirH = calcularTIR(h3, precioActual, 3);
  let tirE = calcularTIR(e3, precioActual, 3);

  mostrarTIR("tirB", tirB);
  mostrarTIR("tirH", tirH);
  mostrarTIR("tirE", tirE);

  let epsInicial = eps[0];
  let epsFinal = eps[9];
  let cagr = calcularCAGR(epsInicial, epsFinal, 9);
  document.getElementById("cagr").innerText = Number.isFinite(cagr) ? (cagr*100).toFixed(1)+"%" : "—";

  let margin = (e3 - precioActual)/e3;
  document.getElementById("margin").innerText = Number.isFinite(margin) ? (margin*100).toFixed(1)+"%" : "—";

  let signalText = "";
  let signalIcon = "";
  let comentario = "Calculado en base a la TIR del valor estimado.";

  if (Number.isFinite(tirE) && tirE >= 0.15) {
    signalText = "Comprar";
    signalIcon = "🟢⬆️";
    comentario = "TIR estimada superior o igual al 15%.";
  } else if (Number.isFinite(tirE)) {
    signalText = "Poco Atractiva";
    signalIcon = "🟡➖";
    comentario = "TIR estimada inferior al 15%.";
  } else {
    signalText = "Sin datos";
    signalIcon = "⚪";
    comentario = "Faltan datos para calcular la TIR.";
  }

  let signalEl = document.getElementById("signal");
  let signalIconEl = document.getElementById("signalIcon");
  let comentarioEl = document.getElementById("comentarioSignal");

  signalEl.innerText = signalText;
  signalIconEl.innerText = signalIcon;
  signalEl.style.color = signalText==="Comprar" ? "lime": signalText==="Poco Atractiva" ? "yellow" : "white";
  comentarioEl.innerText = comentario;

  let epsClean = eps.map(v=>Number.isFinite(v) ? v : 0);
  if(chart) chart.destroy();
  chart = new Chart(document.getElementById("graficoEPS").getContext("2d"), {
    type:"line",
    data:{ labels:years, datasets:[{ label:"EPS", data:epsClean, tension:0.3 }] },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ labels:{ color:"white" } } },
      scales:{ x:{ ticks:{ color:"white" } }, y:{ ticks:{ color:"white" } } }
    }
  });

  if(chartPrecio) chartPrecio.destroy();
  chartPrecio = new Chart(document.getElementById("graficoPrecio").getContext("2d"), {
    type:"line",
    data:{ labels:[years[7],years[8],years[9]], datasets:[{ label:"Estimado", data:[e1,e2,e3], borderColor:"#2ea043", tension:0.3 }] },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ labels:{ color:"white" } } },
      scales:{ x:{ ticks:{ color:"white" } }, y:{ ticks:{ color:"white" } } }
    }
  });
}

// GUARDAR ANÁLISIS COMPLETO
function guardarActivoCompleto() {
  let tickerInput = document.getElementById("inputTicker");
  if (!tickerInput) return alert("Esta versión de prueba no tiene activada la barra de guardado local.");
  let ticker = tickerInput.value;
  if (!ticker) return alert("Ingresa un ticker");

  let eps = [];
  for(let i=0;i<10;i++) eps[i]=parseFloat(document.getElementById("eps"+i).value)||0;

  let resultados = {
    bajo:[document.getElementById("bajo1").innerText,document.getElementById("bajo2").innerText,document.getElementById("bajo3").innerText],
    historico:[document.getElementById("hist1").innerText,document.getElementById("hist2").innerText,document.getElementById("hist3").innerText],
    estimado:[document.getElementById("est1").innerText,document.getElementById("est2").innerText,document.getElementById("est3").innerText],
    upB:[document.getElementById("upB1").innerText,document.getElementById("upB2").innerText,document.getElementById("upB3").innerText],
    upH:[document.getElementById("upH1").innerText,document.getElementById("upH2").innerText,document.getElementById("upH3").innerText],
    upE:[document.getElementById("upE1").innerText,document.getElementById("upE2").innerText,document.getElementById("upE3").innerText],
    tirB:document.getElementById("tirB").innerText,
    tirH:document.getElementById("tirH").innerText,
    tirE:document.getElementById("tirE").innerText
  };

  let metrics = {
    cagr:document.getElementById("cagr").innerText,
    margin:document.getElementById("margin").innerText,
    signal:document.getElementById("signal").innerText,
    signalIcon:document.getElementById("signalIcon").innerText,
    comentarioSignal:document.getElementById("comentarioSignal").innerText,
    tikr: ultimoResumenTikr
  };

  let ahora = new Date();

  let activoGuardado = {
    ticker,
    eps,
    perBajo:document.getElementById("perBajo").value,
    perHistorico:document.getElementById("perHistorico").value,
    perEstimado:document.getElementById("perEstimado").value,
    precioActual:document.getElementById("precioActual").value,
    resultados,
    metrics,
    fechaAnalisis: ahora.toLocaleString()
  };

  localStorage.setItem("activo_"+ticker, JSON.stringify(activoGuardado));
  actualizarListaTickers();
  alert("Activo guardado con todos los cálculos: "+ticker);
}

function cargarActivoCompleto(ticker=null) {
  let tickerInput = document.getElementById("inputTicker");
  if (!tickerInput) return alert("Esta versión de prueba no tiene activada la barra de guardado local.");
  if (!ticker) ticker = tickerInput.value;
  if (!ticker) return alert("Ingresa un ticker");

  let guardado = localStorage.getItem("activo_"+ticker);
  if (!guardado) return alert("No hay datos guardados para "+ticker);

  let activo = JSON.parse(guardado);
  tickerInput.value = activo.ticker;
  let select = document.getElementById("selectTickers");
  if (select) select.value = activo.ticker;

  activo.eps.forEach((val,i)=>{
    let input=document.getElementById("eps"+i);
    if(input) input.value=val;
  });

  document.getElementById("perBajo").value = activo.perBajo;
  document.getElementById("perHistorico").value = activo.perHistorico;
  document.getElementById("perEstimado").value = activo.perEstimado;
  document.getElementById("precioActual").value = activo.precioActual;
  calcular();
}

function actualizarListaTickers() {
  let select = document.getElementById("selectTickers");
  if (!select) return;
  select.innerHTML = '<option value="">-- Selecciona un activo guardado --</option>';

  for (let i = 0; i < localStorage.length; i++) {
    let key = localStorage.key(i);
    if (key.startsWith("activo_")) {
      let ticker = key.replace("activo_", "");
      let option = document.createElement("option");
      option.value = ticker;
      option.innerText = ticker;
      select.appendChild(option);
    }
  }
}

function seleccionarTicker() {
  let select = document.getElementById("selectTickers");
  let ticker = select ? select.value : "";
  if (ticker) cargarActivoCompleto(ticker);
}

window.addEventListener("load", actualizarListaTickers);
