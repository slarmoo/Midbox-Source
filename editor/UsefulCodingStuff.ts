// This file is for exporting functions and what not that may be of good use.

// Modulo
// Having this function around means I won't need to learn the convertion of standard mod(x, y) to (x % y + y) % y.
export function mod(a: number, b: number): number {
    return (a % b + b) % b;
}

// Sigma
// Used in math to make staircase-like stuff.
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

// Linear interpolate.
export function lerp(a: number, b: number, c: number) {
    return a + (b - a) * c;
}

// Normalize
export function norm(a: number, b: number, c: number) {
    return (c - a) / (b - a);
}

// Remap
export function remap(x: number, a: number, b: number, c: number, d: number) {
    return lerp(c, d, norm(a, b, x));
}

/* Basic Prompt Implementation, for easily getting started on prompts.

// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { Prompt } from "./Prompt";
import { SongDocument } from "./SongDocument";
import { Localization as _ } from "./Localization";

const { button, div, h2 } = HTML;

export class ExamplePrompt implements Prompt {
    private readonly _cancelButton: HTMLButtonElement = button({ class: "cancelButton" });
	private readonly _okayButton: HTMLButtonElement = button({ class: "okayButton", style: "width: 32%; font-size: 15px;" }, _.confirmLabel);

    public readonly container: HTMLDivElement = div({ class: "prompt noSelection", style: "width: 500px;" },
		h2("Hello world!"),
		div({ style: "display: flex; flex-direction: row-reverse; justify-content: space-between;" },
			this._okayButton,
		),
		this._cancelButton,
    );

    constructor(private _doc: SongDocument) {
        this._okayButton.addEventListener("click", this._saveChanges);
		this._cancelButton.addEventListener("click", this._close);
    }

    private _close = (): void => { 
		this._doc.undo();
	}
		
	public cleanUp = (): void => { 
		this._okayButton.removeEventListener("click", this._saveChanges);
		this._cancelButton.removeEventListener("click", this._close);
	}
		
	private _saveChanges = (): void => {
		this._doc.prompt = null;
	}
}

*/