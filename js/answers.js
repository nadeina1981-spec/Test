// answers.js - Answer generation logic
// Version: 15 (Easy-level MC options improved)

const Answers = (() => {
  // Detect "easy" task (≤10)
  function isEasyTask(task) {
    const within0to10 = (n) => Number.isInteger(n) && n >= 0 && n <= 10;
    return within0to10(task.a) && within0to10(task.b) && within0to10(task.answer);
  }

  // Typical carry/borrow slip for >10 tasks (kept for medium/advanced)
  function typicalCarryMistake(task) {
    if (task.op === "+") {
      const u = (task.a % 10) + (task.b % 10);
      const t = Math.floor(task.a / 10) + Math.floor(task.b / 10);
      // mistake: ignore carry from units
      return t * 10 + (u % 10);
    } else {
      // For subtraction: forget to borrow
      const u1 = task.a % 10;
      const u2 = task.b % 10;
      const t1 = Math.floor(task.a / 10);
      const t2 = Math.floor(task.b / 10);
      const u = (u1 - u2);
      // if negative, they "clip" instead of borrowing
      const units = ((u % 10) + 10) % 10;
      return Math.max(0, (t1 - t2) * 10 + units);
    }
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Helper to test if a 3-number set is a consecutive triple
  function isConsecutiveTriple(a, b, c) {
    const s = [a, b, c].sort((x, y) => x - y);
    return s[0] + 1 === s[1] && s[1] + 1 === s[2];
  }

  function makeEasyOptions(task, mode) {
    const need = Number(mode) || 2;
    const correct = task.answer;
    const poolMin = 0, poolMax = 10;

    // Start with the correct answer
    const opts = new Set([correct]);

    // 1) First distractor: prefer ±1 if possible (to train close discrimination)
    let d1;
    const neighbors = [];
    if (correct > poolMin) neighbors.push(correct - 1);
    if (correct < poolMax) neighbors.push(correct + 1);
    if (neighbors.length) {
      d1 = neighbors[Math.floor(Math.random() * neighbors.length)];
    } else {
      // Only happens if correct is out of bounds, but we guard anyway
      do { d1 = Math.floor(Math.random() * (poolMax - poolMin + 1)) + poolMin; } while (d1 === correct);
    }
    opts.add(d1);

    // 2) Second distractor: any other from 0..10 that
    //    - isn't correct or d1
    //    - does NOT create a 3-number consecutive run with (correct, d1)
    if (need >= 3) {
      let d2, attempts = 0;
      do {
        d2 = Math.floor(Math.random() * (poolMax - poolMin + 1)) + poolMin;
        attempts++;
        if (attempts > 50) {
          // Fallback: pick something far if possible
          const far = correct <= 5 ? Math.min(poolMax, correct + 3) : Math.max(poolMin, correct - 3);
          d2 = far;
        }
      } while (d2 === correct || d2 === d1 || isConsecutiveTriple(correct, d1, d2));
      opts.add(d2);
    }

    return shuffle(Array.from(opts));
  }

  function makeGeneralOptions(task, mode) {
    const need = Number(mode) || 2;
    const correct = task.answer;
    const out = new Set([correct]);

    // First distractor: typical mistake if plausible
    let d1 = typicalCarryMistake(task);
    if (d1 === correct || !Number.isFinite(d1)) {
      d1 = correct + (Math.random() < 0.5 ? -1 : 1);
    }
    out.add(Math.max(0, d1));

    // Additional distractors: around the answer but distinct
    while (out.size < need) {
      const deltaPool = [-2, -1, 1, 2, 3, -3, 5, -5];
      const delta = deltaPool[Math.floor(Math.random() * deltaPool.length)];
      let cand = correct + delta;
      if (cand < 0) cand = Math.abs(cand);
      out.add(cand);
    }

    return shuffle(Array.from(out));
  }

  function makeOptions(task, mode) {
    if (isEasyTask(task)) {
      return makeEasyOptions(task, mode);
    }
    return makeGeneralOptions(task, mode);
  }

  return {
    makeOptions,
    typicalCarryMistake
  };
})();
