'use strict';

// ── Constants ─────────────────────────────────────────────
const PRICES       = [350000, 400000, 450000, 500000, 550000, 600000, 650000, 700000, 800000];
const DOWN_PCTS    = [0.05, 0.10, 0.20];
const AMORT_YEARS  = [1, 2, 3, 5, 7, 10, 15, 20, 25, 30];
const CLOSING_COST = 8500;
const PMI_RATE     = 0.005; // 0.5% per year

let currentTerm = 30;

// ── DOM refs ──────────────────────────────────────────────
const els = {
  annualIncome:     document.getElementById('annual-income'),
  taxRate:          document.getElementById('tax-rate'),
  retirementSavings:document.getElementById('retirement-savings'),
  livingExpenses:   document.getElementById('living-expenses'),
  monthlyDebts:     document.getElementById('monthly-debts'),
  cashToClose:      document.getElementById('cash-to-close'),
  interestRate:     document.getElementById('interest-rate'),
  propertyTax:      document.getElementById('property-tax'),
  insuranceRate:    document.getElementById('insurance-rate'),
  hoaFee:           document.getElementById('hoa-fee'),
  comparisonPrice:  document.getElementById('comparison-price'),
};

// ── Formatters ────────────────────────────────────────────
const fmt = n => '$' + Math.round(Math.abs(n)).toLocaleString('en-US');

function fmtSurplus(n) {
  return (n >= 0 ? '+' : '−') + fmt(n) + '/mo';
}

// ── Math ──────────────────────────────────────────────────
function monthlyPI(principal, annualRate, termYears) {
  if (principal <= 0) return 0;
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return principal / n;
  return principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
}

/**
 * Full monthly PITI breakdown for a given price + down payment.
 * @returns {{ piti, pi, pmi, tax, ins, loan }}
 */
function pitiBreakdown(price, downPct, rate, term, taxPct, insPct, hoa) {
  const loan = price * (1 - downPct);
  const pi   = monthlyPI(loan, rate, term);
  const pmi  = downPct < 0.20 ? (loan * PMI_RATE) / 12 : 0;
  const tax  = (price * taxPct / 100) / 12;
  const ins  = (price * insPct / 100) / 12;
  return { piti: pi + pmi + tax + ins + hoa, pi, pmi, tax, ins, loan };
}

/**
 * Calculate a specific year's principal and interest paid.
 * Returns null if year > term (loan already paid off).
 */
function yearAmort(loan, annualRate, termYears, targetYear) {
  if (targetYear > termYears || loan <= 0) return null;
  const r   = annualRate / 100 / 12;
  const mpi = monthlyPI(loan, annualRate, termYears);
  let balance = loan;

  // Advance to the start of the target year
  for (let m = 0; m < (targetYear - 1) * 12; m++) {
    const intPmt = balance * r;
    balance -= (mpi - intPmt);
    if (balance <= 0) return null;
  }

  let yrPrincipal = 0, yrInterest = 0;
  for (let m = 0; m < 12; m++) {
    if (balance <= 0) break;
    const intPmt = balance * r;
    const priPmt = Math.min(mpi - intPmt, balance);
    yrInterest  += intPmt;
    yrPrincipal += priPmt;
    balance      = Math.max(0, balance - priPmt);
  }
  return { principal: yrPrincipal, interest: yrInterest };
}

// ── Read inputs ───────────────────────────────────────────
function getVals() {
  return {
    annualIncome:      parseFloat(els.annualIncome.value)      || 0,
    taxRate:           parseFloat(els.taxRate.value)           || 0,
    retirementSavings: parseFloat(els.retirementSavings.value) || 0,
    livingExpenses:    parseFloat(els.livingExpenses.value)    || 0,
    monthlyDebts:      parseFloat(els.monthlyDebts.value)      || 0,
    cashToClose:       parseFloat(els.cashToClose.value)       || 0,
    interestRate:      parseFloat(els.interestRate.value)      || 0,
    propertyTax:       parseFloat(els.propertyTax.value)       || 0,
    insuranceRate:     parseFloat(els.insuranceRate.value)     || 0,
    hoaFee:            parseFloat(els.hoaFee.value)            || 0,
    comparisonPrice:   parseFloat(els.comparisonPrice.value)   || 550000,
    term:              currentTerm,
  };
}

