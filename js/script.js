let currentYear = new Date().getFullYear();
let years = [];

for (let i = -7; i <= 2; i++) {
  years.push(currentYear + i);
}

let filaAnios = document.getElementById("filaAnios");
let filaEPS = document.getElementById("filaEPS");
let filaGrowth = document.getElementById("filaGrowth");

filaAnios.innerHTML = "<th>Año</th>";
filaEPS.innerHTML = "<th>EPS</th>";
filaGrowth.innerHTML = "<th>Growth</th>";

years.forEach((year, index) => {
  filaAnios.innerHTML += `<td>${year}</td>`;
  filaEPS.innerHTML += `<td><input type="number" id="eps${index}"></td>`;
  filaGrowth.innerHTML += `<td id="growth${index}"></td>`;
});

document.getElementById("year1").innerText = years[7];
document.getElementById("year2").innerText = years[8];
document.getElementById("year3").innerText = years[9];

function aplicarColor(id, valor) {
  let el = document.getElementById(id);
  if (valor > 0) el.style.color = "lime";
  else if (valor < 0) el.style.color = "red";
  else el.style.color = "white";
}

function calcularTIR(valorFuturo, precioActual, años) {
  return Math.pow(valorFuturo / precioActual, 1 / años) - 1;
}

function calcularCAGR(epsInicial, epsFinal, años) {
  return Math.pow(epsFinal / epsInicial, 1 / años) - 1;
}

function mostrarTIR(id, valor) {
  let porcentaje = valor * 100;
  document.getElementById(id).innerText = porcentaje.toFixed(1) + "%";
  aplicarColor(id, porcentaje);
}

// TICKER
function setTicker() {
  let nombre = document.getElementById("inputTicker").value;
  document.getElementById("tickerNombre").innerText = "Activo: " + nombre;
}

// PEGAR DATOS
function pegarDatos() {
  let texto = document.getElementById("pasteEPS").value;
  let valores = texto.match(/-?\d+(\.\d+)?/g);
  if (!valores) return;
  valores = valores.map(Number);
  let ultimos = valores.slice(-10);
  ultimos.forEach((val, i) => {
    let input = document.getElementById("eps" + i);
    if (input) input.value = val;
  });
}

let chart;
let chartPrecio;

