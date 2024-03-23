// This file is for exporting functions and what not that may be of good use.

// Modulo
// Having this function around means I won't need to learn the convertion of standard mod(x, y) to (x % y + y) % y.
export function mod(a: number, b: number): number {
    return (a % b + b) % b;
}

// Sigma
// That sideways M used in math that makes interesting staircase-like stuff.
export function sigma(a: number, b: (i: number) => number, c: number): number {
    let result = 0;
    for (let i = c; i <= a; i++) {
        result += b(i);
    }
/*
    The variables here look like this:
    A
    Σ  (i) => B
    C
*/
    return result;
}

// Clamp
// A combination of Math.mix and Math.max.
export function clamp(min: number, max: number, val: number): number {
    max = max - 1;
    if (val <= max) {
        if (val >= min) return val;
        else return min;
    } else {
        return max;
    }
}

// 
// 