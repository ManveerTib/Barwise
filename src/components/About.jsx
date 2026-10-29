import React from 'react';
import { MISCONCEPTIONS } from '../engine/misconceptions.js';
import { SKILLS } from '../engine/skills.js';
import { BKT } from '../engine/model.js';
import { useReveal } from './ui.jsx';

export default function About() {
  useReveal();
  const pats = Object.entries(MISCONCEPTIONS).filter(([k]) => k !== 'other');
  return (
    <article className="wrap essay">
      <header>
        <h1>How Barwise works</h1>
        <p>Singapore Math teaches word problems in three moves: act the story out, draw it as bars, then write the number sentence. Barwise is for the drawing. Each right answer adds the next part of the model, so the picture and the arithmetic arrive together.</p>
      </header>

      <section className="part rise" aria-labelledby="a1">
        <h2 id="a1">The problems</h2>
        <div className="body">
          <p>There are {SKILLS.length} kinds of problem, one for each bar-model method in the Primary 5 course: part-whole, comparison, multiple units, fraction of a quantity, fraction of a remainder, percentage, rate, and before-and-after transfers.</p>
          <p>Every problem gets new numbers that divide evenly, so practice is about the method rather than long division. The model builder takes the numbers from any worksheet problem of the same kind and draws its model.</p>
          <p>A test script solves 800 random problems of each kind and checks that each multiple-choice step has exactly one right option, every answer is a whole number or cents, the last step matches the story, and every bracket in the drawing points at a real bar.</p>
        </div>
      </section>

      <section className="part rise" aria-labelledby="a2">
        <h2 id="a2">Reading a wrong answer</h2>
        <div className="body">
          <p>Most wrong answers come from a specific slip. A student who divides 1,215 by 2 before taking away the extra 245 types exactly 607.5. Each step lists the wrong answers that common slips produce, so a typed answer can be matched to the slip behind it. An answer close to the right one counts as a calculation slip. Barwise knows {pats.length} patterns:</p>
          <ul>{pats.map(([k, m]) => <li key={k}><b>{m.name}.</b> {m.tutor}</li>)}</ul>
        </div>
      </section>

      <section className="part rise" aria-labelledby="a3">
        <h2 id="a3">Estimating mastery</h2>
        <div className="body">
          <p>Mastery uses Bayesian Knowledge Tracing, a model from tutoring research. For each skill it keeps one number, P(L), the chance the student has learned it, and updates it after the first try at every step:</p>
          <div className="formula" role="group" aria-label="Formulas">
            <div>Right: <code>P(L | right) = P(L)(1 - S) / [P(L)(1 - S) + (1 - P(L))G]</code></div>
            <div>Wrong: <code>P(L | wrong) = P(L)S / [P(L)S + (1 - P(L))(1 - G)]</code></div>
            <div>Then: <code>P(L) = P(L | answer) + (1 - P(L | answer))T</code></div>
          </div>
          <p>S is the chance of a slip ({BKT.slip}). G is the chance of a lucky guess: 1 divided by the number of options for multiple choice, and {BKT.guessTyped} for typed answers, because earlier steps make later ones easier. T is the chance of learning from one step ({BKT.learn}), and every skill starts at {BKT.init}. Using a hint before answering counts as a wrong first try. Familiar starts at 45%, Proficient at 80% after at least 4 steps, and Mastered at 95% after at least 12.</p>
        </div>
      </section>

      <section className="part rise" aria-labelledby="a4">
        <h2 id="a4">Who sees what</h2>
        <div className="body">
          <p>Anyone with the link can practice as a guest, and nothing is saved. Student records, the worksheet list and worksheet links are for teachers only. They are stored so that only the page owner and invited editors can read them, and the worksheet list and links are also encrypted with the teacher passcode in the browser before they are saved.</p>
          <p>Use first names or initials for students. The teacher area exports a CSV report and a full backup.</p>
        </div>
      </section>
    </article>
  );
}