// CALCULAR
function calcular() {
  let eps = [];
  for (let i = 0; i < years.length; i++) {
    eps[i] = parseFloat(document.getElementById("eps" + i).value);
  }

  for (let i = 1; i < eps.length; i++) {
    if (eps[i - 1] && eps[i]) {
      let growth = ((eps[i] - eps[i - 1]) / eps[i - 1]) * 100;
      document.getElementById("growth" + i).innerText =
        growth.toFixed(1) + "%";
      aplicarColor("growth" + i, growth);
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

  let b1 = calcValor(eps1, perBajo);
  let b2 = calcValor(eps2, perBajo);
  let b3 = calcValor(eps3, perBajo);

  let h1 = calcValor(eps1, perHistorico);
  let h2 = calcValor(eps2, perHistorico);
  let h3 = calcValor(eps3, perHistorico);

  let e1 = calcValor(eps1, perEstimado);
  let e2 = calcValor(eps2, perEstimado);
  let e3 = calcValor(eps3, perEstimado);

  document.getElementById("bajo1").innerText = "$" + b1.toFixed(2);
  document.getElementById("bajo2").innerText = "$" + b2.toFixed(2);
  document.getElementById("bajo3").innerText = "$" + b3.toFixed(2);

  document.getElementById("hist1").innerText = "$" + h1.toFixed(2);
  document.getElementById("hist2").innerText = "$" + h2.toFixed(2);
  document.getElementById("hist3").innerText = "$" + h3.toFixed(2);

  document.getElementById("est1").innerText = "$" + e1.toFixed(2);
  document.getElementById("est2").innerText = "$" + e2.toFixed(2);
  document.getElementById("est3").innerText = "$" + e3.toFixed(2);

  // Upside
  [
    ["upB1", b1], ["upB2", b2], ["upB3", b3],
    ["upH1", h1], ["upH2", h2], ["upH3", h3],
    ["upE1", e1], ["upE2", e2], ["upE3", e3]
  ].forEach(([id,val])=>{
    let upside = calcUpside(val);
    document.getElementById(id).innerText = upside.toFixed(1) + "%";
    aplicarColor(id, upside);
  });

  let tirB = calcularTIR(b3, precioActual, 3);
  let tirH = calcularTIR(h3, precioActual, 3);
  let tirE = calcularTIR(e3, precioActual, 3);

  mostrarTIR("tirB", tirB);
  mostrarTIR("tirH", tirH);
  mostrarTIR("tirE", tirE);

  // Calcular y mostrar CAGR
  let epsInicial = eps[0];
  let epsFinal = eps[9];
  let cagr = calcularCAGR(epsInicial, epsFinal, 9);
  document.getElementById("cagr").innerText = (cagr*100).toFixed(1)+"%";

  // Margen de Seguridad
  let margin = (e3 - precioActual)/e3;
  document.getElementById("margin").innerText = (margin*100).toFixed(1)+"%";

  // Señal de Inversión basada en TIR estimada
  let signalText = "";
  let signalIcon = "";
  let comentario = "Calculado en base a la TIR del valor estimado.";

  if (tirE >= 0.15) {
    signalText = "Comprar";
    signalIcon = "🟢⬆️";
    comentario = "TIR estimada superior o igual al 15%.";
  } else {
    signalText = "Poco Atractiva";
    signalIcon = "🟡➖";
    comentario = "TIR estimada inferior al 15%.";
  }

  let signalEl = document.getElementById("signal");
  let signalIconEl = document.getElementById("signalIcon");
  let comentarioEl = document.getElementById("comentarioSignal");

  signalEl.innerText = signalText;
  signalIconEl.innerText = signalIcon;
  signalEl.style.color = signalText==="Comprar" ? "lime":"yellow";
  comentarioEl.innerText = comentario;

  // Gráfico EPS
  let epsClean = eps.map(v=>v||0);
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

  // Gráfico Precio Estimado
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
  let ticker = document.getElementById("inputTicker").value;
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
    comentarioSignal:document.getElementById("comentarioSignal").innerText
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

// CARGAR ANÁLISIS COMPLETO
function cargarActivoCompleto(ticker=null) {
  if (!ticker) ticker = document.getElementById("inputTicker").value;
  if (!ticker) return alert("Ingresa un ticker");

  let guardado = localStorage.getItem("activo_"+ticker);
  if (!guardado) return alert("No hay datos guardados para "+ticker);

  let activo = JSON.parse(guardado);

  // Actualizar input y select
  document.getElementById("inputTicker").value = activo.ticker;
  let select = document.getElementById("selectTickers");
  select.value = activo.ticker;

  // EPS
  activo.eps.forEach((val,i)=>{
    let input=document.getElementById("eps"+i);
    if(input) input.value=val;
  });

  document.getElementById("perBajo").value = activo.perBajo;
  document.getElementById("perHistorico").value = activo.perHistorico;
  document.getElementById("perEstimado").value = activo.perEstimado;
  document.getElementById("precioActual").value = activo.precioActual;

  // Resultados tabla
  ["bajo1","bajo2","bajo3"].forEach((id,i)=>document.getElementById(id).innerText = activo.resultados.bajo[i]);
  ["hist1","hist2","hist3"].forEach((id,i)=>document.getElementById(id).innerText = activo.resultados.historico[i]);
  ["est1","est2","est3"].forEach((id,i)=>document.getElementById(id).innerText = activo.resultados.estimado[i]);
  ["upB1","upB2","upB3"].forEach((id,i)=>document.getElementById(id).innerText = activo.resultados.upB[i]);
  ["upH1","upH2","upH3"].forEach((id,i)=>document.getElementById(id).innerText = activo.resultados.upH[i]);
  ["upE1","upE2","upE3"].forEach((id,i)=>document.getElementById(id).innerText = activo.resultados.upE[i]);

  document.getElementById("tirB").innerText = activo.resultados.tirB;
  document.getElementById("tirH").innerText = activo.resultados.tirH;
  document.getElementById("tirE").innerText = activo.resultados.tirE;

  // Métricas
  document.getElementById("cagr").innerText = activo.metrics.cagr;
  document.getElementById("margin").innerText = activo.metrics.margin;
  document.getElementById("signal").innerText = activo.metrics.signal;
  document.getElementById("signalIcon").innerText = activo.metrics.signalIcon;
  document.getElementById("comentarioSignal").innerText = activo.metrics.comentarioSignal;
  document.getElementById("fechaAnalisis").innerText = "Último análisis: "+activo.fechaAnalisis;

  // Actualizar gráficos
  calcular();
}

// FUNCIONES NUEVAS PARA LISTA DE TICKERS
function actualizarListaTickers() {
  let select = document.getElementById("selectTickers");
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
  let ticker = select.value;
  if (ticker) {
    cargarActivoCompleto(ticker);
  }
}

// Al cargar la página, actualizar la lista
window.onload = function() {
  actualizarListaTickers();
};