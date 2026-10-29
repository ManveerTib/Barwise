# Barwise

Barwise is a practice app for Singapore Math bar models at the Primary 5 level. Students solve word problems in small steps. Each correct step adds to a bar model that is drawn on screen as they go. Every attempt feeds a student model that estimates mastery for each skill, spots common error patterns, and suggests what to practice next, including matching S.A.M 2nd Edition Level 5 worksheets.

## What it does

- **Eight problem templates**, one for each Primary 5 bar-model heuristic: part–whole, comparison, multiple units, fraction of a quantity, fraction of a remainder, percentage, rate (the unitary method) and before-and-after transfers. Each template generates fresh numbers that divide evenly.
- **Animated, step-by-step models.** Bars grow, split into units, get bracketed and move between rows (in transfers) as each step is answered.
- **Error-pattern detection.** Every wrong answer choice, and every wrong number a known mistake would produce, is tagged with one of 15 error patterns. For example, a student who divides before removing the extra gets a specific message, and that pattern is counted.
- **Mastery estimates** using Bayesian Knowledge Tracing (BKT), with Khan-style levels: Attempted, Familiar, Proficient, Mastered.
- **Recommendations** that respect skill prerequisites and list matching S.A.M worksheet codes.
- **Model builder.** Type the numbers from any worksheet problem and play its model step by step.
- **Teacher area, locked by passcode**: a class mastery heatmap, class-wide error patterns, per-student tips, a form to log graded paper worksheets, a CSV report, a JSON backup, and the S.A.M worksheet list with file links.

## Who sees what

- Anyone with the link can practice as a guest. Nothing is saved.
- Student records and the S.A.M worksheet list are stored with access rules that let only the page owner and invited editors read them.
- The worksheet list and its links are also encrypted in the browser with the teacher passcode (PBKDF2-SHA256, 310,000 rounds, then AES-256-GCM) before they are saved. The passcode itself is never stored. See `src/store/vault.js`.
- No worksheet titles ship in the app code. On first setup a teacher pastes the worksheet table from the portal, or a one-time copy is folded into the vault and deleted.

## Design

The visual direction is a squared exercise book: plain paper, one ink, one action blue, and red kept for marking. Models are drawn on squared paper with handwritten labels and working, and answers are marked with a red tick or a red ring the way a tutor marks a page. The type is Schibsted Grotesk for reading and Shantell Sans for handwriting. Both are self-hosted and inlined into the build.

## Run it

```bash
npm install
npm run dev      # local development server
npm run verify   # checks 6,400 generated problems (see below)
npm run build    # one self-contained file at dist/index.html
```

`node scripts/to-artifact.mjs` converts the build into the body-only page format used to publish it as a claude.ai artifact.

## How the code is organized

| Path | What it holds |
| --- | --- |
| `src/engine/templates/*.js` | One file per problem type: number generation, validation, the steps, and the drawing for each stage of the solution |
| `src/engine/misconceptions.js` | The error-pattern list and the classifier for typed answers |
| `src/engine/model.js` | BKT mastery updates, levels, error-pattern ranking, recommendations |
| `src/components/BarModel.jsx` | The SVG renderer. Layout comes from every stage of a problem, so nothing shifts between steps |
| `src/components/useStepper.js` | The step-by-step solving logic: check, hints, “Show me”, recording |
| `src/components/Practice.jsx` | The practice screen and results |
| `src/components/Home.jsx` | The home page, with the live problem in the hero |
| `src/components/Teacher.jsx` | Teacher setup, sign-in and dashboard |
| `src/store/vault.js` | Passcode encryption for the worksheet list and links |
| `src/data/catalog.js` | Parses the worksheet list and maps worksheets to skills |
| `src/store/store.js` | Saving: the artifact's shared database when published, localStorage otherwise |
| `scripts/verify.mjs` | Automated checks on every template |

### Adding a problem type

Copy a template in `src/engine/templates/`, then register it in `src/engine/skills.js`. A template exports `generate(rng)`, `validate(params)`, `fields` (for the model builder) and `build(params, rng)`. `build` returns `{ text, answer, answerText, steps, scene(k) }`, where `scene(k)` is the drawing after `k` steps. Run `npm run verify` afterward.

### The mastery model

For each skill, P(L) is the probability that the student has learned it. After the first attempt at each step:

```
right:  P(L|obs) = P(L)(1−S) / [P(L)(1−S) + (1−P(L))G]
wrong:  P(L|obs) = P(L)S / [P(L)S + (1−P(L))(1−G)]
then:   P(L) = P(L|obs) + (1 − P(L|obs))T
```

The parameters are S = 0.12 (slip), G = 1/options for multiple choice or 0.3 for typed answers (guess), T = 0.04 (learning) and P(L₀) = 0.1. Using a hint before answering counts as a wrong first attempt.

### What `npm run verify` checks

For 800 random problems per template, it checks that:

- each multiple-choice step has exactly one correct option and every distractor is tagged with an error pattern
- typed answers are positive with at most two decimals, and no predicted wrong answer equals the right one
- the last step's answer matches the problem's answer
- every bracket in every drawing points at real bars

## Worksheets and licensing

This project contains no S.A.M material. The S.A.M worksheets are licensed to the center. Do not commit worksheet files or the worksheet list to a public repository. The list and links live only in the encrypted teacher vault.

### Linking or downloading many worksheets at once

You can avoid clicking "View File" 159 times. Open the worksheet list page while signed in, open the browser console (F12, Console tab), and run:

```js
// Collect each worksheet name and its "View File" link from the table.
const rows = [...document.querySelectorAll('tr')].map((tr) => {
  const cells = [...tr.querySelectorAll('td')];
  const link = [...tr.querySelectorAll('a[href]')].find((a) => /view file/i.test(a.textContent));
  return cells.length >= 6 && link ? [cells[5].textContent.trim(), link.href] : null;
}).filter(Boolean);
copy(rows.map((r) => r.join('\t')).join('\n')); // Chrome/Edge console helper: copies to clipboard
console.log(rows.length + ' worksheet links copied');
```

Paste the result into **Teacher → S.A.M Level 5 worksheets → Paste many links** to link every worksheet at once.

To also download the files, run this afterward in the same console. The browser will ask once to allow multiple downloads.

```js
for (const [, url] of rows) {
  window.open(url, '_blank');
  await new Promise((r) => setTimeout(r, 1500));
}
```

If "View File" is a button with no link behind it, the script finds nothing. In that case, ask the center whether the files can be shared as one folder, or use a bulk-download browser extension such as DownThemAll. Check with the center before downloading the whole library.

## Privacy

Use first names or initials for students. Barwise is an independent practice tool built for SAM Singapore Math tutoring. It is not made or endorsed by SAM.
