/* ===== VALORACIÓN AVANZADA TIKR - ARCHIVO NUEVO =====
   Esta versión no modifica la calculadora TIR existente.
*/

const FIELD_IDS = {
  income: 'incomeText',
  balance: 'balanceText',
  cashflow: 'cashflowText',
  estimates: 'estimatesText',
  multiples: 'multiplesText'
};

const ROW_PATTERNS = {
  epsNormalized: [/^EPS Normalized$/i, /^Normalized EPS$/i],
  epsGaap: [/^EPS \(GAAP\)$/i, /^Diluted EPS$/i],
  revenue: [/^Revenue$/i, /^Total Revenue$/i],
  ebitda: [/^EBITDA$/i],
  ebit: [/^EBIT$/i, /^Operating Income$/i],
  fcf: [/^Free Cash Flow$/i, /^Unlevered Free Cash Flow$/i],
  cfo: [/^Cash From Operations$/i, /^Net Cash Provided by Operating Activities$/i, /^Operating Cash Flow$/i],
  capex: [/^Capital Expenditure$/i, /^Capital Expenditures$/i],
  netDebt: [/^Net Debt$/i],
  cash: [/^Cash And Equivalents$/i, /^Cash and Equivalents$/i, /^Cash & Equivalents$/i, /^Cash$/i],
  marketableSecurities: [/^Marketable Securities$/i, /^Short Term Investments$/i, /^Short-Term Investments$/i],
  shortDebt: [/^Short-Term Debt$/i, /^Short Term Debt$/i, /^Current Debt$/i],
  longDebt: [/^Long-Term Debt$/i, /^Long Term Debt$/i, /^Long-Term Debt & Capital Lease Obligation$/i],
  totalDebt: [/^Total Debt$/i],
  marketCap: [/^Market Cap$/i],
  priceClose: [/^Price Close$/i, /^Price$/i],
  peLtm: [/^LTM Price \/ Diluted EPS \(P\/E\)$/i, /^LTM Price \/ Normalized Earnings \(P\/E\)$/i],
  evFcfLtm: [/^LTM Total Enterprise Value \/ Unlevered Free Cash Flow$/i, /^LTM Total Enterprise Value \/ Free Cash Flow$/i],
  mcFcfLtm: [/^LTM Market Cap \/ Levered Free Cash Flow$/i, /^NTM Market Cap \/ Free Cash Flow$/i],
  evEbitdaLtm: [/^LTM Total Enterprise Value \/ EBITDA$/i],
  evEbitLtm: [/^LTM Total Enterprise Value \/ EBIT$/i]
};

