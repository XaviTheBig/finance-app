/* ===== VALORACIÓN AVANZADA TIKR - MÉTODO EXCEL-LIKE =====
   Archivo nuevo. No modifica la calculadora actual.
   Objetivo: replicar mejor la lógica de la pestaña 4.Valoracion del Excel:
   - múltiplos objetivo por defecto = múltiplos forward implícitos del primer año estimado
   - valoración final a 5 años por PER ex-cash, EV/FCF, EV/EBITDA y EV/EBIT
   - uso de acciones diluidas/proyectadas, no MarketCap/Price como primera opción
*/

const FIELD_IDS = {
  income: 'incomeTextExcel',
  balance: 'balanceTextExcel',
  cashflow: 'cashflowTextExcel',
  estimates: 'estimatesTextExcel',
  multiples: 'multiplesTextExcel'
};

const ROW_PATTERNS = {
  revenue: [/^Revenue$/i, /^Total Revenue$/i, /^Revenues$/i],
  ebitda: [/^EBITDA$/i],
  ebit: [/^EBIT$/i, /^Operating Income$/i, /^Operating Profit$/i],
  netIncome: [/^Net Income Normalized$/i, /^Net Income$/i, /^Net Income \(GAAP\)$/i, /^Net Income Common/i],
  epsNormalized: [/^EPS Normalized$/i, /^Normalized EPS$/i],
  epsGaap: [/^EPS \(GAAP\)$/i, /^Diluted EPS$/i, /^EPS$/i],
  shares: [/Diluted Shares Outstanding/i, /Weighted Average Diluted Shares/i, /Fully Diluted Shares/i],
  fcf: [/^Free Cash Flow$/i, /^Unlevered Free Cash Flow$/i, /^Levered Free Cash Flow$/i],
  cfo: [/^Cash From Operations$/i, /^Net Cash Provided by Operating Activities$/i, /^Operating Cash Flow$/i],
  capex: [/^Capital Expenditure$/i, /^Capital Expenditures$/i, /^Capital Expenditure \(CapEx\)$/i],
  netDebt: [/^Net Debt$/i],
  cash: [/^Cash And Equivalents$/i, /^Cash and Equivalents$/i, /^Cash & Equivalents$/i, /^Cash$/i, /^Cash, Cash Equivalents/i],
  marketableSecurities: [/^Marketable Securities$/i, /^Short Term Investments$/i, /^Short-Term Investments$/i],
  shortDebt: [/^Short-Term Debt$/i, /^Short Term Debt$/i, /^Current Debt$/i, /^Short-Term Debt & Capital Lease Obligation$/i],
  longDebt: [/^Long-Term Debt$/i, /^Long Term Debt$/i, /^Long-Term Debt & Capital Lease Obligation$/i],
  totalDebt: [/^Total Debt$/i, /^Total Debt & Capital Lease Obligation$/i],
  marketCap: [/^Market Cap$/i, /^Market Cap \(MM\)$/i],
  priceClose: [/^Price Close$/i, /^Price$/i],
  peLtm: [/^LTM Price \/ Diluted EPS \(P\/E\)$/i, /^LTM Price \/ Normalized Earnings \(P\/E\)$/i],
  evFcfLtm: [/^LTM Total Enterprise Value \/ Unlevered Free Cash Flow$/i, /^LTM Total Enterprise Value \/ Free Cash Flow$/i],
  evEbitdaLtm: [/^LTM Total Enterprise Value \/ EBITDA$/i],
  evEbitLtm: [/^LTM Total Enterprise Value \/ EBIT$/i]
};

