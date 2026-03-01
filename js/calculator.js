'use strict';

// ── DOM refs ──────────────────────────────────────────────
const calculateBtn = document.getElementById('calculate-btn');
const resultsEl    = document.getElementById('results');
const chartSection = document.getElementById('chart-section');
const tableSection = document.getElementById('table-section');
const noteEl       = document.getElementById('affordability-note');
const canvas       = document.getElementById('amort-chart');
const tooltipEl    = document.getElementById('chart-tooltip');
const tbody        = document.getElementById('amort-tbody');

const fields = {
  annualIncome:  document.getElementById('annual-income'),
  monthlyDebts:  document.getElementById('monthly-debts'),
  downPayment:   document.getElementById('down-payment'),
  interestRate:  document.getElementById('interest-rate'),
  loanTerm:      document.getElementById('loan-term'),
  propertyTax:   document.getElementById('property-tax'),
  homeInsurance: document.getElementById('home-insurance'),
};

const out = {
  maxHomePrice:   document.getElementById('max-home-price'),
  maxLoan:        document.getElementById('max-loan'),
  monthlyPayment: document.getElementById('monthly-payment'),
  totalInterest:  document.getElementById('total-interest'),
  totalCost:      document.getElementById('total-cost'),
  piPayment:      document.getElementById('pi-payment'),
  dtiRatio:       document.getElementById('dti-ratio'),
  dtiPctLabel:    document.getElementById('dti-pct-label'),
  dtiDebts:       document.getElementById('dti-debts-segment'),
  dtiHousing:     document.getElementById('dti-housing-segment'),
};

// ── Formatters ────────────────────────────────────────────
const fmt = n =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

function fmtShort(n) {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return '$' + Math.round(n / 1_000) + 'K';
  return '$' + Math.round(n);
}

// ── Math helpers ──────────────────────────────────────────

/** Monthly principal + interest payment for a fixed-rate mortgage. */
function calcMonthlyPI(principal, annualRate, termYears) {
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return principal / n;
  return principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
}

/**
 * Binary-search for the largest loan whose monthly P&I ≤ maxMonthly.
 * Converges to <$0.01 in 60 iterations.
 */
function maxAffordableLoan(maxMonthly, annualRate, termYears) {
  let lo = 0, hi = 10_000_000;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    calcMonthlyPI(mid, annualRate, termYears) <= maxMonthly ? (lo = mid) : (hi = mid);
  }
  return lo;
}

/**
 * Build a year-by-year amortization schedule.
 * Returns array of { year, principal, interest, balance }.
 */
function buildAmortSchedule(principal, annualRate, termYears) {
  const r         = annualRate / 100 / 12;
  const monthlyPI = calcMonthlyPI(principal, annualRate, termYears);
  let   balance   = principal;
  const rows      = [];

  for (let yr = 1; yr <= termYears; yr++) {
    let yrPrincipal = 0, yrInterest = 0;
    for (let m = 0; m < 12; m++) {
      const intPmt = balance * r;
      const priPmt = Math.min(monthlyPI - intPmt, balance);
      yrInterest  += intPmt;
      yrPrincipal += priPmt;
      balance      = Math.max(0, balance - priPmt);
    }
    rows.push({ year: yr, principal: yrPrincipal, interest: yrInterest, balance });
  }
  return rows;
}

/** Round maxVal up to a clean number for chart y-axis. */
function niceMax(maxVal, steps = 5) {
  const step = maxVal / steps;
  const mag  = Math.pow(10, Math.floor(Math.log10(step)));
  const norm = step / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return Math.ceil(maxVal / (nice * mag)) * (nice * mag);
}

// ── Chart ─────────────────────────────────────────────────
let lastSchedule = null;
let hitAreas     = [];

