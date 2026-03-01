'use strict';

// ── DOM refs ──────────────────────────────────────────────
const btn           = document.getElementById('calculate-btn');
const resultsEl     = document.getElementById('results');
const noteEl        = document.getElementById('affordability-note');

const fields = {
  annualIncome:   document.getElementById('annual-income'),
  monthlyDebts:   document.getElementById('monthly-debts'),
  downPayment:    document.getElementById('down-payment'),
  interestRate:   document.getElementById('interest-rate'),
  loanTerm:       document.getElementById('loan-term'),
  propertyTax:    document.getElementById('property-tax'),
  homeInsurance:  document.getElementById('home-insurance'),
};

const out = {
  maxHomePrice:   document.getElementById('max-home-price'),
  maxLoan:        document.getElementById('max-loan'),
  monthlyPayment: document.getElementById('monthly-payment'),
  piPayment:      document.getElementById('pi-payment'),
  taxPayment:     document.getElementById('tax-payment'),
  insurancePayment: document.getElementById('insurance-payment'),
  dtiRatio:       document.getElementById('dti-ratio'),
  dtiDebtsSegment:  document.getElementById('dti-debts-segment'),
  dtiHousingSegment: document.getElementById('dti-housing-segment'),
};

// ── Helpers ───────────────────────────────────────────────

/**
 * Format a number as USD currency string.
 * @param {number} n
 * @returns {string}
 */
function formatUSD(n) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

/**
 * Calculate monthly mortgage payment (principal + interest).
 * @param {number} principal  - Loan amount in dollars
 * @param {number} annualRate - Annual interest rate as a percentage (e.g. 6.5)
 * @param {number} termYears  - Loan term in years
 * @returns {number} Monthly P&I payment
 */