function normalizeLabel(label) {
  return String(label || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseNumber(value) {
  if (value === undefined || value === null) return null;
  let raw = String(value).trim();
  if (!raw || /^PRO$/i.test(raw) || raw === '-' || raw === '—') return null;
  const isNegative = /^\(.*\)$/.test(raw);
  raw = raw
    .replace(/[$,%x]/gi, '')
    .replace(/,/g, '')
    .replace(/[()]/g, '')
    .replace(/\s+/g, '')
    .replace(/−/g, '-');
  if (!raw || raw === '-') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return isNegative ? -n : n;
}

function parseYear(cell) {
  const text = String(cell || '').trim();
  const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (dateMatch) {
    const y = Number(dateMatch[3]);
    return y < 100 ? 2000 + y : y;
  }
  const yearMatch = text.match(/\b(19\d{2}|20\d{2})\b/);
  return yearMatch ? Number(yearMatch[1]) : null;
}

function parseTikrTable(rawText) {
  const rows = [];
  const lines = String(rawText || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    const parts = line.includes('\t') ? line.split('\t').map(p => p.trim()) : line.split(/\s{2,}/).map(p => p.trim());
    if (parts.length < 2) continue;
    const label = normalizeLabel(parts[0]);
    const values = parts.slice(1);
    rows.push({
      label,
      values,
      numbers: values.map(parseNumber),
      years: values.map(parseYear),
      raw: line
    });
  }
  return { rows };
}

function findRow(parsed, patterns) {
  if (!parsed || !Array.isArray(parsed.rows)) return null;
  const pats = Array.isArray(patterns) ? patterns : [patterns];
  return parsed.rows.find(row => pats.some(p => p.test(normalizeLabel(row.label)))) || null;
}

function valuesWithYears(row, parsed) {
  if (!row) return [];
  const header = parsed && parsed.rows.length ? parsed.rows[0] : null;
  return row.numbers.map((value, index) => ({
    value,
    year: header ? parseYear(header.values[index]) : parseYear(row.values[index]),
    rawHeader: header ? header.values[index] : row.values[index],
    index
  })).filter(x => Number.isFinite(x.value));
}

function compactNumbers(row, parsed = null, onlyYearValues = false) {
  if (!row) return [];
  if (onlyYearValues && parsed) return valuesWithYears(row, parsed).map(x => x.value);
  return row.numbers.filter(Number.isFinite);
}

function lastNumber(row) {
  const vals = compactNumbers(row);
  return vals.length ? vals[vals.length - 1] : null;
}

function latestActual(items) {
  const actuals = items.filter(x => /\bA\b/i.test(x.rawHeader || ''));
  const nonFuture = items.filter(x => !/\bE\b/i.test(x.rawHeader || '') && x.year);
  return actuals.length ? actuals[actuals.length - 1] : (nonFuture.length ? nonFuture[nonFuture.length - 1] : (items.length ? items[items.length - 1] : null));
}

function firstFuture(items) {
  const futures = items.filter(x => /\bE\b/i.test(x.rawHeader || ''));
  return futures.length ? futures[0] : null;
}

function lastFuture(items) {
  const futures = items.filter(x => /\bE\b/i.test(x.rawHeader || ''));
  return futures.length ? futures[futures.length - 1] : null;
}

function rowCagr(row, parsed) {
  if (!row || !parsed || !parsed.rows.length) return null;
  const header = parsed.rows[0];
  const idx = header.values.findIndex(v => /CAGR/i.test(String(v)));
  if (idx < 0) return null;
  const n = row.numbers[idx];
  return Number.isFinite(n) ? n / 100 : null;
}

function median(values) {
  const clean = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!clean.length) return null;
  const mid = Math.floor(clean.length / 2);
  return clean.length % 2 ? clean[mid] : (clean[mid - 1] + clean[mid]) / 2;
}

function average(values) {
  const clean = values.filter(Number.isFinite);
  if (!clean.length) return null;
  return clean.reduce((a, b) => a + b, 0) / clean.length;
}

function min(values) {
  const clean = values.filter(Number.isFinite);
  return clean.length ? Math.min(...clean) : null;
}

function cagr(start, end, years) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(years) || years <= 0 || start <= 0 || end <= 0) return null;
  return Math.pow(end / start, 1 / years) - 1;
}