// ── Compute cash flow ─────────────────────────────────────
function cashFlow(v) {
  const gross      = v.annualIncome / 12;
  const taxes      = gross * v.taxRate / 100;
  const retirement = v.retirementSavings / 12;
  const available  = gross - taxes - retirement - v.livingExpenses - v.monthlyDebts;
  return { gross, taxes, retirement, available };
}

// ── Render: KPI bar ───────────────────────────────────────
function renderKPIs(cf) {
  document.getElementById('kpi-gross').textContent      = fmt(cf.gross);
  document.getElementById('kpi-retirement').textContent = fmt(cf.retirement);
  document.getElementById('kpi-available').textContent  = fmt(cf.available);
  document.getElementById('kpi-dti-ceiling').textContent= fmt(cf.gross * 0.28);
}

// ── Render: Waterfall ─────────────────────────────────────
function renderWaterfall(v, cf) {
  document.getElementById('wf-gross').textContent     = fmt(cf.gross);
  document.getElementById('wf-taxes').textContent     = '−' + fmt(cf.taxes);
  document.getElementById('wf-retirement').textContent= '−' + fmt(cf.retirement);
  document.getElementById('wf-living').textContent    = '−' + fmt(v.livingExpenses);
  document.getElementById('wf-debts').textContent     = '−' + fmt(v.monthlyDebts);
  document.getElementById('wf-available').textContent = fmt(cf.available);
}

// ── Render: Comparison card ───────────────────────────────
function renderComparison(v, cf) {
  [30, 15].forEach(term => {
    const b   = pitiBreakdown(v.comparisonPrice, 0.10, v.interestRate, term, v.propertyTax, v.insuranceRate, v.hoaFee);
    const totalPI       = b.pi * term * 12;
    const totalInterest = totalPI - b.loan;
    const surplus       = cf.available - b.piti;
    const pfx           = term === 30 ? 'c30' : 'c15';

    document.getElementById(`${pfx}-piti`).textContent     = fmt(b.piti);
    document.getElementById(`${pfx}-pi`).textContent       = fmt(b.pi);
    document.getElementById(`${pfx}-total`).textContent    = fmt(totalPI);
    document.getElementById(`${pfx}-interest`).textContent = fmt(totalInterest);

    const surplusEl = document.getElementById(`${pfx}-surplus`);
    surplusEl.textContent = fmtSurplus(surplus);
    surplusEl.className   = `comp-surplus badge ${surplus >= 0 ? 'badge-green' : 'badge-red'}`;
  });
}