function normalizeLabel(label) {
  return String(label || '')
    .replace(/\s+/g, ' ')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function parseNumber(value) {
  if (value === undefined || value === null) return null;
  let raw = String(value).trim();
  if (!raw || /^PRO$/i.test(raw) || raw === '-' || raw === '—') return null;

  const isNegative = /^\(.*\)$/.test(raw);
  raw = raw
    .replace(/[,$%x]/gi, '')
    .replace(/[()]/g, '')
    .replace(/\s+/g, '')
    .replace(/−/g, '-');

  if (!raw || raw === '-') return null;
  const num = Number(raw);
  if (!Number.isFinite(num)) return null;
  return isNegative ? -num : num;
}

function parseYear(cell) {
  const text = String(cell || '').trim();
  const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (dateMatch) {
    const yearRaw = Number(dateMatch[3]);
    return yearRaw < 100 ? 2000 + yearRaw : yearRaw;
  }
  const yearMatch = text.match(/\b(20\d{2}|19\d{2})\b/);
  return yearMatch ? Number(yearMatch[1]) : null;
}

function parseTikrTable(rawText) {
  const rows = [];
  const lines = String(rawText || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const parts = line.includes('\t')
      ? line.split('\t').map(p => p.trim())
      : line.split(/\s{2,}/).map(p => p.trim());

    if (parts.length < 2) continue;

    const label = normalizeLabel(parts[0]);
    const values = parts.slice(1);
    const parsedNumbers = values.map(parseNumber);
    const years = values.map(parseYear);

    rows.push({ label, values, numbers: parsedNumbers, years, raw: line });
  }

  return { rows };
}

function findRow(parsed, patterns) {
  if (!parsed || !Array.isArray(parsed.rows)) return null;
  const candidates = Array.isArray(patterns) ? patterns : [patterns];

  return parsed.rows.find(row =>
    candidates.some(pattern => pattern.test(normalizeLabel(row.label)))
  ) || null;
}

function compactNumbers(row) {
  if (!row) return [];
  return row.numbers.filter(value => Number.isFinite(value));
}

function lastNumber(row) {
  const values = compactNumbers(row);
  return values.length ? values[values.length - 1] : null;
}

function firstFutureIndexFromHeader(parsed) {
  if (!parsed || !parsed.rows.length) return -1;
  const header = parsed.rows[0];
  return header.values.findIndex(v => /\bE\b/i.test(v));
}

function valuesWithYears(row, parsed) {
  if (!row) return [];
  const header = parsed && parsed.rows.length ? parsed.rows[0] : null;
  return row.numbers.map((value, index) => ({
    value,
    year: header ? parseYear(header.values[index]) : null,
    rawHeader: header ? header.values[index] : ''
  })).filter(item => Number.isFinite(item.value));
}

function lastActualAndFuture(row, parsed) {
  const items = valuesWithYears(row, parsed);
  if (!items.length) return { latest: null, future: null, all: [] };

  const header = parsed && parsed.rows.length ? parsed.rows[0] : null;
  const futureItems = items.filter(item => /\bE\b/i.test(item.rawHeader || ''));
  const actualItems = items.filter(item => /\bA\b/i.test(item.rawHeader || ''));

  return {
    latest: actualItems.length ? actualItems[actualItems.length - 1] : items[items.length - 1],
    future: futureItems.length ? futureItems[futureItems.length - 1] : items[items.length - 1],
    all: items,
    header
  };
}

function average(values) {
  const clean = values.filter(Number.isFinite);
  if (!clean.length) return null;
  return clean.reduce((a, b) => a + b, 0) / clean.length;
}

function percentile(values, p) {
  const clean = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!clean.length) return null;
  const idx = (clean.length - 1) * p;
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return clean[lower];
  return clean[lower] + (clean[upper] - clean[lower]) * (idx - lower);
}

function cagr(start, end, years) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(years) || years <= 0 || start <= 0 || end <= 0) return null;
  return Math.pow(end / start, 1 / years) - 1;
}

