// generator.js - Task generation logic
// Version: 14 (Fixed & Optimized)

const Generator = (() => {
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const makeAdd = (a, b) => ({ a, b, op: "+", answer: a + b });
  const makeSub = (a, b) => ({ a, b, op: "−", answer: a - b });
  
  let zeroTaskCount = 0; // Track tasks with zero
  let totalTaskCount = 0; // Track total tasks

  /**
   * Check if we should allow zero in this task
   */
  function canUseZero() {
    // Reset counter every 10 tasks
    if (totalTaskCount % 10 === 0) {
      zeroTaskCount = 0;
    }
    // Allow zero only once per 10 tasks, with 20% probability
    return zeroTaskCount === 0 && Math.random() < 0.2;
  }

  /**
   * Level 1: Easy (≤10)
   * - Addition: result ≤ 10
   * - Subtraction: result ≥ 0
   * - Minimize zero usage
   */
  function genEasy() {
    totalTaskCount++;
    const allowZero = canUseZero();
    
    if (Math.random() < 0.5) {
      // Addition
      let x, y;
      if (allowZero && Math.random() < 0.3) {
        x = Math.random() < 0.5 ? 0 : randInt(1, 10);
        y = x === 0 ? randInt(1, 10) : randInt(0, 10 - x);
        if (x === 0 || y === 0) zeroTaskCount++;
      } else {
        x = randInt(1, 10);
        y = randInt(1, 10 - x);
      }
      return makeAdd(x, y);
    } else {
      // Subtraction
      let x, y;
      if (allowZero && Math.random() < 0.3) {
        x = randInt(1, 10);
        y = Math.random() < 0.5 ? 0 : randInt(0, x);
        if (y === 0) zeroTaskCount++;
      } else {
        x = randInt(2, 10);
        y = randInt(1, x);
      }
      return makeSub(x, y);
    }
  }

  /**
   * Level 2: Medium (≤100 without carry/borrow)
   * - Minimize zero usage
   */
  function genMediumNoCarry() {
    totalTaskCount++;
    const allowZero = canUseZero();
    let attempts = 0;
    const maxAttempts = 100;
    
    while (attempts < maxAttempts) {
      attempts++;
      const add = Math.random() < 0.5;
      
      if (add) {
        // Addition without carry
        let a = allowZero && Math.random() < 0.2 ? 0 : randInt(1, 100);
        let b = allowZero && a !== 0 && Math.random() < 0.2 ? 0 : randInt(1, 100);
        
        if ((a === 0 || b === 0) && !allowZero) continue;
        
        const ones = (a % 10) + (b % 10);
        const sum = a + b;
        
        if (ones <= 10 && sum <= 100 && sum > 0) {
          if (a === 0 || b === 0) zeroTaskCount++;
          return makeAdd(a, b);
        }
      } else {
        // Subtraction without borrow
        let a = randInt(1, 100);
        let b = allowZero && Math.random() < 0.2 ? 0 : randInt(1, 100);
        
        if (b === 0 && !allowZero) continue;
        
        if (a < b) {
          const temp = a;
          a = b;
          b = temp;
        }
        
        if ((a % 10) >= (b % 10) && a - b > 0) {
          if (b === 0) zeroTaskCount++;
          return makeSub(a, b);
        }
      }
    }
    
    // Fallback
    return makeAdd(5, 3);
  }

  /**
   * Level 3: Advanced (≤100 with carry/borrow)
   * - Minimize zero usage
   */
  function genAdvancedWithCarry() {
    totalTaskCount++;
    const allowZero = canUseZero();
    
    if (Math.random() < 0.5) {
      // Addition WITH carry
      let u1 = allowZero && Math.random() < 0.15 ? 0 : randInt(1, 9);
      let u2 = randInt(10 - u1, 9);
      let t1 = randInt(0, 9);
      let t2 = randInt(0, 9 - t1);
      
      let a = t1 * 10 + u1;
      let b = t2 * 10 + u2;
      
      if (a === 0 || b === 0) {
        if (!allowZero) {
          a = Math.max(a, 1);
          b = Math.max(b, 1);
        } else {
          zeroTaskCount++;
        }
      }
      
      if (a + b > 100) {
        t2 = randInt(0, Math.max(0, 9 - t1 - 1));
        b = t2 * 10 + u2;
      }
      
      return makeAdd(a, b);
    } else {
      // Subtraction WITH borrow
      let u1 = randInt(0, 8);
      let u2 = randInt(u1 + 1, 9);
      let t1 = randInt(1, 9);
      let t2 = allowZero && Math.random() < 0.15 ? 0 : randInt(0, t1);
      
      let a = t1 * 10 + u1;
      let b = t2 * 10 + u2;
      
      if (b === 0 && !allowZero) {
        b = randInt(1, 9);
      } else if (b === 0) {
        zeroTaskCount++;
      }
      
      if (a <= b || (a % 10) >= (b % 10)) {
        if (a <= b) {
          const temp = a;
          a = b;
          b = temp;
        }
        if ((a % 10) >= (b % 10)) {
          a = Math.floor(a / 10) * 10 + Math.min(a % 10, (b % 10) - 1);
          if (a < 0) a = 0;
        }
      }
      
      if (a < b) {
        const temp = a;
        a = b;
        b = temp;
      }
      
      return makeSub(a, b);
    }
  }

  /**
   * Main generator function
   */
  function generateTask(level) {
    switch (level) {
      case "easy":
        return genEasy();
      case "medium":
        return genMediumNoCarry();
      case "advanced":
        return genAdvancedWithCarry();
      default:
        return genEasy();
    }
  }

  return { 
    generateTask, 
    genEasy, 
    genMediumNoCarry, 
    genAdvancedWithCarry 
  };
})();