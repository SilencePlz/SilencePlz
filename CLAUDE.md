# CLAUDE.md

This file provides guidance for AI assistants working on the SilencePlz codebase.

## Project Overview

**SilencePlz** is a static, single-page **Mortgage Affordability Calculator** web application. It takes financial inputs (income, savings, debts, loan parameters) and instantly renders calculated results: a cash flow waterfall, 15yr vs 30yr loan comparison, affordability matrix, and amortization snapshot.

No backend, no build step, no dependencies — runs directly in any modern browser.

## Repository Structure

```
SilencePlz/
├── index.html          # App markup and layout (248 lines)
├── css/
│   └── styles.css      # All styling (511 lines)
└── js/
    └── calculator.js   # Calculation engine + DOM updates (266 lines)
```

## Architecture

### Data Flow

1. User changes any input → `input` event fires
2. `updateAll()` is called
3. `getVals()` reads all DOM inputs into a plain object
4. Pure calculation functions (`cashFlow()`, `monthlyPI()`, etc.) compute results
5. Render functions (`renderKPIs()`, `renderWaterfall()`, etc.) write results back to DOM

This is an **immediate-mode** pattern: every keystroke triggers a full recalculation. No state management library, no virtual DOM.

### Key Functions in `js/calculator.js`

| Function | Purpose |
|---|---|
| `monthlyPI(price, down, annualRate, termYears)` | Monthly principal + interest payment |
| `pitiBreakdown(price, down, annualRate, termYears, v)` | Full PITI cost breakdown |
| `yearAmort(price, down, annualRate, termYears, year)` | Principal/interest split for a given year |
| `cashFlow(v)` | Disposable income after taxes, retirement, expenses, debts |
| `getVals()` | Reads all inputs from the DOM, returns a plain object |
| `updateAll()` | Master orchestrator: getVals → calculate → render |
| `renderKPIs(v, cf)` | Updates the 4-tile KPI bar at the top |
| `renderWaterfall(v, cf)` | Updates the cash flow waterfall card |
| `renderComparison(v, cf)` | Updates the 15yr vs 30yr side-by-side card |
| `renderMatrix(v, cf)` | Renders the price × down-payment affordability table |
| `renderAmortization(v)` | Renders the year-by-year amortization bar chart |

### Hardcoded Constants

- **Price range (matrix):** $350k–$800k
- **Down payment options (matrix):** 5%, 10%, 20%
- **PMI rate:** 0.5% annually (applied when down < 20%)
- **Closing cost estimate:** $8,500

## Development Workflow

### Running Locally

Open `index.html` directly in a browser — no server, build tool, or install step needed:

```bash
# Any of these work:
open index.html
xdg-open index.html
python3 -m http.server 8080   # then visit http://localhost:8080
```

### Making Changes

- **Logic changes** → edit `js/calculator.js`
- **Layout/markup changes** → edit `index.html`
- **Styling changes** → edit `css/styles.css`

There is no transpilation, bundling, or minification pipeline. Changes are reflected immediately on browser reload.

### Testing

There is no automated test suite. Verify correctness manually:

1. Open `index.html` in a browser
2. Adjust inputs and confirm KPIs, waterfall, comparison, matrix, and amortization update correctly
3. Check edge cases: 0% down payment, very high or low interest rates, 15yr vs 30yr toggle

## Code Conventions

### JavaScript

- `'use strict';` is declared at the top of `calculator.js`
- ES6+ syntax: `const`/`let`, arrow functions, template literals
- Functions are pure where possible (take inputs, return values — no side effects)
- Render functions are impure by design (they mutate the DOM)
- Short variable names are acceptable inside tight calculation functions (`r`, `n`, `b`)
- Descriptive names required for function parameters and exported/top-level identifiers

### CSS

- Dark theme using CSS custom properties defined on `:root`
- Color tokens: `--violet` (#8b5cf6), `--green` (#10b981), `--red` (#ef4444), `--amber` (#f59e0b)
- Typography: `Inter` for UI text, `JetBrains Mono` for numeric data
- BEM-adjacent class naming: `.comp-card`, `.amort-row`, `.kpi-bar`
- Responsive breakpoints: `900px` (two-column → single-column) and `480px` (mobile)

### HTML

- Semantic HTML5 elements where appropriate
- Input IDs match the property names used in `getVals()` — keep them in sync
- Avoid inline styles; use CSS classes

## Key Constraints

1. **No dependencies** — do not introduce npm, CDN libraries (beyond existing Google Fonts), or build tools unless there is a compelling reason discussed first.
2. **No backend** — all logic must run client-side.
3. **No breaking the immediate-mode pattern** — every input change must trigger `updateAll()` synchronously.
4. **Financial formula accuracy** — the amortization formula in `monthlyPI()` is standard; do not simplify it.
5. **Preserve responsive breakpoints** — the layout must remain usable at 480px width.

## Git Workflow

- The `master` branch holds stable releases.
- Feature/fix branches follow the pattern `claude/<description>-<id>`.
- Commit messages use the imperative mood and are concise (`feat: add PMI toggle`, `fix: matrix overflow on mobile`).
- Push with: `git push -u origin <branch-name>`