function formatNumber(value, decimals = 2) {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatMoney(value, decimals = 2) {
  return Number.isFinite(value) ? '$' + formatNumber(value, decimals) : '—';
}

function formatPercent(value, decimals = 1) {
  return Number.isFinite(value) ? (value * 100).toFixed(decimals) + '%' : '—';
}

function cssClassFor(value) {
  if (!Number.isFinite(value)) return '';
  if (value > 0.05) return 'positive';
  if (value < 0) return 'negative';
  return 'neutral';
}

function extractAllData() {
  const parsed = {
    income: parseTikrTable(document.getElementById(FIELD_IDS.income).value),
    balance: parseTikrTable(document.getElementById(FIELD_IDS.balance).value),
    cashflow: parseTikrTable(document.getElementById(FIELD_IDS.cashflow).value),
    estimates: parseTikrTable(document.getElementById(FIELD_IDS.estimates).value),
    multiples: parseTikrTable(document.getElementById(FIELD_IDS.multiples).value)
  };

  const estimates = parsed.estimates;
  const multiples = parsed.multiples;
  const balance = parsed.balance;
  const cashflow = parsed.cashflow;
  const income = parsed.income;

  const epsRow = findRow(estimates, ROW_PATTERNS.epsNormalized) || findRow(estimates, ROW_PATTERNS.epsGaap) || findRow(income, ROW_PATTERNS.epsGaap);
  const revenueRow = findRow(estimates, ROW_PATTERNS.revenue) || findRow(income, ROW_PATTERNS.revenue);
  const ebitdaRow = findRow(estimates, ROW_PATTERNS.ebitda) || findRow(income, ROW_PATTERNS.ebitda);
  const ebitRow = findRow(estimates, ROW_PATTERNS.ebit) || findRow(income, ROW_PATTERNS.ebit);
  const fcfRow = findRow(estimates, ROW_PATTERNS.fcf) || findRow(cashflow, ROW_PATTERNS.fcf);
  const cfoRow = findRow(cashflow, ROW_PATTERNS.cfo) || findRow(estimates, ROW_PATTERNS.cfo);
  const capexRow = findRow(cashflow, ROW_PATTERNS.capex) || findRow(estimates, ROW_PATTERNS.capex);

  const netDebtRow = findRow(balance, ROW_PATTERNS.netDebt) || findRow(estimates, ROW_PATTERNS.netDebt);
  const cashRow = findRow(balance, ROW_PATTERNS.cash);
  const securitiesRow = findRow(balance, ROW_PATTERNS.marketableSecurities);
  const shortDebtRow = findRow(balance, ROW_PATTERNS.shortDebt);
  const longDebtRow = findRow(balance, ROW_PATTERNS.longDebt);
  const totalDebtRow = findRow(balance, ROW_PATTERNS.totalDebt);

  const marketCapRow = findRow(multiples, ROW_PATTERNS.marketCap) || findRow(estimates, ROW_PATTERNS.marketCap);
  const priceCloseRow = findRow(multiples, ROW_PATTERNS.priceClose) || findRow(estimates, ROW_PATTERNS.priceClose);

  const peRow = findRow(multiples, ROW_PATTERNS.peLtm);
  const evFcfRow = findRow(multiples, ROW_PATTERNS.evFcfLtm) || findRow(multiples, ROW_PATTERNS.mcFcfLtm);
  const evEbitdaRow = findRow(multiples, ROW_PATTERNS.evEbitdaLtm);
  const evEbitRow = findRow(multiples, ROW_PATTERNS.evEbitLtm);

  let netDebt = lastNumber(netDebtRow);
  if (!Number.isFinite(netDebt)) {
    const totalDebt = Number.isFinite(lastNumber(totalDebtRow))
      ? lastNumber(totalDebtRow)
      : (lastNumber(shortDebtRow) || 0) + (lastNumber(longDebtRow) || 0);
    const cashAndInvestments = (lastNumber(cashRow) || 0) + (lastNumber(securitiesRow) || 0);
    if (Number.isFinite(totalDebt) && Number.isFinite(cashAndInvestments)) {
      netDebt = totalDebt - cashAndInvestments;
    }
  }

  const currentPrice = Number(document.getElementById('currentPrice').value);
  const targetReturn = Number(document.getElementById('targetReturn').value) / 100;
  let projectionYears = Number(document.getElementById('projectionYears').value);

  const eps = lastActualAndFuture(epsRow, estimates);
  const revenue = lastActualAndFuture(revenueRow, estimates);
  const ebitda = lastActualAndFuture(ebitdaRow, estimates);
  const ebit = lastActualAndFuture(ebitRow, estimates);
  let fcf = lastActualAndFuture(fcfRow, estimates);

  if (!fcf.future && cfoRow && capexRow) {
    const cfo = lastActualAndFuture(cfoRow, estimates);
    const capex = lastActualAndFuture(capexRow, estimates);
    if (cfo.future && capex.future) {
      fcf = { latest: null, future: { value: cfo.future.value + capex.future.value, year: cfo.future.year }, all: [] };
    }
  }

  if ((!Number.isFinite(projectionYears) || projectionYears <= 0) && eps.latest && eps.future && eps.latest.year && eps.future.year) {
    projectionYears = Math.max(1, eps.future.year - eps.latest.year);
  }

  const marketCap = lastNumber(marketCapRow);
  const priceClose = lastNumber(priceCloseRow);
  let shares = null;
  if (Number.isFinite(marketCap) && Number.isFinite(priceClose) && priceClose > 0) {
    shares = marketCap / priceClose;
  } else if (Number.isFinite(marketCap) && Number.isFinite(currentPrice) && currentPrice > 0) {
    shares = marketCap / currentPrice;
  }

  const multiplesDetected = {
    pe: compactNumbers(peRow),
    evFcf: compactNumbers(evFcfRow),
    evEbitda: compactNumbers(evEbitdaRow),
    evEbit: compactNumbers(evEbitRow)
  };

  return {
    parsed,
    rows: { epsRow, revenueRow, ebitdaRow, ebitRow, fcfRow, netDebtRow, marketCapRow, priceCloseRow, peRow, evFcfRow, evEbitdaRow, evEbitRow },
    metrics: { eps, revenue, ebitda, ebit, fcf },
    balance: { netDebt, cash: lastNumber(cashRow), totalDebt: lastNumber(totalDebtRow) },
    market: { currentPrice, marketCap, priceClose, shares },
    settings: { targetReturn, projectionYears },
    multiplesDetected
  };
}

function suggestedMultiple(values, fallback) {
  const clean = values.filter(Number.isFinite).filter(v => v > 0 && v < 500);
  return {
    min: clean.length ? Math.min(...clean) : null,
    p25: percentile(clean, 0.25),
    avg: average(clean),
    p75: percentile(clean, 0.75),
    last: clean.length ? clean[clean.length - 1] : null,
    used: average(clean) || fallback
  };
}

function calculateValuation(data) {
  const { metrics, balance, market, settings, multiplesDetected } = data;
  const years = settings.projectionYears || 3;
  const currentPrice = market.currentPrice;
  const netDebt = Number.isFinite(balance.netDebt) ? balance.netDebt : 0;
  const shares = market.shares;

  const suggested = {
    pe: suggestedMultiple(multiplesDetected.pe, 25),
    evFcf: suggestedMultiple(multiplesDetected.evFcf, 25),
    evEbitda: suggestedMultiple(multiplesDetected.evEbitda, 15),
    evEbit: suggestedMultiple(multiplesDetected.evEbit, 20)
  };

  const methods = [];

  if (metrics.eps.future && Number.isFinite(metrics.eps.future.value)) {
    const target = metrics.eps.future.value * suggested.pe.used;
    methods.push({
      name: 'PER', metric: metrics.eps.future.value, metricLabel: 'EPS futuro', multiple: suggested.pe.used, targetPrice: target
    });
  }

  function evMethod(name, metricObj, suggestion, metricLabel) {
    if (!metricObj.future || !Number.isFinite(metricObj.future.value) || !Number.isFinite(shares) || shares <= 0) return;
    const enterpriseValueTarget = metricObj.future.value * suggestion.used;
    const equityValueTarget = enterpriseValueTarget - netDebt;
    const targetPrice = equityValueTarget / shares;
    methods.push({ name, metric: metricObj.future.value, metricLabel, multiple: suggestion.used, targetPrice });
  }

  evMethod('EV / FCF', metrics.fcf, suggested.evFcf, 'FCF futuro');
  evMethod('EV / EBITDA', metrics.ebitda, suggested.evEbitda, 'EBITDA futuro');
  evMethod('EV / EBIT', metrics.ebit, suggested.evEbit, 'EBIT futuro');

  methods.forEach(method => {
    method.upside = Number.isFinite(currentPrice) && currentPrice > 0 ? (method.targetPrice - currentPrice) / currentPrice : null;
    method.cagr = Number.isFinite(currentPrice) && currentPrice > 0 ? cagr(currentPrice, method.targetPrice, years) : null;
    method.buyPriceForTargetReturn = Number.isFinite(settings.targetReturn)
      ? method.targetPrice / Math.pow(1 + settings.targetReturn, years)
      : null;
  });

  return { methods, suggested };
}

function renderDetectedData(data) {
  const { metrics, balance, market, settings } = data;
  const rows = [
    ['Precio actual manual', formatMoney(market.currentPrice)],
    ['Último precio detectado en TIKR', formatMoney(market.priceClose)],
    ['Market Cap detectado', Number.isFinite(market.marketCap) ? formatNumber(market.marketCap, 0) + ' MM' : '—'],
    ['Acciones estimadas', Number.isFinite(market.shares) ? formatNumber(market.shares, 2) + ' MM' : '—'],
    ['Deuda neta', Number.isFinite(balance.netDebt) ? formatNumber(balance.netDebt, 0) + ' MM' : '—'],
    ['EPS futuro', metrics.eps.future ? formatNumber(metrics.eps.future.value, 2) + (metrics.eps.future.year ? ` (${metrics.eps.future.year})` : '') : '—'],
    ['Revenue futuro', metrics.revenue.future ? formatNumber(metrics.revenue.future.value, 0) + ' MM' : '—'],
    ['EBITDA futuro', metrics.ebitda.future ? formatNumber(metrics.ebitda.future.value, 0) + ' MM' : '—'],
    ['EBIT futuro', metrics.ebit.future ? formatNumber(metrics.ebit.future.value, 0) + ' MM' : '—'],
    ['FCF futuro', metrics.fcf.future ? formatNumber(metrics.fcf.future.value, 0) + ' MM' : '—'],
    ['Años de proyección', formatNumber(settings.projectionYears, 0)]
  ];

  document.getElementById('detectedData').innerHTML = `<div class="metric-list">${rows.map(([k, v]) => `
    <div class="metric-line"><span>${k}</span><strong>${v}</strong></div>
  `).join('')}</div>`;
}

function renderSuggestions(suggested) {
  const blocks = [
    ['PER', suggested.pe],
    ['EV/FCF', suggested.evFcf],
    ['EV/EBITDA', suggested.evEbitda],
    ['EV/EBIT', suggested.evEbit]
  ];

  document.getElementById('multipleSuggestions').innerHTML = `<div class="metric-list">${blocks.map(([name, s]) => `
    <div class="metric-line"><span>${name} usado</span><strong>${formatNumber(s.used, 2)}x</strong></div>
    <div class="metric-line"><span>${name} min / media / último</span><strong>${formatNumber(s.min, 2)}x / ${formatNumber(s.avg, 2)}x / ${formatNumber(s.last, 2)}x</strong></div>
  `).join('')}</div>`;
}

function renderValuation(methods, currentPrice) {
  const tbody = document.getElementById('valuationRows');
  if (!methods.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hay datos suficientes para valorar. Revisa los textos pegados y el precio actual.</td></tr>';
    return;
  }

  tbody.innerHTML = methods.map(method => `
    <tr>
      <td>${method.name}</td>
      <td>${method.metricLabel}: ${formatNumber(method.metric, method.name === 'PER' ? 2 : 0)}</td>
      <td>${formatNumber(method.multiple, 2)}x</td>
      <td>${formatMoney(method.targetPrice)}</td>
      <td class="${cssClassFor(method.upside)}">${formatPercent(method.upside)}</td>
      <td class="${cssClassFor(method.cagr)}">${formatPercent(method.cagr)}</td>
      <td>${formatMoney(method.buyPriceForTargetReturn)}</td>
    </tr>
  `).join('');
}

function renderSummary(methods, currentPrice) {
  const validTargets = methods.map(m => m.targetPrice).filter(Number.isFinite);
  const validCagrs = methods.map(m => m.cagr).filter(Number.isFinite);
  const validBuyPrices = methods.map(m => m.buyPriceForTargetReturn).filter(Number.isFinite);
  const avgTarget = average(validTargets);
  const avgCagr = average(validCagrs);
  const avgBuyPrice = average(validBuyPrices);
  const margin = Number.isFinite(avgTarget) && Number.isFinite(currentPrice) && currentPrice > 0
    ? (avgTarget - currentPrice) / avgTarget
    : null;

  document.getElementById('valuationSummary').innerHTML = `
    <div class="summary-grid">
      <div class="summary-tile"><span>Precio objetivo medio</span><strong>${formatMoney(avgTarget)}</strong></div>
      <div class="summary-tile"><span>CAGR medio</span><strong class="${cssClassFor(avgCagr)}">${formatPercent(avgCagr)}</strong></div>
      <div class="summary-tile"><span>Margen de seguridad</span><strong class="${cssClassFor(margin)}">${formatPercent(margin)}</strong></div>
      <div class="summary-tile"><span>Precio compra medio para TIR objetivo</span><strong>${formatMoney(avgBuyPrice)}</strong></div>
    </div>
  `;
}

function renderWarnings(data, valuation) {
  const warnings = [];
  if (!Number.isFinite(data.market.currentPrice)) warnings.push('Falta el precio actual manual. Sin este dato no se puede calcular upside ni CAGR.');
  if (!Number.isFinite(data.market.shares)) warnings.push('No se pudieron estimar acciones en circulación. Los métodos EV/FCF, EV/EBITDA y EV/EBIT necesitan Market Cap y Price/Price Close desde TIKR.');
  if (!Number.isFinite(data.balance.netDebt)) warnings.push('No se pudo detectar deuda neta. Se ha usado 0 como aproximación en métodos EV.');
  if (!data.metrics.eps.future) warnings.push('No se detectó EPS futuro. El método PER no se podrá calcular.');
  if (!data.metrics.fcf.future) warnings.push('No se detectó FCF futuro. El método EV/FCF no se podrá calcular.');
  if (!data.rows.peRow) warnings.push('No se encontró la fila LTM Price / Diluted EPS (P/E) en Multiples. Se usa un PER fallback.');
  if (!data.rows.evEbitdaRow) warnings.push('No se encontró EV/EBITDA histórico en Multiples. Se usa un múltiplo fallback.');
  if (!data.rows.evEbitRow) warnings.push('No se encontró EV/EBIT histórico en Multiples. Se usa un múltiplo fallback.');
  if (!valuation.methods.length) warnings.push('No hay datos suficientes para generar valoración.');

  if (!warnings.length) warnings.push('Datos principales detectados correctamente. Revisa igualmente si las unidades están en millones y si la tabla copiada conserva el formato de TIKR.');

  document.getElementById('dataWarnings').innerHTML = warnings.map(w => `<li>${w}</li>`).join('');
}

function runValuation() {
  const status = document.getElementById('valuationStatus');
  try {
    const data = extractAllData();
    const valuation = calculateValuation(data);

    renderDetectedData(data);
    renderSuggestions(valuation.suggested);
    renderValuation(valuation.methods, data.market.currentPrice);
    renderSummary(valuation.methods, data.market.currentPrice);
    renderWarnings(data, valuation);

    status.textContent = 'Análisis completado.';
  } catch (error) {
    console.error(error);
    status.textContent = 'Error al analizar los datos. Revisa la consola.';
  }
}

function clearResults() {
  document.getElementById('detectedData').innerHTML = 'Aún no hay datos analizados.';
  document.getElementById('multipleSuggestions').innerHTML = 'Pega la tabla de Multiples para sugerir múltiplos automáticamente.';
  document.getElementById('valuationRows').innerHTML = '<tr><td colspan="7" class="empty-state">Pulsa “Analizar y valorar”.</td></tr>';
  document.getElementById('valuationSummary').innerHTML = 'Sin resumen todavía.';
  document.getElementById('dataWarnings').innerHTML = '<li>Los cálculos son orientativos y dependen de que las tablas pegadas desde TIKR mantengan una estructura reconocible.</li>';
  document.getElementById('valuationStatus').textContent = '';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnParseValuation').addEventListener('click', runValuation);
  document.getElementById('btnClearValuation').addEventListener('click', clearResults);
});