function drawChart(schedule) {
  const dpr = window.devicePixelRatio || 1;
  const W   = canvas.offsetWidth;
  const H   = canvas.offsetHeight;

  canvas.width  = W * dpr;
  canvas.height = H * dpr;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const PAD   = { top: 20, right: 16, bottom: 44, left: 70 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top  - PAD.bottom;
  const n     = schedule.length;

  const rawMax = Math.max(...schedule.map(d => d.principal + d.interest));
  const yMax   = niceMax(rawMax);
  const yStep  = yMax / 5;

  ctx.font = '11px -apple-system, system-ui, sans-serif';

  // Horizontal grid lines + Y-axis labels
  for (let v = 0; v <= yMax; v += yStep) {
    const y = PAD.top + plotH - (v / yMax) * plotH;

    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(PAD.left + plotW, y);
    ctx.stroke();

    ctx.fillStyle    = '#94a3b8';
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(fmtShort(v), PAD.left - 6, y);
  }

  // Stacked bars
  hitAreas = [];
  const slotW  = plotW / n;
  const barW   = Math.max(slotW * 0.72, 3);
  const barOff = (slotW - barW) / 2;
  const yBase  = PAD.top + plotH;

  schedule.forEach((d, i) => {
    const x    = PAD.left + i * slotW + barOff;
    const priH = (d.principal / yMax) * plotH;
    const intH = (d.interest  / yMax) * plotH;

    // Interest segment (top, orange)
    ctx.fillStyle = '#f97316';
    ctx.fillRect(x, yBase - priH - intH, barW, intH);

    // Principal segment (bottom, blue)
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(x, yBase - priH, barW, priH);

    hitAreas.push({ x, w: barW, data: d });
  });

  // X-axis labels
  const every = n <= 15 ? 1 : 5;
  ctx.fillStyle    = '#94a3b8';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  schedule.forEach((d, i) => {
    if (d.year === 1 || d.year % every === 0) {
      ctx.fillText(`Yr ${d.year}`, PAD.left + i * slotW + slotW / 2, yBase + 8);
    }
  });

  // Axis lines
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(PAD.left, PAD.top);
  ctx.lineTo(PAD.left, yBase);
  ctx.lineTo(PAD.left + plotW, yBase);
  ctx.stroke();
}

// ── Table ─────────────────────────────────────────────────
function renderTable(schedule) {
  tbody.innerHTML = '';
  schedule.forEach(d => {
    const tr = document.createElement('tr');
    tr.innerHTML =
      `<td>${d.year}</td>` +
      `<td>${fmt(d.principal)}</td>` +
      `<td class="col-interest">${fmt(d.interest)}</td>` +
      `<td>${fmt(d.principal + d.interest)}</td>` +
      `<td class="col-balance">${fmt(d.balance)}</td>`;
    tbody.appendChild(tr);
  });
}

// ── Core calculation ──────────────────────────────────────
function calculate() {
  const annualIncome = parseFloat(fields.annualIncome.value)  || 0;
  const monthlyDebts = parseFloat(fields.monthlyDebts.value)  || 0;
  const downPayment  = parseFloat(fields.downPayment.value)   || 0;
  const interestRate = parseFloat(fields.interestRate.value)  || 0;
  const loanTerm     = parseInt(fields.loanTerm.value, 10)    || 30;
  const propTaxRate  = parseFloat(fields.propertyTax.value)   || 0;
  const annualIns    = parseFloat(fields.homeInsurance.value) || 0;

  if (annualIncome <= 0 || interestRate <= 0) {
    alert('Please enter your annual income and interest rate.');
    return;
  }

  const monthlyIncome = annualIncome / 12;

  // Standard lending limits: 28% front-end DTI, 43% total DTI
  const maxHousing = Math.min(
    monthlyIncome * 0.28,
    monthlyIncome * 0.43 - monthlyDebts
  );

  if (maxHousing <= 0) {
    showNote('bad',
      'Your existing debts exceed standard lending limits. ' +
      'Focus on paying them down before applying for a mortgage.');
    resultsEl.hidden = false;
    clearStats();
    return;
  }

  const monthlyIns = annualIns / 12;

  // Iteratively refine the loan amount: property tax scales with home price
  let loan = maxAffordableLoan(maxHousing - monthlyIns, interestRate, loanTerm);
  for (let i = 0; i < 10; i++) {
    const mtx = propTaxRate / 100 * (loan + downPayment) / 12;
    loan = maxAffordableLoan(maxHousing - mtx - monthlyIns, interestRate, loanTerm);
  }

  const homePrice     = loan + downPayment;
  const monthlyTax    = propTaxRate / 100 * homePrice / 12;
  const piPayment     = calcMonthlyPI(loan, interestRate, loanTerm);
  const totalMonthly  = piPayment + monthlyTax + monthlyIns;
  const totalInterest = piPayment * loanTerm * 12 - loan;
  const totalCost     = loan + totalInterest;
  const totalDTI      = (totalMonthly + monthlyDebts) / monthlyIncome;
  const frontDTI      = totalMonthly / monthlyIncome;

  // Populate stat cards
  out.maxHomePrice.textContent   = fmt(homePrice);
  out.maxLoan.textContent        = fmt(loan);
  out.monthlyPayment.textContent = fmt(totalMonthly);
  out.totalInterest.textContent  = fmt(totalInterest);
  out.totalCost.textContent      = fmt(totalCost);
  out.piPayment.textContent      = fmt(piPayment);
  out.dtiRatio.textContent       = (totalDTI * 100).toFixed(1) + '%';
  out.dtiPctLabel.textContent    = (totalDTI * 100).toFixed(1) + '% of income';

  // DTI bar (100 % = monthly income)
  const debtsPct   = Math.min((monthlyDebts / monthlyIncome) * 100, 100);
  const housingPct = Math.min((totalMonthly  / monthlyIncome) * 100, 100 - debtsPct);
  out.dtiDebts.style.width   = debtsPct   + '%';
  out.dtiHousing.style.width = housingPct + '%';

  // Affordability verdict
  if (totalDTI <= 0.36 && frontDTI <= 0.28) {
    showNote('good',
      `Great shape! Your total DTI is ${(totalDTI * 100).toFixed(1)}% — well within the ideal 36% threshold.`);
  } else if (totalDTI <= 0.43) {
    showNote('warning',
      `Your DTI is ${(totalDTI * 100).toFixed(1)}%. You may still qualify, but consider a larger down payment or reducing existing debts to strengthen your application.`);
  } else {
    showNote('bad',
      `Your DTI of ${(totalDTI * 100).toFixed(1)}% exceeds the typical 43% maximum. Reduce debts, increase income, or target a lower home price.`);
  }

  resultsEl.hidden = false;

  // Chart & amortization table
  lastSchedule = buildAmortSchedule(loan, interestRate, loanTerm);
  chartSection.hidden = false;
  tableSection.hidden = false;

  requestAnimationFrame(() => drawChart(lastSchedule));
  renderTable(lastSchedule);
}

function clearStats() {
  ['maxHomePrice','maxLoan','monthlyPayment','totalInterest','totalCost','piPayment','dtiRatio']
    .forEach(k => { out[k].textContent = '—'; });
  out.dtiDebts.style.width = out.dtiHousing.style.width = '0%';
  chartSection.hidden = tableSection.hidden = true;
}

function showNote(type, msg) {
  noteEl.className   = `afford-note ${type}`;
  noteEl.textContent = msg;
}

// ── Chart hover tooltip ───────────────────────────────────
canvas.addEventListener('mousemove', e => {
  if (!hitAreas.length) return;
  const rect = canvas.getBoundingClientRect();
  const mx   = e.clientX - rect.left;
  const hit  = hitAreas.find(a => mx >= a.x && mx <= a.x + a.w);

  if (hit) {
    const d = hit.data;
    tooltipEl.innerHTML =
      `<strong>Year ${d.year}</strong><br>` +
      `<span style="color:#93c5fd">▪ Principal:</span> ${fmt(d.principal)}<br>` +
      `<span style="color:#fdba74">▪ Interest:</span>  ${fmt(d.interest)}<br>` +
      `<span style="color:#94a3b8">▪ Balance:</span>   ${fmt(d.balance)}`;

    // Flip to left side when near right edge
    const tipX = mx > rect.width / 2 ? mx - 170 : mx + 14;
    const tipY = Math.max(e.clientY - rect.top - 85, 4);
    tooltipEl.style.cssText = `display:block;left:${tipX}px;top:${tipY}px`;
  } else {
    tooltipEl.style.display = 'none';
  }
});

canvas.addEventListener('mouseleave', () => { tooltipEl.style.display = 'none'; });

// ── Redraw chart on resize ────────────────────────────────
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (!chartSection.hidden && lastSchedule) drawChart(lastSchedule);
  }, 150);
});

// ── Event listeners ───────────────────────────────────────
calculateBtn.addEventListener('click', calculate);
Object.values(fields).forEach(el =>
  el.addEventListener('keydown', e => { if (e.key === 'Enter') calculate(); })
);