function calcMonthlyPI(principal, annualRate, termYears) {
  const r = annualRate / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return principal / n;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

/**
 * Find the maximum loan that keeps total monthly payment within the DTI limit.
 * Uses binary search over loan amount.
 *
 * @param {number} maxMonthlyHousing - Max allowed monthly housing cost
 * @param {number} annualRate
 * @param {number} termYears
 * @param {number} monthlyTaxAndIns  - Fixed monthly tax + insurance portion
 * @returns {number} Maximum loan principal
 */
function maxAffordableLoan(maxMonthlyHousing, annualRate, termYears, monthlyTaxAndIns) {
  let lo = 0;
  let hi = 10_000_000;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const payment = calcMonthlyPI(mid, annualRate, termYears) + monthlyTaxAndIns;
    if (payment <= maxMonthlyHousing) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return lo;
}

// ── Core calculation ─────────────────────────────────────

function calculate() {
  const annualIncome  = parseFloat(fields.annualIncome.value)  || 0;
  const monthlyDebts  = parseFloat(fields.monthlyDebts.value)  || 0;
  const downPayment   = parseFloat(fields.downPayment.value)   || 0;
  const interestRate  = parseFloat(fields.interestRate.value)  || 0;
  const loanTerm      = parseInt(fields.loanTerm.value,  10)   || 30;
  const propTaxRate   = parseFloat(fields.propertyTax.value)   || 0;
  const annualIns     = parseFloat(fields.homeInsurance.value) || 0;

  if (annualIncome <= 0 || interestRate <= 0) {
    alert('Please enter your annual income and interest rate.');
    return;
  }

  const monthlyIncome = annualIncome / 12;

  // Lenders typically allow a max DTI of 43 % (total) and 28 % front-end.
  const MAX_TOTAL_DTI   = 0.43;
  const MAX_FRONT_DTI   = 0.28;

  const maxTotalMonthly  = monthlyIncome * MAX_TOTAL_DTI;
  const maxFrontMonthly  = monthlyIncome * MAX_FRONT_DTI;

  // Housing budget = min(front-end limit, total limit minus existing debts)
  const maxHousingByTotal = maxTotalMonthly - monthlyDebts;
  const maxHousing = Math.min(maxFrontMonthly, maxHousingByTotal);

  if (maxHousing <= 0) {
    showNote('bad', 'Your existing debt payments exceed standard lending limits. Consider paying down debts before applying for a mortgage.');
    resultsEl.hidden = false;
    clearResults();
    return;
  }

  // Monthly tax and insurance are a function of home price — estimate iteratively.
  // We start with down-payment-only home price, then refine once we know the loan.
  const monthlyIns = annualIns / 12;

  // Estimate: tax is proportional to home price; guess home price first without tax.
  // We solve: loan = maxAffordableLoan(maxHousing - monthlyTax - monthlyIns, ...)
  // where monthlyTax = propTaxRate/100 * homePrice / 12 and homePrice = loan + downPayment.
  // Iterative approach — converges in ~5 steps.
  let loan = maxAffordableLoan(maxHousing - monthlyIns, interestRate, loanTerm, 0);
  for (let i = 0; i < 10; i++) {
    const homePrice    = loan + downPayment;
    const monthlyTax   = (propTaxRate / 100 * homePrice) / 12;
    const fixedMonthly = monthlyTax + monthlyIns;
    loan = maxAffordableLoan(maxHousing - fixedMonthly, interestRate, loanTerm, 0);
  }

  const homePrice      = loan + downPayment;
  const monthlyTax     = (propTaxRate / 100 * homePrice) / 12;
  const piPayment      = calcMonthlyPI(loan, interestRate, loanTerm);
  const totalMonthly   = piPayment + monthlyTax + monthlyIns;
  const totalDTI       = (totalMonthly + monthlyDebts) / monthlyIncome;
  const frontEndDTI    = totalMonthly / monthlyIncome;

  // ── Render results ────────────────────────────────────
  out.maxHomePrice.textContent     = formatUSD(homePrice);
  out.maxLoan.textContent          = formatUSD(loan);
  out.monthlyPayment.textContent   = formatUSD(totalMonthly);
  out.piPayment.textContent        = formatUSD(piPayment);
  out.taxPayment.textContent       = formatUSD(monthlyTax);
  out.insurancePayment.textContent = formatUSD(monthlyIns);
  out.dtiRatio.textContent         = (totalDTI * 100).toFixed(1) + '%';

  // DTI bar (total bar = 43 % of income = 100 %)
  const barMax = MAX_TOTAL_DTI * monthlyIncome;
  const debtsPct   = Math.min((monthlyDebts / barMax) * 100, 100);
  const housingPct = Math.min((totalMonthly / barMax) * 100, 100 - debtsPct);
  out.dtiDebtsSegment.style.width   = debtsPct + '%';
  out.dtiHousingSegment.style.width = housingPct + '%';

  // Affordability note
  if (totalDTI <= 0.36 && frontEndDTI <= 0.28) {
    showNote('good', `Great shape! Your estimated total DTI is ${(totalDTI * 100).toFixed(1)}%, well within the preferred 36% threshold.`);
  } else if (totalDTI <= MAX_TOTAL_DTI) {
    showNote('warning', `Your estimated DTI of ${(totalDTI * 100).toFixed(1)}% is within the 43% limit but above the ideal 36%. You may still qualify, but consider a larger down payment or reducing existing debts.`);
  } else {
    showNote('bad', `Your estimated DTI of ${(totalDTI * 100).toFixed(1)}% exceeds the typical 43% maximum. You may need to increase your income, reduce debts, or choose a lower-priced home.`);
  }

  resultsEl.hidden = false;
}

function clearResults() {
  ['maxHomePrice', 'maxLoan', 'monthlyPayment', 'piPayment', 'taxPayment', 'insurancePayment', 'dtiRatio']
    .forEach(k => { out[k].textContent = '—'; });
  out.dtiDebtsSegment.style.width   = '0%';
  out.dtiHousingSegment.style.width = '0%';
}

function showNote(type, message) {
  noteEl.className = `affordability-note ${type}`;
  noteEl.textContent = message;
}

// ── Event listeners ───────────────────────────────────────
btn.addEventListener('click', calculate);

// Allow Enter key to trigger calculation from any input
Object.values(fields).forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') calculate(); });
});
