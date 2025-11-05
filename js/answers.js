// answers.js - Answer generation logic
// Version: 14 (Fixed & Optimized)

const Answers = (() => {
  /**
   * Generate typical carry/borrow mistake
   */
  function typicalCarryMistake(task) {
    if (task.op === "+") {
      const u = (task.a % 10) + (task.b % 10);
      const t = Math.floor(task.a / 10) + Math.floor(task.b / 10);
      return t * 10 + (u % 10);
    } else {
      const u1 = task.a % 10;
      const u2 = task.b % 10;
      const t1 = Math.floor(task.a / 10);
      const t2 = Math.floor(task.b / 10);
      let u = u1 - u2;
      if (u < 0) u = Math.abs(u);
      return (t1 - t2) * 10 + u;
    }
  }

  /**
   * Generate answer options with better distribution
   * - One option close to correct (±1-2)
   * - Other options more random
   */
  function makeOptions(task, mode) {
    if (mode === "input") return null;
    
    const k = Number(mode) || 2;
    const right = task.answer;
    
    if (typeof right !== 'number') return null;
    
    const set = new Set([right]);
    
    // Add one close wrong answer (±1 or ±2)
    const closeDeltas = [1, -1, 2, -2];
    const closeDelta = closeDeltas[Math.floor(Math.random() * closeDeltas.length)];
    const closeWrong = right + closeDelta;
    if (closeWrong >= 0 && closeWrong !== right) {
      set.add(closeWrong);
    }
    
    // Add typical mistake with 60% probability for 3-option mode
    if (k === 3 && Math.random() < 0.6) {
      const mistake = typicalCarryMistake(task);
      if (mistake !== right && mistake >= 0) {
        set.add(mistake);
      }
    }
    
    // Fill remaining slots with more random answers
    const randomRanges = [
      { min: -10, max: -3 },
      { min: 3, max: 10 },
      { min: 10, max: 20 },
      { min: -20, max: -10 }
    ];
    
    let attempts = 0;
    while (set.size < k && attempts < 50) {
      attempts++;
      
      // Pick random range
      const range = randomRanges[Math.floor(Math.random() * randomRanges.length)];
      const delta = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
      const wrongAnswer = right + delta;
      
      if (wrongAnswer >= 0 && wrongAnswer !== right) {
        set.add(wrongAnswer);
      }
    }
    
    // Final fallback: use simple deltas if still not enough
    if (set.size < k) {
      const fallbackDeltas = [3, -3, 5, -5, 7, -7, 4, -4];
      for (const d of fallbackDeltas) {
        if (set.size >= k) break;
        const wrongAnswer = right + d;
        if (wrongAnswer >= 0) {
          set.add(wrongAnswer);
        }
      }
    }
    
    // Convert to array of option objects
    const arr = Array.from(set).slice(0, k).map(v => ({ 
      value: v, 
      correct: v === right 
    }));
    
    // Shuffle options
    return shuffle(arr);
  }

  /**
   * Shuffle array in place
   */
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  return { 
    makeOptions,
    typicalCarryMistake
  };
})();