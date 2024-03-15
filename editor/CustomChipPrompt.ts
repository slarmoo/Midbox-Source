// Copyright (C) 2020 John Nesky, distributed under the MIT license.

import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";
import { Prompt } from "./Prompt";
import { SongDocument } from "./SongDocument";
import { ColorConfig } from "./ColorConfig";
import { ChangeCustomWave, randomRoundedWave, randomPulses, randomChip, biasedFullyRandom } from "./changes";
import { Config } from "./main";
import { SongEditor } from "./SongEditor";
import { Localization as _ } from "./Localization";
import { convertChipWaveToCustomChip} from "../synth/synth";
import { clamp } from "./UsefulCodingStuff";

const { button, div, h2, select, option } = HTML;

// Taken from changes.ts
interface ItemWeight<T> {
	readonly item: T;
	readonly weight: number;
}
function selectWeightedRandom<T>(entries: ReadonlyArray<ItemWeight<T>>): T {
	let total: number = 0;
	for (const entry of entries) {
		total += entry.weight;
	}
	let random: number = Math.random() * total;
	for (const entry of entries) {
		random -= entry.weight;
		if (random <= 0.0) return entry.item;
	}
	return entries[(Math.random() * entries.length) | 0].item;
}

const enum DrawMode {
	Standard,
	Line,
	Curve,
	Selection,
}

const enum CurveModeStep {
	// In this step, the first two points are determined for a quadratic
	// bezier curve. The third point is simply the midpoint between those
	// two, until determined explicitly.
	First,
	// In this step, the third point of a quadratic bezier is determined.
	Second,
}

function getCurveModeStepMessage(step: CurveModeStep): string {
    switch (step) {
        case CurveModeStep.First: return "Placing line...";
        case CurveModeStep.Second: return "Curving...";
    }
}

// Taken from SongEditor.ts
function buildHeaderedOptions(header: string, menu: HTMLSelectElement, items: ReadonlyArray<string | number>): HTMLSelectElement {
    menu.appendChild(option({ selected: true, disabled: true, value: header }, header));

    for (const item of items) {
        menu.appendChild(option({ value: item }, item));
    }
    return menu;
}

export class CustomChipPromptCanvas {
	private readonly _doc: SongDocument;
	public drawMode = DrawMode.Standard;
	public curveModeStep: CurveModeStep = CurveModeStep.First;
	private _mouseX: number = 0;
	private _mouseY: number = 0;
	private _lineX0: number = 0;
	private _lineY0: number = 0;
	private _lineX1: number = 0;
	private _lineY1: number = 0;
	private _curveX0: number = 0;
	private _curveY0: number = 0;
	private temporaryArray: Float32Array = new Float32Array(64);
	private _lastIndex: number = 0;
	private _lastAmp: number = 0;
	private _mouseDown: boolean = false;
	public chipData: Float32Array = new Float32Array(64);
	public startingChipData: Float32Array = new Float32Array(64);
	private _undoHistoryState: number = 0;
	private _changeQueue: Float32Array[] = [];
	private readonly _editorWidth: number = 768; // 64*12
	private readonly _editorHeight: number = 294; // 49*6
	private readonly _fill: SVGPathElement = SVG.path({ fill: ColorConfig.uiWidgetBackground, "pointer-events": "none" });
	private readonly _ticks: SVGSVGElement = SVG.svg({ "pointer-events": "none" });
	private readonly _subticks: SVGSVGElement = SVG.svg({ "pointer-events": "none" });
	private readonly _blocks: SVGSVGElement = SVG.svg({ "pointer-events": "none" });
	private readonly _svg: SVGSVGElement = SVG.svg({ style: `background-color: ${ColorConfig.editorBackground}; touch-action: none; overflow: visible;`, width: "100%", height: "100%", viewBox: "0 0 " + this._editorWidth + " " + this._editorHeight, preserveAspectRatio: "none" },
		this._fill,
		this._ticks,
		this._subticks,
		this._blocks,
	);

	public readonly container: HTMLElement = HTML.div({ class: "", style: "height: 294px; width: 768px; padding-bottom: 1.5em;" }, this._svg);

	constructor(doc: SongDocument, private _curveModeMessage: HTMLElement) {
		this._doc = doc;

		for (let i: number = 0; i <= 4; i += 2) {
			this._ticks.appendChild(SVG.rect({ fill: ColorConfig.tonic, x: (i * this._editorWidth / 4) - 1, y: 0, width: 2, height: this._editorHeight }));
		}
		for (let i: number = 1; i <= 8; i++) {
			this._subticks.appendChild(SVG.rect({ fill: ColorConfig.fifthNote, x: (i * this._editorWidth / 8) - 1, y: 0, width: 1, height: this._editorHeight }));
		}

		// Horiz. ticks
		this._ticks.appendChild(SVG.rect({ fill: ColorConfig.tonic, x: 0, y: (this._editorHeight / 2) - 1, width: this._editorWidth, height: 2 }));
		for (let i: number = 0; i < 3; i++) {
			this._subticks.appendChild(SVG.rect({ fill: ColorConfig.fifthNote, x: 0, y: i * 8 * (this._editorHeight / 49), width: this._editorWidth, height: 1 }));
			this._subticks.appendChild(SVG.rect({ fill: ColorConfig.fifthNote, x: 0, y: this._editorHeight - 1 - i * 8 * (this._editorHeight / 49), width: this._editorWidth, height: 1 }));
		}


		let col: string = ColorConfig.getChannelColor(this._doc.song, this._doc.channel).primaryNote;

		for (let i: number = 0; i < 64; i++) {
			let val: number = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].customChipWave[i];
			this.chipData[i] = val;
			this.startingChipData[i] = val;
			this._blocks.appendChild(SVG.rect({ fill: col, x: (i * this._editorWidth / 64), y: (val + 24) * (this._editorHeight / 49), width: this._editorWidth / 64, height: this._editorHeight / 49 }));
		}

		// Record initial state of the chip data queue
		this._storeChange();