function projectRow(row, parsed, targetYear, opts = {}) {
  const items = valuesWithYears(row, parsed);
  if (!items.length) return { value: null, year: targetYear, method: 'no encontrado', latest: null, firstFuture: null };

  const exact = items.find(x => x.year === targetYear);
  if (exact) return { value: exact.value, year: targetYear, method: 'dato directo TIKR', latest: latestActual(items), firstFuture: firstFuture(items) };

  const latest = latestActual(items);
  const ff = firstFuture(items);
  const lf = lastFuture(items);
  const anchor = lf || latest;
  if (!anchor || !anchor.year) return { value: anchor ? anchor.value : null, year: targetYear, method: 'último dato disponible', latest, firstFuture: ff };

  if (targetYear <= anchor.year) return { value: anchor.value, year: anchor.year, method: 'último dato disponible', latest, firstFuture: ff };

  if (opts.linear) {
    const ordered = items.filter(x => x.year).sort((a, b) => a.year - b.year);
    const a = ordered[ordered.length - 2];
    const b = ordered[ordered.length - 1];
    const delta = a && b && b.year !== a.year ? (b.value - a.value) / (b.year - a.year) : 0;
    return { value: anchor.value + delta * (targetYear - anchor.year), year: targetYear, method: 'extrapolado lineal', latest, firstFuture: ff };
  }

  let growth = rowCagr(row, parsed);
  if (!Number.isFinite(growth)) {
    const start = latest;
    const end = lf || anchor;
    growth = start && end && start.year && end.year && end.year > start.year ? cagr(start.value, end.value, end.year - start.year) : null;
  }
  if (!Number.isFinite(growth)) growth = 0;
  return { value: anchor.value * Math.pow(1 + growth, targetYear - anchor.year), year: targetYear, method: 'extrapolado por CAGR', latest, firstFuture: ff };
}

function projectShares(sharesRow, parsedIncome, targetYear) {
  const items = valuesWithYears(sharesRow, parsedIncome).filter(x => x.year).sort((a, b) => a.year - b.year);
  if (!items.length) return { value: null, year: targetYear, method: 'no encontrado' };
  const exact = items.find(x => x.year === targetYear);
  if (exact) return { value: exact.value, year: targetYear, method: 'dato directo TIKR' };
  const anchor = items[items.length - 1];
  if (targetYear <= anchor.year) return { value: anchor.value, year: anchor.year, method: 'último dato disponible' };

  const growths = [];
  for (let i = Math.max(1, items.length - 3); i < items.length; i++) {
    const prev = items[i - 1], cur = items[i];
    if (prev.value > 0 && cur.value > 0) growths.push(cur.value / prev.value - 1);
  }
  const g = Number.isFinite(median(growths)) ? median(growths) : 0;
  return { value: anchor.value * Math.pow(1 + g, targetYear - anchor.year), year: targetYear, method: 'proyectado con mediana recompra/dilución' };
}