// ── Render: Affordability matrix ──────────────────────────
function renderMatrix(v, cf) {
  document.getElementById('matrix-meta').textContent =
    `${v.term}yr · ${v.interestRate.toFixed(3)}%`;

  const tbody = document.getElementById('matrix-tbody');
  tbody.innerHTML = '';

  PRICES.forEach(price => {
    const tr = document.createElement('tr');
    const label = price >= 1_000_000
      ? '$' + (price / 1_000_000).toFixed(1) + 'M'
      : '$' + (price / 1000) + 'k';
    tr.innerHTML = `<td class="price-cell">${label}</td>`;

    DOWN_PCTS.forEach(downPct => {
      const b         = pitiBreakdown(price, downPct, v.interestRate, v.term, v.propertyTax, v.insuranceRate, v.hoaFee);
      const surplus   = cf.available - b.piti;
      const dti       = cf.gross > 0 ? (b.piti / cf.gross) * 100 : 0;
      const cashNeeded= price * downPct + CLOSING_COST;
      const cashWarn  = cashNeeded > v.cashToClose;

      const surplusCls = surplus >= 0 ? 'badge-green' : 'badge-red';
      const surplusStr = (surplus >= 0 ? '+' : '−') + '$' +
        Math.round(Math.abs(surplus)).toLocaleString('en-US');

      const dtiCls = dti <= 28 ? 'badge-green' : dti <= 36 ? 'badge-amber' : 'badge-red';

      tr.innerHTML +=
        `<td>` +
          `<div class="cell-piti">${fmt(b.piti)}</div>` +
          `<div class="cell-badges">` +
            `<span class="badge ${surplusCls}">${surplusStr}</span>` +
            `<span class="badge ${dtiCls}">${dti.toFixed(1)}%</span>` +
            (cashWarn ? `<span class="badge badge-amber">⚠ cash</span>` : '') +
          `</div>` +
        `</td>`;
    });

    tbody.appendChild(tr);
  });
}

// ── Render: Amortization snapshot ────────────────────────
function renderAmortization(v) {
  const price   = v.comparisonPrice;
  const downPct = 0.10;
  const loan    = price * (1 - downPct);
  const years   = AMORT_YEARS.filter(y => y <= v.term);

  document.getElementById('amort-meta').textContent =
    `${fmt(price)} · 10% down · ${v.term}yr · ${v.interestRate.toFixed(3)}%`;

  const container = document.getElementById('amort-bars');
  container.innerHTML = '';

  // Pre-compute breakdowns to find scale max
  const breakdowns = years.map(y => yearAmort(loan, v.interestRate, v.term, y));
  const maxTotal   = Math.max(...breakdowns.map(b => b ? b.principal + b.interest : 0), 1);

  years.forEach((year, i) => {
    const bd = breakdowns[i];
    if (!bd) return;

    // Bar width proportional to this year's payment vs max (all years nearly equal for fixed-rate,
    // but we scale relative to annual payment so bars fill available width consistently)
    const priPct = (bd.principal / (bd.principal + bd.interest)) * 100;
    const intPct = 100 - priPct;

    const row = document.createElement('div');
    row.className = 'amort-row';
    row.innerHTML =
      `<span class="amort-year">Yr ${year}</span>` +
      `<div class="amort-bar">` +
        `<div class="amort-seg amort-principal" style="width:${priPct.toFixed(1)}%"></div>` +
        `<div class="amort-seg amort-interest"  style="width:${intPct.toFixed(1)}%"></div>` +
      `</div>` +
      `<div class="amort-vals">` +
        `<span class="amort-p-val">$${Math.round(bd.principal).toLocaleString()}</span>` +
        `<span class="amort-sep">·</span>` +
        `<span class="amort-i-val">$${Math.round(bd.interest).toLocaleString()}</span>` +
      `</div>`;
    container.appendChild(row);
  });
}

// ── Master update ─────────────────────────────────────────
function updateAll() {
  const v  = getVals();
  const cf = cashFlow(v);
  renderKPIs(cf);
  renderWaterfall(v, cf);
  renderComparison(v, cf);
  renderMatrix(v, cf);
  renderAmortization(v);
}

// ── Term toggle ───────────────────────────────────────────
document.getElementById('btn-30').addEventListener('click', () => {
  currentTerm = 30;
  document.getElementById('btn-30').classList.add('active');
  document.getElementById('btn-15').classList.remove('active');
  updateAll();
});

document.getElementById('btn-15').addEventListener('click', () => {
  currentTerm = 15;
  document.getElementById('btn-15').classList.add('active');
  document.getElementById('btn-30').classList.remove('active');
  updateAll();
});

// ── Live update on all inputs ─────────────────────────────
Object.values(els).forEach(el => el.addEventListener('input', updateAll));

// ── Boot ──────────────────────────────────────────────────
updateAll();