		this.container.addEventListener("mousedown", this._whenMousePressed);
		document.addEventListener("mousemove", this._whenMouseMoved);
		document.addEventListener("mouseup", this._whenCursorReleased);

		this.container.addEventListener("touchstart", this._whenTouchPressed);
		this.container.addEventListener("touchmove", this._whenTouchMoved);
		this.container.addEventListener("touchend", this._whenCursorReleased);
		this.container.addEventListener("touchcancel", this._whenCursorReleased);

		this._svg.addEventListener("keydown", this._whenKeyPressed);
		this.container.addEventListener("keydown", this._whenKeyPressed);

		this._curveModeMessage.textContent = getCurveModeStepMessage(this.curveModeStep);
	}

	public _storeChange = (): void => {
		// Check if change is unique compared to the current history state
		var sameCheck = true;
		if (this._changeQueue.length > 0) {
			for (var i = 0; i < 64; i++) {
				if (this._changeQueue[this._undoHistoryState][i] != this.chipData[i]) {
					sameCheck = false; i = 64;
				}
			}
		}

		if (sameCheck == false || this._changeQueue.length == 0) {

			// Create new branch in history, removing all after this in time
			this._changeQueue.splice(0, this._undoHistoryState);

			this._undoHistoryState = 0;

			this._changeQueue.unshift(this.chipData.slice());

			// 32 undo max
			if (this._changeQueue.length > 32) {
				this._changeQueue.pop();
			}

		}

	}

	public undo = (): void => {
		// Go backward, if there is a change to go back to
		if (this._undoHistoryState < this._changeQueue.length - 1) {
			this._undoHistoryState++;
			this.chipData = this._changeQueue[this._undoHistoryState].slice();
			new ChangeCustomWave(this._doc, this.chipData);
			this.render();
		}

	}

	public redo = (): void => {
		// Go forward, if there is a change to go to
		if (this._undoHistoryState > 0) {
			this._undoHistoryState--;
			this.chipData = this._changeQueue[this._undoHistoryState].slice();
			new ChangeCustomWave(this._doc, this.chipData);
			this.render();
		}

	}

	private _whenKeyPressed = (event: KeyboardEvent): void => {
		if (event.keyCode == 90) { // z
			this.undo();
			event.stopPropagation();
		}
		else if (event.keyCode == 89) { // y
			this.redo();
			event.stopPropagation();
		}
	}

	private _whenMousePressed = (event: MouseEvent): void => {
		event.preventDefault();
		this._mouseDown = true;
		const boundingRect: ClientRect = this._svg.getBoundingClientRect();
		this._mouseX = ((event.clientX || event.pageX) - boundingRect.left) * this._editorWidth / (boundingRect.right - boundingRect.left);
		this._mouseY = ((event.clientY || event.pageY) - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
		if (isNaN(this._mouseX)) this._mouseX = 0;
		if (isNaN(this._mouseY)) this._mouseY = 0;
		this._lastIndex = -1;
		if (this.drawMode == DrawMode.Line) {
			this._lineX0 = this._mouseX;
			this._lineY0 = this._mouseY;
			this._lineX1 = this._mouseX;
			this._lineY1 = this._mouseY;
			for (let i = 0; i < 64; i++) this.temporaryArray[i] = this.chipData[i];
		} else if (this.drawMode == DrawMode.Curve && ((this._mouseX >= 0 && this._mouseX <= this._editorWidth) && (this._mouseY >= 0 && this._mouseY <= this._editorHeight))) {
			switch (this.curveModeStep) {
				case CurveModeStep.First: {
					this._lineX0 = this._mouseX;
					this._lineY0 = this._mouseY;
					this._lineX1 = this._mouseX;
					this._lineY1 = this._mouseY;
					// Set to the middle of the line.
					this._curveX0 = this._lineX0 + (this._lineX1 - this._lineX0) * 0.5;
					this._curveY0 = this._lineY0 + (this._lineY1 - this._lineY0) * 0.5;
					for (let i = 0; i < 64; i++) this.temporaryArray[i] = this.chipData[i];
				} break;
				case CurveModeStep.Second: {
					this._curveX0 = this._mouseX;
					this._curveY0 = this._mouseY;
				} break;
			}
		}

		this._whenCursorMoved();
	}

	private _whenTouchPressed = (event: TouchEvent): void => {
		event.preventDefault();
		this._mouseDown = true;
		const boundingRect: ClientRect = this._svg.getBoundingClientRect();
		this._mouseX = (event.touches[0].clientX - boundingRect.left) * this._editorWidth / (boundingRect.right - boundingRect.left);
		this._mouseY = (event.touches[0].clientY - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
		if (isNaN(this._mouseX)) this._mouseX = 0;
		if (isNaN(this._mouseY)) this._mouseY = 0;
		this._lastIndex = -1;
		if (this.drawMode == DrawMode.Line) {
			this._lineX0 = this._mouseX;
			this._lineY0 = this._mouseY;
			this._lineX1 = this._mouseX;
			this._lineY1 = this._mouseY;
			for (let i = 0; i < 64; i++) this.temporaryArray[i] = this.chipData[i];
		} else if (this.drawMode == DrawMode.Curve && ((this._mouseX >= 0 && this._mouseX <= this._editorWidth) && (this._mouseY >= 0 && this._mouseY <= this._editorHeight))) {
			switch (this.curveModeStep) {
				case CurveModeStep.First: {
					this._lineX0 = this._mouseX;
					this._lineY0 = this._mouseY;
					this._lineX1 = this._mouseX;
					this._lineY1 = this._mouseY;
					// Set to the middle of the line.
					this._curveX0 = this._lineX0 + (this._lineX1 - this._lineX0) * 0.5;
					this._curveY0 = this._lineY0 + (this._lineY1 - this._lineY0) * 0.5;
					for (let i = 0; i < 64; i++) this.temporaryArray[i] = this.chipData[i];
				} break;
				case CurveModeStep.Second: {
					this._curveX0 = this._mouseX;
					this._curveY0 = this._mouseY;
				} break;
			}
		}

		this._whenCursorMoved();
	}

	private _whenMouseMoved = (event: MouseEvent): void => {
		if (this.container.offsetParent == null) return;
		const boundingRect: ClientRect = this._svg.getBoundingClientRect();
		this._mouseX = ((event.clientX || event.pageX) - boundingRect.left) * this._editorWidth / (boundingRect.right - boundingRect.left);
		this._mouseY = ((event.clientY || event.pageY) - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
		if (isNaN(this._mouseX)) this._mouseX = 0;
		if (isNaN(this._mouseY)) this._mouseY = 0;
		if (this.drawMode == DrawMode.Line && this._mouseDown) {
			this._lineX1 = this._mouseX;
			this._lineY1 = this._mouseY;
		} else if (this.drawMode == DrawMode.Curve && ((this._mouseX >= 0 && this._mouseX <= this._editorWidth) && (this._mouseY >= 0 && this._mouseY <= this._editorHeight))) {
			switch (this.curveModeStep) {
				case CurveModeStep.First: {
					this._lineX1 = this._mouseX;
					this._lineY1 = this._mouseY;
					// Set to the middle of the line.
					this._curveX0 = this._lineX0 + (this._lineX1 - this._lineX0) * 0.5;
					this._curveY0 = this._lineY0 + (this._lineY1 - this._lineY0) * 0.5;
				} break;
				case CurveModeStep.Second: {
					this._curveX0 = this._mouseX;
					this._curveY0 = this._mouseY;
				} break;
			}
		}
		this._whenCursorMoved();
	}

	private _whenTouchMoved = (event: TouchEvent): void => {
		if (this.container.offsetParent == null) return;
		if (!this._mouseDown) return;
		event.preventDefault();
		const boundingRect: ClientRect = this._svg.getBoundingClientRect();
		this._mouseX = (event.touches[0].clientX - boundingRect.left) * this._editorWidth / (boundingRect.right - boundingRect.left);
		this._mouseY = (event.touches[0].clientY - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
		if (isNaN(this._mouseX)) this._mouseX = 0;
		if (isNaN(this._mouseY)) this._mouseY = 0;
		if (this.drawMode == DrawMode.Line && this._mouseDown) {
			this._lineX1 = this._mouseX;
			this._lineY1 = this._mouseY;
		} else if (this.drawMode == DrawMode.Curve && ((this._mouseX >= 0 && this._mouseX <= this._editorWidth) && (this._mouseY >= 0 && this._mouseY <= this._editorHeight))) {
			switch (this.curveModeStep) {
				case CurveModeStep.First: {
					this._lineX1 = this._mouseX;
					this._lineY1 = this._mouseY;
					// Set to the middle of the line.
					this._curveX0 = this._lineX0 + (this._lineX1 - this._lineX0) * 0.5;
					this._curveY0 = this._lineY0 + (this._lineY1 - this._lineY0) * 0.5;
				} break;
				case CurveModeStep.Second: {
					this._curveX0 = this._mouseX;
					this._curveY0 = this._mouseY;
				} break;
			}
		}
		this._whenCursorMoved();
	}

	private _whenCursorMoved(): void {
		if (this._mouseDown) {
			const index: number = Math.min(63, Math.max(0, Math.floor(this._mouseX * 64 / this._editorWidth)));
			const amp: number = Math.min(48, Math.max(0, Math.floor(this._mouseY * 49 / this._editorHeight)));

			// Paint between mouse drag indices unless a click just happened.
			if (this.drawMode == DrawMode.Standard) {
				if (this._lastIndex != -1 && this._lastIndex != index) {
					var lowest = index;
					var highest = this._lastIndex;
					var startingAmp = amp;
					var endingAmp = this._lastAmp;
					if (this._lastIndex < index) {
						lowest = this._lastIndex;
						highest = index;
						startingAmp = this._lastAmp;
						endingAmp = amp;
					}
					for (var i = lowest; i <= highest; i++) {
						const medAmp: number = Math.round(startingAmp + (endingAmp - startingAmp) * ((i - lowest) / (highest - lowest)));
						this.chipData[i] = medAmp - 24;
						this._blocks.children[i].setAttribute("y", "" + (medAmp * (this._editorHeight / 49)));
					}
				}
				else {
					this.chipData[index] = amp - 24;
					this._blocks.children[index].setAttribute("y", "" + (amp * (this._editorHeight / 49)));
				}
			} else if (this.drawMode == DrawMode.Line) {
				for (let i = 0; i < 64; i++) {
 					this.chipData[i] = this.temporaryArray[i];
					this._blocks.children[i].setAttribute("y", "" + ((this.temporaryArray[i] + 24) * (this._editorHeight / 49)));
				}
				let lowest: number = Math.min(63, Math.max(0, Math.floor(this._lineX0 * 64 / this._editorWidth)));
				let startingAmp: number = Math.min(48, Math.max(0, Math.floor(this._lineY0 * 49 / this._editorHeight)));
				let highest: number = Math.min(63, Math.max(0, Math.floor(this._lineX1 * 64 / this._editorWidth)));
				let endingAmp: number = Math.min(48, Math.max(0, Math.floor(this._lineY1 * 49 / this._editorHeight)));
				const temp1: number = lowest;
				const temp2: number = startingAmp;
				if (highest != lowest) {
					if (highest < lowest) {
						lowest = highest;
						highest = temp1;
						startingAmp = endingAmp;
						endingAmp = temp2;
					}
					for (var i = lowest; i <= highest; i++) {
						const medAmp: number = Math.round(startingAmp + (endingAmp - startingAmp) * ((i - lowest) / (highest - lowest)));
						this.chipData[i] = medAmp - 24;
						this._blocks.children[i].setAttribute("y", "" + (medAmp * (this._editorHeight / 49)));
					}
				}
				else {
					this.chipData[lowest] = startingAmp - 24;
					this._blocks.children[lowest].setAttribute("y", "" + (startingAmp * (this._editorHeight / 49)));
				}
			} else if (this.drawMode == DrawMode.Curve) {
				for (let i = 0; i < 64; i++) {
 					this.chipData[i] = this.temporaryArray[i];
					this._blocks.children[i].setAttribute("y", "" + ((this.temporaryArray[i] + 24) * (this._editorHeight / 49)));
				}

				const startX: number = this._lineX0;
				const startY: number = this._lineY0;
				const endX: number = this._lineX1;
				const endY: number = this._lineY1;
				const bX: number = this._curveX0;
				const bY: number = this._curveY0;
				const chipStartX: number = Math.min(63, Math.max(0, Math.floor(startX * 64 / this._editorWidth)));
				const chipStartY: number = Math.min(48, Math.max(0, Math.floor(startY * 49 / this._editorHeight)));
				const chipEndX: number = Math.min(63, Math.max(0, Math.floor(endX * 64 / this._editorWidth)));
				const chipEndY: number = Math.min(48, Math.max(0, Math.floor(endY * 49 / this._editorHeight)));
				const chipBX: number = Math.min(63, Math.max(0, Math.floor(bX * 64 / this._editorWidth)));
				const chipBY: number = Math.min(48, Math.max(0, Math.floor(bY * 49 / this._editorHeight)));

				// https://stackoverflow.com/a/66463100
				const d1tx: number = chipStartX - chipBX;
				const d1ty: number = chipStartY - chipBY;
				const d1t: number = Math.sqrt(d1tx * d1tx + d1ty * d1ty);
				const d2tx: number = chipEndX - chipBX;
				const d2ty: number = chipEndY - chipBY;
				const d2t: number = Math.sqrt(d2tx * d2tx + d2ty * d2ty);
				const sqrt: number = Math.sqrt(d1t * d2t);
				const d1tIsZero: boolean = Math.abs(d1t) < 1.0e-24;
				const d2tIsZero: boolean = Math.abs(d2t) < 1.0e-24;
				const p1ptdx: number = d1tIsZero ? 0 : ((chipStartX - chipBX) / d1t);
				const p1ptdy: number = d1tIsZero ? 0 : ((chipStartY - chipBY) / d1t);
				const p2ptdx: number = d2tIsZero ? 0 : ((chipEndX - chipBX) / d2t);
				const p2ptdy: number = d2tIsZero ? 0 : ((chipEndY - chipBY) / d2t);
				const aX: number = Math.max(Math.min(chipStartX, chipEndX), Math.min(Math.max(chipStartX, chipEndX), chipBX - 0.5 * sqrt * (p1ptdx + p2ptdx)));
				const aY: number = chipBY - 0.5 * sqrt * (p1ptdy + p2ptdy);

				let lowest: number = Math.min(chipStartX, chipEndX);
				let startingAmp: number = Math.min(chipStartY, chipEndY);
				let highest: number = Math.max(chipStartX, chipEndX);
				if (highest != lowest) {
					// @TODO: Should really be automatically determined, but that's even more code
					const steps: number = 100;
					for (var i = 0; i < steps; i++) {
						// https://pomax.github.io/bezierinfo/#whatis
						const lt: number = i / steps;

						const la0x: number = chipStartX;
						const la0y: number = chipStartY;
						const lb0x: number = aX;
						const lb0y: number = aY;
						const l0x: number = la0x + (lb0x - la0x) * lt;
						const l0y: number = la0y + (lb0y - la0y) * lt;

						const la1x: number = aX;
						const la1y: number = aY;
						const lb1x: number = chipEndX;
						const lb1y: number = chipEndY;
						const l1x: number = la1x + (lb1x - la1x) * lt;
						const l1y: number = la1y + (lb1y - la1y) * lt;

						const l2x: number = l0x + (l1x - l0x) * lt;
						const l2y: number = l0y + (l1y - l0y) * lt;

						const medIdx: number = Math.min(63, Math.max(0, Math.round(l2x)));
						const medAmp: number = Math.min(48, Math.max(0, Math.round(l2y)));
						this.chipData[medIdx] = medAmp - 24;
						this._blocks.children[medIdx].setAttribute("y", "" + (medAmp * (this._editorHeight / 49)));
					}
				}
				else {
					this.chipData[lowest] = startingAmp - 24;
					this._blocks.children[lowest].setAttribute("y", "" + (startingAmp * (this._editorHeight / 49)));
				}
			} else throw new Error("Unknown draw mode selected.");

			// Make a change to the data but don't record it, since this prompt uses its own undo/redo queue
			new ChangeCustomWave(this._doc, this.chipData);

			this._lastIndex = index;
			this._lastAmp = amp;
		}
	}

	public _whenCursorReleased = (event: Event): void => {
		if (this.drawMode == DrawMode.Curve && ((this._mouseX >= 0 && this._mouseX <= this._editorWidth) && (this._mouseY >= 0 && this._mouseY <= this._editorHeight))) {
			switch (this.curveModeStep) {
				case CurveModeStep.First: {
					this._mouseDown = false;
					this.curveModeStep = CurveModeStep.Second;
					this._curveModeMessage.textContent = getCurveModeStepMessage(this.curveModeStep);
					// Don't commit the changes yet.
					return;
				} break;
				case CurveModeStep.Second: {
					this.curveModeStep = CurveModeStep.First;
					this._curveModeMessage.textContent = getCurveModeStepMessage(this.curveModeStep);
					// We can commit the changes now.
				} break;
			}
		}
		// Add current data into queue, if it is unique from last data
		this._storeChange();
		this._mouseDown = false;
	}

	public render(): void {
		for (var i = 0; i < 64; i++) {
			this._blocks.children[i].setAttribute("y", "" + ((this.chipData[i] + 24) * (this._editorHeight / 49)));
		}
	}

	public shiftSamplesUp(): void {
		for (let i = 0; i < 64; i++) this.chipData[i] = Math.min(24, Math.max(-24, this.chipData[i] - 1));
  		new ChangeCustomWave(this._doc, this.chipData);
  		this._storeChange();
  		this.render();
	}

	public shiftSamplesDown(): void {
		for (let i = 0; i < 64; i++) this.chipData[i] = Math.min(24, Math.max(-24, this.chipData[i] + 1));
  		new ChangeCustomWave(this._doc, this.chipData);
  		this._storeChange();
  		this.render();
	}
}

export class CustomChipPrompt implements Prompt {

	private curveModeStepText: HTMLDivElement = div({style: "position: absolute; align-self: center; bottom: 57px; font-size: 15px;"}, "");

	public customChipCanvas: CustomChipPromptCanvas = new CustomChipPromptCanvas(this._doc, this.curveModeStepText);

	public readonly _playButton: HTMLButtonElement = button({ style: "width: 55%;", type: "button" });

	public readonly _drawType_Standard: HTMLButtonElement = button({ style: "border-radius: 0px; width: 65px; height 50px;", title: "Cursor"}, [
		// Cursor icon:
		SVG.svg({ class: "no-underline", style: "flex-shrink: 0; position: absolute; top: 4px; left: 24px; pointer-events: none;", width: "16", height: "16", viewBox: "0 0 16 16" }, [
			SVG.path({ d: "M 14.082 2.182 a 0.5 0.5 0 0 1 0.103 0.557 L 8.528 15.467 a 0.5 0.5 0 0 1 -0.917 -0.007 L 8 8 L 0.803 8.652 a 0.5 0.5 0 0 1 -0.006 -0.916 l 12.728 -5.657 a 0.5 0.5 0 0 1 0.556 0.103 M 3 12 L 2 15 L 5 14 L 7.944 8.996 L 8 8 L 7.005 8.091 z", fill: "currentColor" }),
		]),
	]);
	public readonly _drawType_Line: HTMLButtonElement = button({ style: "border-radius: 0px; width: 65px; height 50px;", title: "Line"}, [
		// Line icon:
		SVG.svg({ class: "no-underline", style: "flex-shrink: 0; position: absolute; top: 4px; left: 24px; pointer-events: none;", width: "16", height: "16", viewBox: "0 0 16 16" }, [
			SVG.path({ d: "M 14 2.5 a 12 12 0 0 0 -0.5 -0.5 h -6.967 a 0.5 0.5 0 0 0 0 1 h 5.483 L 2.146 13.146 a 0.5 0.5 0 0 0 0.708 0.708 L 13.009 3.991 V 9.504 a 0.5 0.5 0 0 0 1 0 z", fill: "currentColor" }),
		]),
	]);
	public readonly _drawType_Curve: HTMLButtonElement = button({ style: "border-radius: 0px; width: 65px; height 50px;", title: "Curve"}, [
		// Curved-line icon:
		SVG.svg({ class: "no-underline", style: "flex-shrink: 0; position: absolute; top: 4px; left: 24px; pointer-events: none;", width: "16", height: "16", viewBox: "0 0 16 16" }, [
			SVG.path({ d: "M0 10.5A1.5 1.5 0 0 1 1.5 9h1A1.5 1.5 0 0 1 4 10.5v1A1.5 1.5 0 0 1 2.5 13h-1A1.5 1.5 0 0 1 0 11.5zm1.5-.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5zm10.5.5A1.5 1.5 0 0 1 13.5 9h1a1.5 1.5 0 0 1 1.5 1.5v1a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5zm1.5-.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5zM6 4.5A1.5 1.5 0 0 1 7.5 3h1A1.5 1.5 0 0 1 10 4.5v1A1.5 1.5 0 0 1 8.5 7h-1A1.5 1.5 0 0 1 6 5.5zM7.5 4a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5z", fill: "currentColor" }),
			SVG.path({ d: "M6 4.5H1.866a1 1 0 1 0 0 1h2.668A6.52 6.52 0 0 0 1.814 9H2.5q.186 0 .358.043a5.52 5.52 0 0 1 3.185-3.185A1.5 1.5 0 0 1 6 5.5zm3.957 1.358A1.5 1.5 0 0 0 10 5.5v-1h4.134a1 1 0 1 1 0 1h-2.668a6.52 6.52 0 0 1 2.72 3.5H13.5q-.185 0-.358.043a5.52 5.52 0 0 0-3.185-3.185", fill: "currentColor"}),
		]),
	]);
	public readonly _drawType_Selection: HTMLButtonElement = button({ style: "border-radius: 0px; width: 65px; height 50px;", title: "Selection"}, [
		// Dotted-outline box icon:
		SVG.svg({ class: "no-underline", style: "flex-shrink: 0; position: absolute; top: 4px; left: 24px; pointer-events: none;", width: "16", height: "16", viewBox: "0 0 16 16" }, [
			SVG.path({ d: "M 2.5 0 q -0.25 0 -0.487 0.048 l 0.194 0.98 A 1.5 1.5 0 0 1 2.5 1 h 0.458 V 0 z m 2.292 0 h -0.917 v 1 h 0.917 z m 1.833 0 h -0.917 v 1 h 0.917 z m 1.833 0 h -0.916 v 1 h 0.916 z m 1.834 0 h -0.917 v 1 h 0.917 z m 1.833 0 h -0.917 v 1 h 0.917 z M 13.5 0 h -0.458 v 1 h 0.458 q 0.151 0 0.293 0.029 l 0.194 -0.981 A 2.5 2.5 0 0 0 13.5 0 m 2.079 1.11 a 2.5 2.5 0 0 0 -0.69 -0.689 l -0.556 0.831 q 0.248 0.167 0.415 0.415 l 0.83 -0.556 z M 1.11 0.421 a 2.5 2.5 0 0 0 -0.689 0.69 l 0.831 0.556 c 0.11 -0.164 0.251 -0.305 0.415 -0.415 z M 16 2.5 q 0 -0.25 -0.048 -0.487 l -0.98 0.194 q 0.027 0.141 0.028 0.293 v 0.458 h 1 z M 0.048 2.013 A 2.5 2.5 0 0 0 0 2.5 v 0.458 h 1 V 2.5 q 0 -0.151 0.029 -0.293 z M 0 3.875 v 0.917 h 1 v -0.917 z m 16 0.917 v -0.917 h -1 v 0.917 z M 0 5.708 v 0.917 h 1 v -0.917 z m 16 0.917 v -0.917 h -1 v 0.917 z M 0 7.542 v 0.916 h 1 v -0.916 z m 15 0.916 h 1 v -0.916 h -1 z M 0 9.375 v 0.917 h 1 v -0.917 z m 16 0.917 v -0.917 h -1 v 0.917 z m -16 0.916 v 0.917 h 1 v -0.917 z m 16 0.917 v -0.917 h -1 v 0.917 z m -16 0.917 v 0.458 q 0 0.25 0.048 0.487 l 0.98 -0.194 A 1.5 1.5 0 0 1 1 13.5 v -0.458 z m 16 0.458 v -0.458 h -1 v 0.458 q 0 0.151 -0.029 0.293 l 0.981 0.194 Q 16 13.75 16 13.5 M 0.421 14.89 c 0.183 0.272 0.417 0.506 0.69 0.689 l 0.556 -0.831 a 1.5 1.5 0 0 1 -0.415 -0.415 z m 14.469 0.689 c 0.272 -0.183 0.506 -0.417 0.689 -0.69 l -0.831 -0.556 c -0.11 0.164 -0.251 0.305 -0.415 0.415 l 0.556 0.83 z m -12.877 0.373 Q 2.25 16 2.5 16 h 0.458 v -1 H 2.5 q -0.151 0 -0.293 -0.029 z M 13.5 16 q 0.25 0 0.487 -0.048 l -0.194 -0.98 A 1.5 1.5 0 0 1 13.5 15 h -0.458 v 1 z m -9.625 0 h 0.917 v -1 h -0.917 z m 1.833 0 h 0.917 v -1 h -0.917 z m 1.834 -1 v 1 h 0.916 v -1 z m 1.833 1 h 0.917 v -1 h -0.917 z m 1.833 0 h 0.917 v -1 h -0.917 z", fill: "currentColor" }),
		]),
	]);
	private readonly drawToolsContainer: HTMLDivElement = div({ class: "instrument-bar", style: "margin-left: -3px; display: grid; grid-template-columns: repeat(4, 70px); grid-gap: 2px 0px; width: 270px;" }, this._drawType_Standard, this._drawType_Line, this._drawType_Curve, this._drawType_Selection);

	private readonly _cancelButton: HTMLButtonElement = button({ class: "cancelButton" });
	private readonly _okayButton: HTMLButtonElement = button({ class: "okayButton", style: "width:45%; font-size: 15px;" }, _.confirmLabel);

	private readonly copyButton: HTMLButtonElement = button({ style: "width:86px; margin-right: 5px; text-align: center;", class: "copyButton" }, [
		_.copyLabel,
		// Copy icon:
		SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;", width: "2em", height: "2em", viewBox: "-5 -21 26 26" }, [
			SVG.path({ d: "M 0 -15 L 1 -15 L 1 0 L 13 0 L 13 1 L 0 1 L 0 -15 z M 2 -1 L 2 -17 L 10 -17 L 14 -13 L 14 -1 z M 3 -2 L 13 -2 L 13 -12 L 9 -12 L 9 -16 L 3 -16 z", fill: "currentColor" }),
		]),
	]);
	private readonly pasteButton: HTMLButtonElement = button({ style: "width:86px; text-align: center;", class: "pasteButton" }, [
		_.pasteLabel,
		// Paste icon:
		SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;", width: "2em", height: "2em", viewBox: "0 0 26 26" }, [
			SVG.path({ d: "M 8 18 L 6 18 L 6 5 L 17 5 L 17 7 M 9 8 L 16 8 L 20 12 L 20 22 L 9 22 z", stroke: "currentColor", fill: "none" }),
			SVG.path({ d: "M 9 3 L 14 3 L 14 6 L 9 6 L 9 3 z M 16 8 L 20 12 L 16 12 L 16 8 z", fill: "currentColor", }),
		]),
	]);
	private readonly copyPasteContainer: HTMLDivElement = div({ style: "width: 185px;" }, this.copyButton, this.pasteButton);

	private readonly loadWaveformPresetSelect: HTMLSelectElement = buildHeaderedOptions(
		_.loadPresetLabel, 
		/* List icon:
		SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 4px; margin-top: 0.05em; pointer-events: none;", width: "16", height: "16", viewBox: "0 0 16 16"}, [
			SVG.path({ d: "M12 13c0 1.105-1.12 2-2.5 2S7 14.105 7 13s1.12-2 2.5-2 2.5.895 2.5 2", fill: "currentColor"}),
			SVG.path({ d: "M12 3v10h-1V3z", fill: "currentColor"}),
			SVG.path({ d: "M11 2.82a1 1 0 0 1 .804-.98l3-.6A1 1 0 0 1 16 2.22V4l-5 1z", fill: "currentColor"}),
			SVG.path({ d: "M0 11.5a.5.5 0 0 1 .5-.5H4a.5.5 0 0 1 0 1H.5a.5.5 0 0 1-.5-.5m0-4A.5.5 0 0 1 .5 7H8a.5.5 0 0 1 0 1H.5a.5.5 0 0 1-.5-.5m0-4A.5.5 0 0 1 .5 3H8a.5.5 0 0 1 0 1H.5a.5.5 0 0 1-.5-.5", fill: "currentColor"}),
		]), */
		select({ style: "font-size: 15px; position: absolute; align-self: left; left: 20px; bottom: 54px; text-align: center; width: 30%; text-align-last: center;" }),
		Config.chipWaves.map(wave => wave.name));

	private readonly randomizeButton: HTMLButtonElement = button({ style: "font-size: 15px; position: absolute; align-self: right; right: 20px; bottom: 54px; text-align: center; width: 30%; text-align-last: center;" }, [
		_.random2Label,
		// Dice icon:
		SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 4px; margin-top: 0.05em; pointer-events: none;", width: "16", height: "16", viewBox: "0 0 16 16"}, [
			SVG.path({ d: "M13 1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2zM3 0a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V3a3 3 0 0 0-3-3z", fill: "currentColor"}),
			SVG.path({ d: "M5.5 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m8 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0 8a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m-8 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0", fill: "currentColor"}),
		]),
	]);

	public readonly container: HTMLDivElement = div({ class: "prompt noSelection", style: "width: 600px;" },
		h2("Edit Custom Chip Instrument"),
		div({ style: "display: flex; width: 55%; align-self: center; flex-direction: row; align-items: center; justify-content: center;" },
			this._playButton,
		),
		div({ style: "margin-top: 12px; margin-bottom: 3px; align-self: center; display: flex; flex-direction: row; align-items: center; justify-content: center;" },
			this.drawToolsContainer,
		),
		div({ style: "margin-top: 2px; display: flex; flex-direction: row; align-items: center; justify-content: center;" },
			this.customChipCanvas.container,
		),
		this.curveModeStepText,
		this.loadWaveformPresetSelect,
		this.randomizeButton,
		div({ style: "display: flex; flex-direction: row-reverse; justify-content: space-between;" },
			this._okayButton,
			this.copyPasteContainer,
		),
		this._cancelButton,
	);

	constructor(private _doc: SongDocument, private _songEditor: SongEditor) {
		this._okayButton.addEventListener("click", this._saveChanges);
		this._cancelButton.addEventListener("click", this._close);
		this.container.addEventListener("keydown", this.whenKeyPressed);
		this.copyButton.addEventListener("click", this._copySettings);
		this.pasteButton.addEventListener("click", this._pasteSettings);
		this.loadWaveformPresetSelect.addEventListener("change", this._customWavePresetHandler);
		this.randomizeButton.addEventListener("click", this._randomizeCustomChip);
		this._playButton.addEventListener("click", this._togglePlay);
		this.updatePlayButton();
		this._drawType_Standard.addEventListener("click", this._selectStandardDrawType);
		this._drawType_Line.addEventListener("click", this._selectLineDrawType);
		this._drawType_Curve.addEventListener("click", this._selectCurveDrawType);
		this._drawType_Selection.addEventListener("click", this._selectSelectionDrawType);
		this.curveModeStepText.style.display = "none";

		let colors = ColorConfig.getChannelColor(this._doc.song, this._doc.channel);
		this.drawToolsContainer.style.setProperty("--text-color-lit", colors.primaryNote);
		this.drawToolsContainer.style.setProperty("--text-color-dim", colors.secondaryNote);
		this.drawToolsContainer.style.setProperty("--background-color-lit", colors.primaryChannel);
		this.drawToolsContainer.style.setProperty("--background-color-dim", colors.secondaryChannel);
		this._drawType_Standard.classList.add("selected-instrument");

		setTimeout(() => this._playButton.focus());

		this.customChipCanvas.render();
	}

	private _togglePlay = (): void => {
		this._songEditor.togglePlay();
		this.updatePlayButton();
	}

	public updatePlayButton(): void {
		if (this._doc.synth.playing) {
			this._playButton.classList.remove("playButton");
			this._playButton.classList.add("pauseButton");
			this._playButton.title = _.pauseSpaceLabel;
			this._playButton.innerText = _.pauseLabel;
		} else {
			this._playButton.classList.remove("pauseButton");
			this._playButton.classList.add("playButton");
			this._playButton.title = _.playSpaceLabel;
			this._playButton.innerText = _.playLabel;
		}
	}

	private _selectStandardDrawType = (): void => {
		this._drawType_Standard.classList.add("selected-instrument");
		this._drawType_Line.classList.remove("selected-instrument");
		this._drawType_Curve.classList.remove("selected-instrument");
		this._drawType_Selection.classList.remove("selected-instrument");
		this.customChipCanvas.drawMode = DrawMode.Standard;
		this.curveModeStepText.style.display = "none";
	}

	private _selectLineDrawType = (): void => {
		this._drawType_Standard.classList.remove("selected-instrument");
		this._drawType_Line.classList.add("selected-instrument");
		this._drawType_Curve.classList.remove("selected-instrument");
		this._drawType_Selection.classList.remove("selected-instrument");
		this.customChipCanvas.drawMode = DrawMode.Line;
		this.curveModeStepText.style.display = "none";
	}

	private _selectCurveDrawType = (): void => {
		this._drawType_Standard.classList.remove("selected-instrument");
		this._drawType_Line.classList.remove("selected-instrument");
		this._drawType_Curve.classList.add("selected-instrument");
		this._drawType_Selection.classList.remove("selected-instrument");
		this.customChipCanvas.drawMode = DrawMode.Curve;
		this.customChipCanvas.curveModeStep = CurveModeStep.First;
		this.curveModeStepText.style.display = "";
		this.curveModeStepText.textContent = getCurveModeStepMessage(this.customChipCanvas.curveModeStep);
	}

	private _selectSelectionDrawType = (): void => {
		this._drawType_Standard.classList.remove("selected-instrument");
		this._drawType_Line.classList.remove("selected-instrument");
		this._drawType_Curve.classList.remove("selected-instrument");
		this._drawType_Selection.classList.add("selected-instrument");
		this.customChipCanvas.drawMode = DrawMode.Selection;
		this.curveModeStepText.style.display = "none";
	}

	private _close = (): void => {
		this._doc.prompt = null;
		this._doc.undo();
	}

	public cleanUp = (): void => {
		this._okayButton.removeEventListener("click", this._saveChanges);
		this._cancelButton.removeEventListener("click", this._close);
		this.container.removeEventListener("keydown", this.whenKeyPressed);

		this._playButton.removeEventListener("click", this._togglePlay);
	}

	private _copySettings = (): void => {
		const chipCopy: Float32Array = this.customChipCanvas.chipData;
		window.localStorage.setItem("chipCopy", JSON.stringify(Array.from(chipCopy)));
	}

	private _pasteSettings = (): void => {
		const storedChipWave: any = JSON.parse(String(window.localStorage.getItem("chipCopy")));
		for (let i: number = 0; i < 64; i++) {
    	this.customChipCanvas.chipData[i] = storedChipWave[i];
		}
		this.customChipCanvas._storeChange();
		new ChangeCustomWave(this._doc, this.customChipCanvas.chipData);
    }

	// Taken from SongEditor.ts
	private _customWavePresetHandler = (event: Event): void => {
        // Update custom wave value
        let customWaveArray: Float32Array = new Float32Array(64);
        let index: number = this.loadWaveformPresetSelect.selectedIndex - 1;
        let maxValue: number = Number.MIN_VALUE;
        let minValue: number = Number.MAX_VALUE;
        let arrayPoint: number = 0;
        let arrayStep: number = (Config.chipWaves[index].samples.length - 1) / 64.0;

        for (let i: number = 0; i < 64; i++) {
            // Compute derivative to get original wave.
            customWaveArray[i] = (Config.chipWaves[index].samples[Math.floor(arrayPoint)] - Config.chipWaves[index].samples[(Math.floor(arrayPoint) + 1)]) / arrayStep;
            if (customWaveArray[i] < minValue)
                minValue = customWaveArray[i];
            if (customWaveArray[i] > maxValue)
                maxValue = customWaveArray[i];
            // Scale an any-size array to 64 elements
            arrayPoint += arrayStep;
        }

        for (let i: number = 0; i < 64; i++) {
            // Change array range from Min~Max to 0~(Max-Min)
            customWaveArray[i] -= minValue;
            // Divide by (Max-Min) to get a range of 0~1,
            customWaveArray[i] /= (maxValue - minValue);
            //then multiply by 48 to get 0~48,
            customWaveArray[i] *= 48.0;
            //then subtract 24 to get - 24~24
            customWaveArray[i] -= 24.0;
            //need to force integers
            customWaveArray[i] = Math.ceil(customWaveArray[i]);
            // Copy back data to canvas
            this.customChipCanvas.chipData[i] = customWaveArray[i];
        }

		this.customChipCanvas._storeChange();
        new ChangeCustomWave(this._doc, customWaveArray);
        this.loadWaveformPresetSelect.selectedIndex = 0;
    }

	// Taken from changes.ts
	private _randomizeCustomChip = (): void => {
		let randomGeneratedArray: Float32Array = new Float32Array(64);
        if (this._doc.prefs.customChipGenerationType == "customChipGenerateFully") {
            for (let i: number = 0; i < 64; i++) {
                randomGeneratedArray[i] = clamp(-24, 24+1, ((Math.random() * 48) | 0) - 24);
            }
        } 
        else if (this._doc.prefs.customChipGenerationType == "customChipGeneratePreset") {
            let index = ((Math.random() * Config.chipWaves.length) | 0);
            let waveformPreset = Config.chipWaves[index].samples;
            randomGeneratedArray = convertChipWaveToCustomChip(waveformPreset)[0];
    	}
		// We'll put the "none" type here as it seems more intuitive if "none" only worked on fully randomized custom chips, not just its waveform.
        else if (this._doc.prefs.customChipGenerationType == "customChipGenerateAlgorithm" || this._doc.prefs.customChipGenerationType == "customChipGenerateNone") {
            const algorithmFunction: (wave: Float32Array) => void = selectWeightedRandom([
                { item: randomRoundedWave, weight: 1},
                { item: randomPulses, weight: 1},
                { item: randomChip, weight: 1},
                { item: biasedFullyRandom, weight: 1},
            ]);
            algorithmFunction(randomGeneratedArray);
        }

        this.customChipCanvas.chipData = randomGeneratedArray;

		this.customChipCanvas._storeChange();
        new ChangeCustomWave(this._doc, randomGeneratedArray);
	}

	public whenKeyPressed = (event: KeyboardEvent): void => {
		if ((<Element>event.target).tagName != "BUTTON" && event.keyCode == 13) { // Enter key
			this._saveChanges();
		}
		else if (event.keyCode == 32) {
			this._togglePlay();
			event.preventDefault();
		}
		else if (event.keyCode == 90) { // z
			this.customChipCanvas.undo();
			event.stopPropagation();
		}
		else if (event.keyCode == 89) { // y
			this.customChipCanvas.redo();
			event.stopPropagation();
		}
		else if (event.keyCode == 219) { // [
			this._doc.synth.goToPrevBar();
		}
		else if (event.keyCode == 221) { // ]
			this._doc.synth.goToNextBar();
		}
		else if (
			event.keyCode == 187 // +
			|| event.keyCode == 61 // Firefox +
			|| event.keyCode == 171 // Some users may have this as +
		){
		  	this.customChipCanvas.shiftSamplesUp();
		  	event.stopPropagation();
		}
		else if (
			event.keyCode == 189 // -
			|| event.keyCode == 173 // Firefox -
		){
		  	this.customChipCanvas.shiftSamplesDown();
		  	event.stopPropagation();
		}
		else if (event.keyCode == 82 ) { // r
		  	this._randomizeCustomChip();
		  	event.stopPropagation();
		}
		else if (event.keyCode == 67 ) { // c
			this._copySettings();
			event.stopPropagation();
	  	}
		  else if (event.keyCode == 86 ) { // v
			this._pasteSettings();
			event.stopPropagation();
	  	}
	}

	private _saveChanges = (): void => {
		this._doc.prompt = null;
		// Restore custom chip to starting values
		new ChangeCustomWave(this._doc, this.customChipCanvas.startingChipData);
		this._doc.record(new ChangeCustomWave(this._doc, this.customChipCanvas.chipData), true);
	}
}