function formatNumber(value, decimals = 2) {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function formatMoney(value, decimals = 2) { return Number.isFinite(value) ? '$' + formatNumber(value, decimals) : '—'; }
function formatPercent(value, decimals = 1) { return Number.isFinite(value) ? (value * 100).toFixed(decimals) + '%' : '—'; }
function cssClassFor(value) { if (!Number.isFinite(value)) return ''; if (value > 0.05) return 'positive'; if (value < 0) return 'negative'; return 'neutral'; }
function readManualMultiple(id) { const v = Number(document.getElementById(id).value); return Number.isFinite(v) && v > 0 ? v : null; }

function extractAllData() {
  const parsed = {
    income: parseTikrTable(document.getElementById(FIELD_IDS.income).value),
    balance: parseTikrTable(document.getElementById(FIELD_IDS.balance).value),
    cashflow: parseTikrTable(document.getElementById(FIELD_IDS.cashflow).value),
    estimates: parseTikrTable(document.getElementById(FIELD_IDS.estimates).value),
    multiples: parseTikrTable(document.getElementById(FIELD_IDS.multiples).value)
  };

  const rows = {
    revenue: findRow(parsed.estimates, ROW_PATTERNS.revenue) || findRow(parsed.income, ROW_PATTERNS.revenue),
    ebitda: findRow(parsed.estimates, ROW_PATTERNS.ebitda) || findRow(parsed.income, ROW_PATTERNS.ebitda),
    ebit: findRow(parsed.estimates, ROW_PATTERNS.ebit) || findRow(parsed.income, ROW_PATTERNS.ebit),
    netIncome: findRow(parsed.estimates, ROW_PATTERNS.netIncome) || findRow(parsed.income, ROW_PATTERNS.netIncome),
    eps: findRow(parsed.estimates, ROW_PATTERNS.epsNormalized) || findRow(parsed.estimates, ROW_PATTERNS.epsGaap) || findRow(parsed.income, ROW_PATTERNS.epsGaap),
    shares: findRow(parsed.income, ROW_PATTERNS.shares),
    fcf: findRow(parsed.estimates, ROW_PATTERNS.fcf) || findRow(parsed.cashflow, ROW_PATTERNS.fcf),
    cfo: findRow(parsed.estimates, ROW_PATTERNS.cfo) || findRow(parsed.cashflow, ROW_PATTERNS.cfo),
    capex: findRow(parsed.estimates, ROW_PATTERNS.capex) || findRow(parsed.cashflow, ROW_PATTERNS.capex),
    netDebt: findRow(parsed.estimates, ROW_PATTERNS.netDebt) || findRow(parsed.balance, ROW_PATTERNS.netDebt),
    cash: findRow(parsed.balance, ROW_PATTERNS.cash),
    securities: findRow(parsed.balance, ROW_PATTERNS.marketableSecurities),
    shortDebt: findRow(parsed.balance, ROW_PATTERNS.shortDebt),
    longDebt: findRow(parsed.balance, ROW_PATTERNS.longDebt),
    totalDebt: findRow(parsed.balance, ROW_PATTERNS.totalDebt),
    marketCap: findRow(parsed.multiples, ROW_PATTERNS.marketCap) || findRow(parsed.estimates, ROW_PATTERNS.marketCap),
    priceClose: findRow(parsed.multiples, ROW_PATTERNS.priceClose) || findRow(parsed.estimates, ROW_PATTERNS.priceClose),
    peHist: findRow(parsed.multiples, ROW_PATTERNS.peLtm),
    evFcfHist: findRow(parsed.multiples, ROW_PATTERNS.evFcfLtm),
    evEbitdaHist: findRow(parsed.multiples, ROW_PATTERNS.evEbitdaLtm),
    evEbitHist: findRow(parsed.multiples, ROW_PATTERNS.evEbitLtm)
  };

  const currentPrice = Number(document.getElementById('currentPriceExcel').value);
  const targetReturn = Number(document.getElementById('targetReturnExcel').value) / 100;
  const projectionYears = Number(document.getElementById('projectionYearsExcel').value) || 5;

  const epsItems = valuesWithYears(rows.eps, parsed.estimates);
  const latest = latestActual(epsItems) || latestActual(valuesWithYears(rows.revenue, parsed.estimates));
  const latestYear = latest && latest.year ? latest.year : new Date().getFullYear();
  const targetYear = latestYear + projectionYears;

  const metrics = {
    revenue: projectRow(rows.revenue, parsed.estimates, targetYear),
    ebitda: projectRow(rows.ebitda, parsed.estimates, targetYear),
    ebit: projectRow(rows.ebit, parsed.estimates, targetYear),
    netIncome: projectRow(rows.netIncome, parsed.estimates, targetYear),
    eps: projectRow(rows.eps, parsed.estimates, targetYear),
    fcf: projectRow(rows.fcf, parsed.estimates, targetYear)
  };

  if (!Number.isFinite(metrics.fcf.value) && rows.cfo && rows.capex) {
    const cfo = projectRow(rows.cfo, parsed.estimates, targetYear);
    const capex = projectRow(rows.capex, parsed.estimates, targetYear);
    metrics.fcf = { value: (cfo.value || 0) + (capex.value || 0), year: targetYear, method: 'CFO + CapEx' };
  }

  const firstFutureYear = firstFuture(valuesWithYears(rows.eps, parsed.estimates))?.year || (latestYear + 1);
  const firstFutureMetrics = {
    revenue: projectRow(rows.revenue, parsed.estimates, firstFutureYear),
    ebitda: projectRow(rows.ebitda, parsed.estimates, firstFutureYear),
    ebit: projectRow(rows.ebit, parsed.estimates, firstFutureYear),
    netIncome: projectRow(rows.netIncome, parsed.estimates, firstFutureYear),
    eps: projectRow(rows.eps, parsed.estimates, firstFutureYear),
    fcf: projectRow(rows.fcf, parsed.estimates, firstFutureYear)
  };
  if (!Number.isFinite(firstFutureMetrics.fcf.value) && rows.cfo && rows.capex) {
    const cfo = projectRow(rows.cfo, parsed.estimates, firstFutureYear);
    const capex = projectRow(rows.capex, parsed.estimates, firstFutureYear);
    firstFutureMetrics.fcf = { value: (cfo.value || 0) + (capex.value || 0), year: firstFutureYear, method: 'CFO + CapEx' };
  }

  let netDebtCurrent = null;
  if (rows.netDebt) netDebtCurrent = projectRow(rows.netDebt, parsed.estimates, latestYear, { linear: true }).value;
  if (!Number.isFinite(netDebtCurrent)) {
    const td = Number.isFinite(lastNumber(rows.totalDebt)) ? lastNumber(rows.totalDebt) : (lastNumber(rows.shortDebt) || 0) + (lastNumber(rows.longDebt) || 0);
    const cashInv = (lastNumber(rows.cash) || 0) + (lastNumber(rows.securities) || 0);
    if (Number.isFinite(td) && Number.isFinite(cashInv)) netDebtCurrent = td - cashInv;
  }
  const netDebtFirst = rows.netDebt ? projectRow(rows.netDebt, parsed.estimates, firstFutureYear, { linear: true }).value : netDebtCurrent;
  const netDebtTarget = rows.netDebt ? projectRow(rows.netDebt, parsed.estimates, targetYear, { linear: true }).value : netDebtCurrent;

  const sharesLatestFromIS = projectShares(rows.shares, parsed.income, latestYear);
  const sharesFirstFromIS = projectShares(rows.shares, parsed.income, firstFutureYear);
  const sharesTargetFromIS = projectShares(rows.shares, parsed.income, targetYear);
  const marketCap = lastNumber(rows.marketCap);
  const priceClose = lastNumber(rows.priceClose);
  const fallbackShares = Number.isFinite(marketCap) && Number.isFinite(priceClose) && priceClose > 0 ? marketCap / priceClose : null;

  const sharesLatest = Number.isFinite(sharesLatestFromIS.value) ? sharesLatestFromIS.value : fallbackShares;
  const sharesFirst = Number.isFinite(sharesFirstFromIS.value) ? sharesFirstFromIS.value : sharesLatest;
  const sharesTarget = Number.isFinite(sharesTargetFromIS.value) ? sharesTargetFromIS.value : sharesLatest;

  const impliedMarketCapFirst = Number.isFinite(currentPrice) && Number.isFinite(sharesFirst) ? currentPrice * sharesFirst : null;
  const impliedEvFirst = Number.isFinite(impliedMarketCapFirst) ? impliedMarketCapFirst + (Number.isFinite(netDebtFirst) ? netDebtFirst : 0) : null;

  const implied = {
    pe: Number.isFinite(currentPrice) && Number.isFinite(firstFutureMetrics.eps.value) && firstFutureMetrics.eps.value > 0 ? currentPrice / firstFutureMetrics.eps.value : null,
    evFcf: Number.isFinite(impliedEvFirst) && Number.isFinite(firstFutureMetrics.fcf.value) && firstFutureMetrics.fcf.value > 0 ? impliedEvFirst / firstFutureMetrics.fcf.value : null,
    evEbitda: Number.isFinite(impliedEvFirst) && Number.isFinite(firstFutureMetrics.ebitda.value) && firstFutureMetrics.ebitda.value > 0 ? impliedEvFirst / firstFutureMetrics.ebitda.value : null,
    evEbit: Number.isFinite(impliedEvFirst) && Number.isFinite(firstFutureMetrics.ebit.value) && firstFutureMetrics.ebit.value > 0 ? impliedEvFirst / firstFutureMetrics.ebit.value : null
  };

  const history = {
    pe: compactNumbers(rows.peHist, parsed.multiples, true).filter(v => v > 0 && v < 300),
    evFcf: compactNumbers(rows.evFcfHist, parsed.multiples, true).filter(v => v > 0 && v < 500),
    evEbitda: compactNumbers(rows.evEbitdaHist, parsed.multiples, true).filter(v => v > 0 && v < 200),
    evEbit: compactNumbers(rows.evEbitHist, parsed.multiples, true).filter(v => v > 0 && v < 200)
  };

  const manual = {
    pe: readManualMultiple('manualPER'),
    evFcf: readManualMultiple('manualEVFCF'),
    evEbitda: readManualMultiple('manualEVEBITDA'),
    evEbit: readManualMultiple('manualEVEBIT')
  };

  return { parsed, rows, metrics, firstFuture: firstFutureMetrics, market: { currentPrice, priceClose, marketCap, sharesLatest, sharesFirst, sharesTarget }, balance: { netDebtCurrent, netDebtFirst, netDebtTarget }, settings: { targetReturn, projectionYears, latestYear, firstFutureYear, targetYear }, implied, history, manual };
}

function chooseMultiple(data, key, fallback) {
  const manual = data.manual[key];
  const auto = data.implied[key];
  const histMedian = median(data.history[key] || []);
  const used = Number.isFinite(manual) ? manual : (Number.isFinite(auto) ? auto : (Number.isFinite(histMedian) ? histMedian : fallback));
  return { used, auto, manual, histMin: min(data.history[key] || []), histMedian, histAvg: average(data.history[key] || []) };
}

function calculateValuation(data) {
  const { metrics, market, balance, settings } = data;
  const years = settings.projectionYears || 5;
  const currentPrice = market.currentPrice;
  const sharesTarget = market.sharesTarget;
  const netDebtTarget = Number.isFinite(balance.netDebtTarget) ? balance.netDebtTarget : 0;

  const multiples = {
    pe: chooseMultiple(data, 'pe', 25),
    evFcf: chooseMultiple(data, 'evFcf', 25),
    evEbitda: chooseMultiple(data, 'evEbitda', 15),
    evEbit: chooseMultiple(data, 'evEbit', 20)
  };

  const methods = [];
  const netIncomeTarget = Number.isFinite(metrics.netIncome.value)
    ? metrics.netIncome.value
    : (Number.isFinite(metrics.eps.value) && Number.isFinite(sharesTarget) ? metrics.eps.value * sharesTarget : null);

  if (Number.isFinite(netIncomeTarget) && Number.isFinite(sharesTarget) && sharesTarget > 0) {
    const equityValue = netIncomeTarget * multiples.pe.used - netDebtTarget;
    methods.push({ name: 'PER ex Cash', metricLabel: 'Net income futuro', metric: netIncomeTarget, multiple: multiples.pe.used, targetPrice: equityValue / sharesTarget });
  }

  function evMethod(name, metricObj, multObj, label) {
    if (!Number.isFinite(metricObj.value) || !Number.isFinite(sharesTarget) || sharesTarget <= 0) return;
    const equityValue = metricObj.value * multObj.used - netDebtTarget;
    methods.push({ name, metricLabel: label, metric: metricObj.value, multiple: multObj.used, targetPrice: equityValue / sharesTarget });
  }

  evMethod('EV / FCF', metrics.fcf, multiples.evFcf, 'FCF futuro');
  evMethod('EV / EBITDA', metrics.ebitda, multiples.evEbitda, 'EBITDA futuro');
  evMethod('EV / EBIT', metrics.ebit, multiples.evEbit, 'EBIT futuro');

  methods.forEach(m => {
    m.upside = Number.isFinite(currentPrice) && currentPrice > 0 ? (m.targetPrice - currentPrice) / currentPrice : null;
    m.cagr = Number.isFinite(currentPrice) && currentPrice > 0 ? cagr(currentPrice, m.targetPrice, years) : null;
    m.buyPriceForTargetReturn = Number.isFinite(settings.targetReturn) ? m.targetPrice / Math.pow(1 + settings.targetReturn, years) : null;
  });

  return { methods, multiples };
}

function updateManualInputs(multiples) {
  const map = [ ['manualPER', multiples.pe], ['manualEVFCF', multiples.evFcf], ['manualEVEBITDA', multiples.evEbitda], ['manualEVEBIT', multiples.evEbit] ];
  for (const [id, obj] of map) {
    const el = document.getElementById(id);
    if (el && !el.value && Number.isFinite(obj.auto)) el.placeholder = obj.auto.toFixed(2);
  }
}

function renderDetectedData(data) {
  const rows = [
    ['Precio actual manual', formatMoney(data.market.currentPrice)],
    ['Último precio detectado en TIKR', formatMoney(data.market.priceClose)],
    ['Market Cap detectado', Number.isFinite(data.market.marketCap) ? formatNumber(data.market.marketCap, 0) + ' MM' : '—'],
    ['Acciones últimas detectadas', Number.isFinite(data.market.sharesLatest) ? formatNumber(data.market.sharesLatest, 2) + ' MM' : '—'],
    ['Acciones proyectadas', Number.isFinite(data.market.sharesTarget) ? formatNumber(data.market.sharesTarget, 2) + ` MM (${data.settings.targetYear})` : '—'],
    ['Deuda neta actual', Number.isFinite(data.balance.netDebtCurrent) ? formatNumber(data.balance.netDebtCurrent, 0) + ' MM' : '—'],
    ['Deuda neta proyectada', Number.isFinite(data.balance.netDebtTarget) ? formatNumber(data.balance.netDebtTarget, 0) + ` MM (${data.settings.targetYear})` : '—'],
    ['Net income futuro', Number.isFinite(data.metrics.netIncome.value) ? formatNumber(data.metrics.netIncome.value, 0) + ' MM' : '—'],
    ['EPS futuro', Number.isFinite(data.metrics.eps.value) ? formatNumber(data.metrics.eps.value, 2) : '—'],
    ['EBITDA futuro', Number.isFinite(data.metrics.ebitda.value) ? formatNumber(data.metrics.ebitda.value, 0) + ' MM' : '—'],
    ['EBIT futuro', Number.isFinite(data.metrics.ebit.value) ? formatNumber(data.metrics.ebit.value, 0) + ' MM' : '—'],
    ['FCF futuro', Number.isFinite(data.metrics.fcf.value) ? formatNumber(data.metrics.fcf.value, 0) + ' MM' : '—'],
    ['Años de proyección', `${data.settings.projectionYears} (${data.settings.latestYear} → ${data.settings.targetYear})`]
  ];

  document.getElementById('detectedDataExcel').innerHTML = `<div class="metric-list">${rows.map(([k, v]) => `<div class="metric-line"><span>${k}</span><strong>${v}</strong></div>`).join('')}</div>`;
}

function renderSuggestions(multiples) {
  const blocks = [ ['PER', multiples.pe], ['EV/FCF', multiples.evFcf], ['EV/EBITDA', multiples.evEbitda], ['EV/EBIT', multiples.evEbit] ];
  document.getElementById('multipleSuggestionsExcel').innerHTML = `<div class="metric-list">${blocks.map(([name, s]) => `
    <div class="metric-line"><span>${name} usado</span><strong>${formatNumber(s.used, 2)}x</strong></div>
    <div class="metric-line"><span>${name} auto forward / mediana hist.</span><strong>${formatNumber(s.auto, 2)}x / ${formatNumber(s.histMedian, 2)}x</strong></div>
    <div class="metric-line"><span>${name} mínimo hist. / media hist.</span><strong>${formatNumber(s.histMin, 2)}x / ${formatNumber(s.histAvg, 2)}x</strong></div>
  `).join('')}</div>`;
}

function renderValuation(methods) {
  const tbody = document.getElementById('valuationRowsExcel');
  if (!methods.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hay datos suficientes para valorar.</td></tr>';
    return;
  }
  tbody.innerHTML = methods.map(m => `<tr>
    <td>${m.name}</td>
    <td>${m.metricLabel}: ${formatNumber(m.metric, 0)}</td>
    <td>${formatNumber(m.multiple, 2)}x</td>
    <td>${formatMoney(m.targetPrice)}</td>
    <td class="${cssClassFor(m.upside)}">${formatPercent(m.upside)}</td>
    <td class="${cssClassFor(m.cagr)}">${formatPercent(m.cagr)}</td>
    <td>${formatMoney(m.buyPriceForTargetReturn)}</td>
  </tr>`).join('');
}

function renderSummary(methods, currentPrice) {
  const targets = methods.map(m => m.targetPrice).filter(Number.isFinite);
  const cagrs = methods.map(m => m.cagr).filter(Number.isFinite);
  const buys = methods.map(m => m.buyPriceForTargetReturn).filter(Number.isFinite);
  const avgTarget = average(targets);
  const avgCagr = average(cagrs);
  const avgBuy = average(buys);
  const margin = Number.isFinite(avgTarget) && Number.isFinite(currentPrice) && currentPrice > 0 ? (avgTarget - currentPrice) / avgTarget : null;
  document.getElementById('valuationSummaryExcel').innerHTML = `<div class="summary-grid">
    <div class="summary-tile"><span>Precio objetivo medio</span><strong>${formatMoney(avgTarget)}</strong></div>
    <div class="summary-tile"><span>CAGR medio</span><strong class="${cssClassFor(avgCagr)}">${formatPercent(avgCagr)}</strong></div>
    <div class="summary-tile"><span>Margen de seguridad</span><strong class="${cssClassFor(margin)}">${formatPercent(margin)}</strong></div>
    <div class="summary-tile"><span>Precio compra medio para TIR objetivo</span><strong>${formatMoney(avgBuy)}</strong></div>
  </div>`;
}

function renderWarnings(data, valuation) {
  const w = [];
  if (!Number.isFinite(data.market.currentPrice)) w.push('Falta el precio actual manual.');
  if (!Number.isFinite(data.market.sharesLatest)) w.push('No se detectaron acciones diluidas. Se intentará usar MarketCap/Price como fallback, pero puede distorsionar el resultado.');
  if (!Number.isFinite(data.balance.netDebtTarget)) w.push('No se pudo proyectar deuda neta.');
  if (!Number.isFinite(data.implied.pe)) w.push('No se pudo calcular PER forward implícito; revisa EPS/acciones/precio.');
  if (!valuation.methods.length) w.push('No hay datos suficientes para generar valoración.');
  if (!w.length) w.push('Datos principales detectados correctamente. Esta versión usa una lógica más parecida al Excel: múltiplos forward implícitos, acciones proyectadas y PER ex-cash.');
  document.getElementById('dataWarningsExcel').innerHTML = w.map(x => `<li>${x}</li>`).join('');
}

function runValuation() {
  const status = document.getElementById('valuationStatusExcel');
  try {
    const data = extractAllData();
    const valuation = calculateValuation(data);
    updateManualInputs(valuation.multiples);
    renderDetectedData(data);
    renderSuggestions(valuation.multiples);
    renderValuation(valuation.methods);
    renderSummary(valuation.methods, data.market.currentPrice);
    renderWarnings(data, valuation);
    status.textContent = 'Análisis completado.';
  } catch (err) {
    console.error(err);
    status.textContent = 'Error al analizar los datos. Revisa la consola.';
  }
}

function clearResults() {
  document.getElementById('detectedDataExcel').innerHTML = 'Aún no hay datos analizados.';
  document.getElementById('multipleSuggestionsExcel').innerHTML = 'Pega los datos y pulsa analizar.';
  document.getElementById('valuationRowsExcel').innerHTML = '<tr><td colspan="7" class="empty-state">Pulsa “Analizar y valorar”.</td></tr>';
  document.getElementById('valuationSummaryExcel').innerHTML = 'Sin resumen todavía.';
  document.getElementById('dataWarningsExcel').innerHTML = '<li>Los cálculos son orientativos.</li>';
  document.getElementById('valuationStatusExcel').textContent = '';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btnParseValuationExcel').addEventListener('click', runValuation);
  document.getElementById('btnClearValuationExcel').addEventListener('click', clearResults);
});
