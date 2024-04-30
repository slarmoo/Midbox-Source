// Copyright (C) 2020 John Nesky, distributed under the MIT license.

import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";
import { Prompt } from "./Prompt";
import { SongDocument } from "./SongDocument";
import { ColorConfig } from "./ColorConfig";
import { ChangeCustomWave, randomRoundedWave, randomPulses, randomChip, biasedFullyRandom, randomizeWave } from "./changes";
import { Config } from "../synth/SynthConfig";
import { SongEditor } from "./SongEditor";
import { Localization as _ } from "./Localization";
import { convertChipWaveToCustomChip } from "../synth/synth";

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

const enum SelectionModeStep {
	// Initial state.
	NoSelection,
	// Pressed (-> moved) -> released chain of events, where the selection
	// start and end are determined. If no moved event happens, a selection
	// is still made, with a length of 1.
	MakingSelection,
	// Selection start and end have been determined. This can now go to a
	// few different states:
	// - A moved event that happens after a pressed event with a click
	//   inside the selection goes to the MovingFloatingSelection state.
	//   This implicitly creates a "floating selection" out of the current
	//   selection, but only if any (less than or greater than 0)
	//   horizontal movement happened, and no floating selection exists
	//   already.
	// - A pressed event with a click outside the selection goes to the
	//   MakingSelection state. The determined selection can be empty in
	//   this case, where this goes to the NoSelection state if it is
	//   empty during a released event.
	//   If a floating selection exists, this implicitly "confirms" the
	//   selection, i.e., commits the changes made with this tool.
	//   (@TODO: the above may need to change?)
	// - A pressed event with a click on the line made by the start of the
	//   selection goes to the MovingSelectionStart state.
	//   If a floating selection exists, this implicitly "confirms" the
	//   selection, i.e., commits the changes made with this tool.
	//   (@TODO: the above may need to change?)
	// - A pressed event with a click on the line made by the end of the
	//   selection goes to the MovingSelectionEnd state.
	//   If a floating selection exists, this implicitly "confirms" the
	//   selection, i.e., commits the changes made with this tool.
	//   (@TODO: the above may need to change?)
	// - A pressed event with a click on the line made by the start of the
	//   selection goes to the StretchingFromStart state, if the stretching
	//   toggle is on.
	//   This implicitly creates a "floating selection" out of the current
	//   selection, but only if any (less than or greater than 0)
	//   horizontal movement happened, and no floating selection exists
	//   already.
	// - A pressed event with a click on the line made by the end of the
	//   selection goes to the StretchingFromEnd state, if the stretching
	//   toggle is on.
	//   This implicitly creates a "floating selection" out of the current
	//   selection, but only if any (less than or greater than 0)
	//   horizontal movement happened, and no floating selection exists
	//   already.
	// This state should also be entered after pasting something (with the
	// selection tool on, of course).
	HasSelection,
	// In this state, the left side of the selection is being dragged.
	// After release, this goes to the HasSelection state, but only if the
	// selection start is less than the selection end. If the selection
	// start is greater than or equal to the selection end, this goes to
	// the NoSelection state.
	MovingSelectionStart,
	// In this state, the right side of the selection is being dragged.
	// After release, this goes to the HasSelection state, but only if the
	// selection end is greater than the selection start. If the selection
	// end is less than or equal to the selection start, this goes to
	// the NoSelection state.
	MovingSelectionEnd,
	// After release, this goes to the HasSelection state.
	MovingFloatingSelection,
	// In this state, the left side of the floating selection is being
	// stretched.
	// After release, this goes to the HasSelection state, but only if the
	// selection start is less than the selection end. If the selection
	// start is greater than or equal to the selection end, this goes to
	// the NoSelection state.
	StretchingFromStart,
	// In this state, the right side of the floating selection is being
	// stretched.
	// After release, this goes to the HasSelection state, but only if the
	// selection end is greater than the selection start. If the selection
	// end is less than or equal to the selection start, this goes to
	// the NoSelection state.
	StretchingFromEnd,
}

interface SelectionBounds {
	// Index of the first selected value in the chip wave.
	start: number;
	// One past the index of the last selected value in the chip wave.
	// For example, if only the first value is supposed to be selected,
	// then start is 0, and end is 1.
	end: number;
}

// Inspired by some image editors, the selection tool can operate on a slice of
// the chip wave that temporarily stays on top of the existing data, only
// overwriting (or "stamping") it when that's desired.
interface FloatingSelection {
	// Can be larger or smaller than the chip wave. The excess will be
	// dropped when stamping it, of course.
	data: Float32Array;

	// Index of the first value in the chip wave to stamp data on top of.
	// The stretching done when stamping this is derived from these bounds,
	// if they happen to be larger or smaller than the size of data.
	destinationStart: number;
	// One past the index of the last value in the chip wave to stamp data
	// on top of.
	destinationEnd: number;

	// Vertical position used when stamping the floating selection onto the
	// chip wave.
	amplitudeOffset: number;
}

const enum SelectionDragEvent {
	// In this state, dragging on the edges of the selection will extend/retract the 
	// selection, not changing the items inside but increasing/decreasing the range of 
	// what is applied to the area.
	Extending,
	// In this state, dragging on the edges of the selection will stretch/squish the 
	// selection, changing the items inside of the selection to fit in its new bounds.
	Stretching,
}

function createFloatingSelectionFromBounds(wave: Float32Array, bounds: SelectionBounds): FloatingSelection {
	const selectionStart: number = bounds.start;
	const selectionEnd: number = bounds.end;
	if (selectionEnd < selectionStart) {
		throw new Error("Selection end comes before start");
	} else if (selectionEnd == selectionStart) {
		throw new Error("Selection is empty");
	}
	const selectionLength: number = selectionEnd - selectionStart;

	const data: Float32Array = new Float32Array(selectionLength);
	const destinationStart: number = selectionStart;
	const destinationEnd: number = selectionEnd;
	const amplitudeOffset: number = 0;
	for (let i: number = selectionStart; i < selectionEnd; i++) {
		data[i - selectionStart] = wave[i];
	}

	return { data, destinationStart, destinationEnd, amplitudeOffset };
}

function stampFloatingSelectionOntoChipWave(
	wave: Float32Array,
	// @TODO: I'm not sure what to do with these parameters. They're here
	// because the code wants to work with "tentative" values for these
	// sometimes, and other times not. It's silly to have them and also
	// track these in FloatingSelection...
	floatingSelectionData: Float32Array,
	destinationStart: number,
	destinationEnd: number,
	amplitudeOffset: number
): void {
	const start: number = destinationStart;
	const end: number = destinationEnd;
	if (end < start) {
		throw new Error("Destination end comes before start");
	} else if (end == start) {
		// Destination range is empty.
		return;
	}
	for (let i: number = start; i < end; i++) {
		if (i < 0 || i >= wave.length) {
			// Outside of the chip wave.
			continue;
		}
		const dataIndex: number = Math.min(floatingSelectionData.length - 1, Math.max(0, Math.floor(floatingSelectionData.length * ((i - start) / (end - start)))));
		const dataValue: number = floatingSelectionData[dataIndex] + amplitudeOffset;
		wave[i] = Math.min(24, Math.max(-24, dataValue));
	}
}

/*this.customChipCanvas._storeChange();
new ChangeCustomWave(this._doc, randomGeneratedArray);
this.customChipCanvas.curveModeStep = CurveModeStep.First;
this.curveModeStepText.textContent = getCurveModeStepMessage(this.customChipCanvas.curveModeStep);*/

function flipChipWaveHorizontally(wave: Float32Array, startIndex: number, onePastTheEndIndex: number): void {
	const length: number = onePastTheEndIndex - startIndex;
	const halfLength: number = Math.floor(length / 2);
	for (let i: number = 0; i < halfLength; i++) {
		const indexA: number = startIndex + i;
		const indexB: number = startIndex + ((length - 1) - i);
		const a: number = wave[indexA];
		const b: number = wave[indexB];
		wave[indexA] = b;
		wave[indexB] = a;
	}
}

function flipChipWaveVertically(wave: Float32Array, aroundZero: boolean, startIndex: number, onePastTheEndIndex: number): void {
	let middle: number = 0;
	if (!aroundZero) {
		let min: number = Infinity;
		let max: number = -Infinity;
		for (let i: number = startIndex; i < onePastTheEndIndex; i++) {
			const val: number = wave[i];
			min = Math.min(min, val);
			max = Math.max(max, val);
		}
		middle = (min + max) / 2;
	}
	for (let i: number = startIndex; i < onePastTheEndIndex; i++) {
		wave[i] = Math.min(24, Math.max(-24, Math.floor(-wave[i] + middle * 2)));
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

	// How many pixels to symmetrically increase the area around a
	// selection edge by, so you can drag it around with ease.
	private readonly _selectionEdgeMargin: number = 4;

	public selectionModeStep: SelectionModeStep = SelectionModeStep.NoSelection;
	public _selectionBounds: SelectionBounds | null = null;
	private _lockSelectionHorizontally: boolean = false;
	// "Tentative" here is another word for "temporary". This is so that we
	// can, while dragging, remember the values for things at the point
	// when we started dragging, and can recompute new temporary values by
	// taking the initial values and "displacing" them, either based on the
	// line drawn by the starting and ending mouse positions of the dragging
	// action, or when e.g. changing the selection bounds, just the
	// current mouse position.
	private _tentativeSelectionBounds: SelectionBounds | null = null;
	private _tentativeDestinationStart: number | null = null;
	private _tentativeDestinationEnd: number | null = null;
	private _tentativeAmplitudeOffset: number | null = null;
	private _floatingSelection: FloatingSelection | null = null;
	private _floatingSelectionDragStartX: number | null = null;
	private _floatingSelectionDragStartY: number | null = null;
	public selectionDragEvent: SelectionDragEvent = SelectionDragEvent.Extending;

	// @TODO: The way this is used is a bit error-prone I think. The logic
	// for how to use this should be at least noted somewhere in here.
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
	private readonly _selectionBox: SVGRectElement = SVG.rect({ class: "dashed-line dash-move", fill: ColorConfig.boxSelectionFill, stroke: ColorConfig.hoverPreview, "stroke-width": 2, "stroke-dasharray": "5, 3", "fill-opacity": "0.4", "pointer-events": "none", visibility: "hidden" });
	private readonly _selectionBoxOverlay: SVGPathElement = SVG.path({ fill: "none", stroke: ColorConfig.hoverPreview, "stroke-width": "2", "pointer-events": "none" });
	private readonly _svg: SVGSVGElement = SVG.svg({ style: `background-color: ${ColorConfig.editorBackground}; touch-action: none; overflow: visible;`, width: "100%", height: "100%", viewBox: "0 0 " + this._editorWidth + " " + this._editorHeight, preserveAspectRatio: "none" },
		this._fill,
		this._ticks,
		this._subticks,
		this._blocks,
		this._selectionBox,
		this._selectionBoxOverlay,
	);

	public readonly container: HTMLElement = HTML.div({ class: "", style: "height: 294px; width: 768px; padding-bottom: 1.5em;" }, this._svg);

	constructor(doc: SongDocument, private _curveModeMessage: HTMLElement, private _removeSelectionButton: HTMLElement) {
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
		this._removeSelectionButton.style.display = "none";
	}

	public cleanUp(): void {
		this.container.removeEventListener("mousedown", this._whenMousePressed);
		document.removeEventListener("mousemove", this._whenMouseMoved);
		document.removeEventListener("mouseup", this._whenCursorReleased);
		this.container.removeEventListener("touchstart", this._whenTouchPressed);
		this.container.removeEventListener("touchmove", this._whenTouchMoved);
		this.container.removeEventListener("touchend", this._whenCursorReleased);
		this.container.removeEventListener("touchcancel", this._whenCursorReleased);
		this._svg.removeEventListener("keydown", this._whenKeyPressed);
		this.container.removeEventListener("keydown", this._whenKeyPressed);
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
		this.clearSelection();

		// Go backward, if there is a change to go back to
		if (this._undoHistoryState < this._changeQueue.length - 1) {
			this._undoHistoryState++;
			this.chipData = this._changeQueue[this._undoHistoryState].slice();
			new ChangeCustomWave(this._doc, this.chipData);
			this.render();
		}

	}

	public redo = (): void => {
		this.clearSelection();

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

	public copy(): void {
		let storedData: number[] = Array.from(this.chipData);
		let storedDestinationStart: number = 0;
		let storedDestinationEnd: number = this.chipData.length;
		let storedAmplitudeOffset: number = 0;
		if (this.drawMode == DrawMode.Selection && this.selectionModeStep == SelectionModeStep.HasSelection) {
			const bounds: SelectionBounds = this._selectionBounds!;
			if (this._floatingSelection == null) {
				for (let i = 0; i < 64; i++) this.temporaryArray[i] = this.chipData[i];
				this._floatingSelection = createFloatingSelectionFromBounds(this.chipData, bounds);
			}
			storedData = Array.from(this._floatingSelection.data);
			storedDestinationStart = this._floatingSelection.destinationStart;
			storedDestinationEnd = this._floatingSelection.destinationEnd;
			storedAmplitudeOffset = this._floatingSelection.amplitudeOffset;
		}
		window.localStorage.setItem("chipCopy", JSON.stringify({
			copiedData: storedData,
			destinationStart: storedDestinationStart,
			destinationEnd: storedDestinationEnd,
			amplitudeOffset: storedAmplitudeOffset,
		}));
		this.clearSelection();
	}

	public paste(): void {
		const storedChipWaveData: any = JSON.parse(String(window.localStorage.getItem("chipCopy")));
		// Assume array format, with no destination info.
		let storedRawData: number[] = storedChipWaveData;
		let storedDestinationStart: number = 0;
		let storedDestinationEnd: number = this.chipData.length;
		let storedAmplitudeOffset: number = 0;
		if (!Array.isArray(storedChipWaveData)) {
			// Assume object format.
			storedRawData = storedChipWaveData.copiedData;
			storedDestinationStart = storedChipWaveData.destinationStart;
			storedDestinationEnd = storedChipWaveData.destinationEnd;
			storedAmplitudeOffset = storedChipWaveData.amplitudeOffset;
		}
		let storedData: Float32Array = new Float32Array(storedRawData);
		if (this.drawMode == DrawMode.Selection) {
			// Overwrite floating selection.
			this.commitFloatingSelection();
			this.clearSelection();
			this.selectionModeStep = SelectionModeStep.HasSelection;
			this._removeSelectionButton.style.display = "";
			this._selectionBounds = {
				start: Math.min(64, Math.max(0, storedDestinationStart)),
				end: Math.min(64, Math.max(0, storedDestinationEnd)),
			};
			for (let i = 0; i < 64; i++) this.temporaryArray[i] = this.chipData[i];
			this._floatingSelection = {
				data: storedData,
				destinationStart: storedDestinationStart,
				destinationEnd: storedDestinationEnd,
				amplitudeOffset: storedAmplitudeOffset,
			};
			for (let i = 0; i < 64; i++) this.chipData[i] = this.temporaryArray[i];
			stampFloatingSelectionOntoChipWave(
				this.chipData,
				storedData,
				storedDestinationStart,
				storedDestinationEnd,
				storedAmplitudeOffset
			);
		} else {
			this.clearSelection();
			stampFloatingSelectionOntoChipWave(
				this.chipData,
				storedData,
				storedDestinationStart,
				storedDestinationEnd,
				storedAmplitudeOffset
			);
			this._storeChange();
		}
		new ChangeCustomWave(this._doc, this.chipData);
		this.curveModeStep = CurveModeStep.First;
		this._curveModeMessage.textContent = getCurveModeStepMessage(this.curveModeStep);
		this._renderSelection();
	}

	public _randomizeCustomChip = (): void => {
		let randomGeneratedArray: Float32Array = new Float32Array(64);
        if (this._doc.prefs.customChipGenerationType == "customChipGenerateFully") {
            randomizeWave(randomGeneratedArray, 0, 64);
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
		else throw new Error("Unknown preference selected for custom chip randomization.");

		this.chipData = randomGeneratedArray;
		this._storeChange();
        new ChangeCustomWave(this._doc, randomGeneratedArray);
		this.curveModeStep = CurveModeStep.First;
	}

	public _randomizeSelection = (): void => {
		if (this.selectionModeStep == SelectionModeStep.HasSelection) {
			const bounds: SelectionBounds = this._selectionBounds!;
			if (this._selectionBounds == null) return;
			if (this._floatingSelection == null) {
				for (let i = 0; i < 64; i++) this.temporaryArray[i] = this.chipData[i];
				this._floatingSelection = createFloatingSelectionFromBounds(this.chipData, bounds);
			}
			randomizeWave(this._floatingSelection!.data, 0, this._floatingSelection!.data.length);
			for (let i = 0; i < 64; i++) this.chipData[i] = this.temporaryArray[i];
			stampFloatingSelectionOntoChipWave(
				this.chipData,
				this._floatingSelection!.data,
				this._floatingSelection!.destinationStart,
				this._floatingSelection!.destinationEnd,
				this._floatingSelection!.amplitudeOffset
			);
			this._storeChange();
        	new ChangeCustomWave(this._doc, this.chipData);
		} else {
			throw new Error("Attempted to randomize waveform during an intermediate selection tool state.");
		}
	}

	public flipHorizontally = (): void => {
		if (this.drawMode == DrawMode.Selection) {
			if (this.selectionModeStep == SelectionModeStep.HasSelection) {
				const bounds: SelectionBounds = this._selectionBounds!;
				if (this._floatingSelection == null) {
					for (let i = 0; i < 64; i++) this.temporaryArray[i] = this.chipData[i];
					this._floatingSelection = createFloatingSelectionFromBounds(this.chipData, bounds);
				}
				flipChipWaveHorizontally(this._floatingSelection!.data, 0, this._floatingSelection!.data.length);
				for (let i = 0; i < 64; i++) this.chipData[i] = this.temporaryArray[i];
				stampFloatingSelectionOntoChipWave(
					this.chipData,
					this._floatingSelection!.data,
					this._floatingSelection!.destinationStart,
					this._floatingSelection!.destinationEnd,
					this._floatingSelection!.amplitudeOffset
				);
				new ChangeCustomWave(this._doc, this.chipData);
			} else if (this.selectionModeStep == SelectionModeStep.NoSelection) {
				this.clearSelection();
				flipChipWaveHorizontally(this.chipData, 0, this.chipData.length);
				new ChangeCustomWave(this._doc, this.chipData);
				this._storeChange();
				this.render();
			} else {
				throw new Error("Attempted to flip during an intermediate selection tool state.");
			}
		} else {
			this.clearSelection();
			flipChipWaveHorizontally(this.chipData, 0, this.chipData.length);
			new ChangeCustomWave(this._doc, this.chipData);
			this._storeChange();
			this.render();
		}
	}

	public flipVertically = (): void => {
		if (this.drawMode == DrawMode.Selection) {
			if (this.selectionModeStep == SelectionModeStep.HasSelection) {
				const bounds: SelectionBounds = this._selectionBounds!;
				if (this._floatingSelection == null) {
					for (let i = 0; i < 64; i++) this.temporaryArray[i] = this.chipData[i];
					this._floatingSelection = createFloatingSelectionFromBounds(this.chipData, bounds);
				}
				flipChipWaveVertically(this._floatingSelection!.data, false, 0, this._floatingSelection!.data.length);
				for (let i = 0; i < 64; i++) this.chipData[i] = this.temporaryArray[i];
				stampFloatingSelectionOntoChipWave(
					this.chipData,
					this._floatingSelection!.data,
					this._floatingSelection!.destinationStart,
					this._floatingSelection!.destinationEnd,
					this._floatingSelection!.amplitudeOffset
				);
				new ChangeCustomWave(this._doc, this.chipData);
			} else if (this.selectionModeStep == SelectionModeStep.NoSelection) {
				this.clearSelection();
				flipChipWaveVertically(this.chipData, true, 0, this.chipData.length);
				new ChangeCustomWave(this._doc, this.chipData);
				this._storeChange();
				this.render();
			} else {
				throw new Error("Attempted to flip during an intermediate selection tool state.");
			}
		} else {
			this.clearSelection();
			flipChipWaveVertically(this.chipData, true, 0, this.chipData.length);
			new ChangeCustomWave(this._doc, this.chipData);
			this._storeChange();
			this.render();
		}
	}

	public clearSelection(): void {
		if (this.selectionModeStep != SelectionModeStep.NoSelection) {
			if (this._floatingSelection != null) {
				for (let i = 0; i < 64; i++) this.chipData[i] = this.temporaryArray[i];
				new ChangeCustomWave(this._doc, this.chipData);
			}
		}
		this.selectionModeStep = SelectionModeStep.NoSelection;
		this._removeSelectionButton.style.display = "none";
		this._selectionBounds = null;
		this._tentativeSelectionBounds = null;
		this._tentativeDestinationStart = null;
		this._tentativeDestinationEnd = null;
		this._tentativeAmplitudeOffset = null;
		this._floatingSelection = null;
		this._floatingSelectionDragStartX = null;
		this._floatingSelectionDragStartY = null;
		this._renderSelection();
	}

	public commitFloatingSelection(): void {
		if (this._floatingSelection != null) {
			for (let i = 0; i < 64; i++) this.chipData[i] = this.temporaryArray[i];
			stampFloatingSelectionOntoChipWave(
				this.chipData,
				this._floatingSelection.data,
				this._floatingSelection.destinationStart,
				this._floatingSelection.destinationEnd,
				this._floatingSelection.amplitudeOffset
			);
			new ChangeCustomWave(this._doc, this.chipData);
			this._storeChange();
			this._floatingSelection = null;
		}
	}

	private _renderSelection(): void {
		const bounds: SelectionBounds | null = (
			this._tentativeSelectionBounds != null
			? this._tentativeSelectionBounds
			: this._selectionBounds
		);
		if (bounds != null) {
			const selectionBoxWidth: number = (bounds.end - bounds.start) / 64 * this._editorWidth;

			const selectionBoxX0: number = bounds.start / 64 * this._editorWidth;
			const selectionBoxX1: number = selectionBoxX0 + selectionBoxWidth;

			const selectionBoxStartX0: number = selectionBoxX0 - this._selectionEdgeMargin;
			const selectionBoxStartX1: number = selectionBoxX0 + this._selectionEdgeMargin;

			const selectionBoxEndX0: number = selectionBoxX1 - this._selectionEdgeMargin;
			const selectionBoxEndX1: number = selectionBoxX1 + this._selectionEdgeMargin;

			const mouseIsInsideSelection: boolean = (
				!this._mouseDown // This is to match the way selection overlays look like on the piano roll.
				&& this._mouseX >= selectionBoxX0
				&& this._mouseX <= selectionBoxX1
				&& this._mouseY >= 0
				&& this._mouseY <= this._editorHeight
			);
			const mouseIsAtStartOfSelection: boolean = (
				!this._mouseDown // This is to match the way selection overlays look like on the piano roll.
				&& this._mouseX >= selectionBoxStartX0
				&& this._mouseX <= selectionBoxStartX1
				&& this._mouseY >= 0
				&& this._mouseY <= this._editorHeight

				// @TODO: There is a slight issue here where if a click happens
				// just on the outside of this.container, this event handler will
				// not be called, and so despite the edge highlighting, dragging
				// one will not be possible in that case.
				// I'm not sure what is the best fix for that.
				// For now, I've made the rendering reflect this constraint.
				&& this._mouseX >= 0
				&& this._mouseX <= this._editorWidth
			);
			const mouseIsAtEndOfSelection: boolean = (
				!this._mouseDown // This is to match the way selection overlays look like on the piano roll.
				&& this._mouseX >= selectionBoxEndX0
				&& this._mouseX <= selectionBoxEndX1
				&& this._mouseY >= 0
				&& this._mouseY <= this._editorHeight

				// See above.
				&& this._mouseX >= 0
				&& this._mouseX <= this._editorWidth
			);

			this._selectionBox.setAttribute("visibility", "visible");
			this._selectionBox.setAttribute("x", String(selectionBoxX0));
			this._selectionBox.setAttribute("width", String(selectionBoxWidth));
			this._selectionBox.setAttribute("y", "0");
			this._selectionBox.setAttribute("height", "" + this._editorHeight);

			const horizontalMargin: number = 2;
			const verticalMargin: number = 0.5;
			if (mouseIsAtStartOfSelection) {
				this._selectionBoxOverlay.setAttribute("visibility", "visible");
				const boxX0: number = selectionBoxStartX0;
				const boxY0: number = 0 - verticalMargin;
				const boxX1: number = selectionBoxStartX1;
				const boxY1: number = this._editorHeight + verticalMargin;
				this._selectionBoxOverlay.setAttribute("d",
					"M " + boxX0 + " " + boxY0
					+ "L " + boxX1 + " " + boxY0
					+ "L " + boxX1 + " " + boxY1
					+ "L " + boxX0 + " " + boxY1
					+ "z"
				);
			} else if (mouseIsAtEndOfSelection) {
				this._selectionBoxOverlay.setAttribute("visibility", "visible");
				const boxX0: number = selectionBoxEndX0;
				const boxY0: number = 0 - verticalMargin;
				const boxX1: number = selectionBoxEndX1;
				const boxY1: number = this._editorHeight + verticalMargin;
				this._selectionBoxOverlay.setAttribute("d",
					"M " + boxX0 + " " + boxY0
					+ "L " + boxX1 + " " + boxY0
					+ "L " + boxX1 + " " + boxY1
					+ "L " + boxX0 + " " + boxY1
					+ "z"
				);
			} else if (mouseIsInsideSelection) {
				this._selectionBoxOverlay.setAttribute("visibility", "visible");
				const boxX0: number = selectionBoxX0 - horizontalMargin;
				const boxY0: number = 0 - verticalMargin;
				const boxX1: number = selectionBoxX1 + horizontalMargin;
				const boxY1: number = this._editorHeight + verticalMargin;
				this._selectionBoxOverlay.setAttribute("d",
					"M " + boxX0 + " " + boxY0
					+ "L " + boxX1 + " " + boxY0
					+ "L " + boxX1 + " " + boxY1
					+ "L " + boxX0 + " " + boxY1
					+ "z"
				);
			} else {
				this._selectionBoxOverlay.setAttribute("visibility", "hidden");
			}
		} else {
			this._selectionBox.setAttribute("visibility", "hidden");
			this._selectionBoxOverlay.setAttribute("visibility", "hidden");
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
		} else if (this.drawMode == DrawMode.Curve) {
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
		} else if (this.drawMode == DrawMode.Selection) {
			switch (this.selectionModeStep) {
				case SelectionModeStep.NoSelection: {
					this.selectionModeStep = SelectionModeStep.MakingSelection;

					const newSelectionStart: number = Math.min(63, Math.max(0, Math.floor(this._mouseX * 64 / this._editorWidth)));
					const newSelectionEnd: number = newSelectionStart + 1;
					this._selectionBounds = {
						start: newSelectionStart,
						end: newSelectionEnd,
					};
					this._tentativeSelectionBounds = {
						start: newSelectionStart,
						end: newSelectionEnd,
					};
				} break;
				case SelectionModeStep.MakingSelection: {
					// Why is this supposed to be unreachable?
					// Well, while this is a state that's entered in this event,
					// only subsequent events will have it as a current state, at the
					// point where switch (this.selectionModeStep) starts.
					// Similar reasoning applies to the other unreachable cases below.
					throw new Error("This should be unreachable!");
				} break;
				case SelectionModeStep.HasSelection: {
					const bounds: SelectionBounds = this._selectionBounds!;

					const selectionBoxWidth: number = (bounds.end - bounds.start) / 64 * this._editorWidth;

					const selectionBoxX0: number = bounds.start / 64 * this._editorWidth;
					const selectionBoxX1: number = selectionBoxX0 + selectionBoxWidth;

					const selectionBoxStartX0: number = selectionBoxX0 - this._selectionEdgeMargin;
					const selectionBoxStartX1: number = selectionBoxX0 + this._selectionEdgeMargin;

					const selectionBoxEndX0: number = selectionBoxX1 - this._selectionEdgeMargin;
					const selectionBoxEndX1: number = selectionBoxX1 + this._selectionEdgeMargin;

					const mouseIsInsideSelection: boolean = (
						this._mouseX >= selectionBoxX0
						&& this._mouseX <= selectionBoxX1
						&& this._mouseY >= 0
						&& this._mouseY <= this._editorHeight
					);
					const mouseIsAtStartOfSelection: boolean = (
						this._mouseX >= selectionBoxStartX0
						&& this._mouseX <= selectionBoxStartX1
						&& this._mouseY >= 0
						&& this._mouseY <= this._editorHeight
					);
					const mouseIsAtEndOfSelection: boolean = (
						this._mouseX >= selectionBoxEndX0
						&& this._mouseX <= selectionBoxEndX1
						&& this._mouseY >= 0
						&& this._mouseY <= this._editorHeight
					);

					if (mouseIsAtStartOfSelection) {
						if (this.selectionDragEvent == SelectionDragEvent.Stretching) {
							if (this._floatingSelection == null) {
								for (let i = 0; i < 64; i++) this.temporaryArray[i] = this.chipData[i];
								this._floatingSelection = createFloatingSelectionFromBounds(this.chipData, bounds);
							}

							this.selectionModeStep = SelectionModeStep.StretchingFromStart;
							this._removeSelectionButton.style.display = "";

							this._floatingSelectionDragStartX = this._mouseX;
							this._floatingSelectionDragStartY = this._mouseY;

							this._tentativeSelectionBounds = {
								start: Math.min(64, Math.max(0, this._floatingSelection.destinationStart)),
								end: Math.min(64, Math.max(0, this._floatingSelection.destinationEnd)),
							};

							this._tentativeDestinationStart = this._floatingSelection.destinationStart;
							this._tentativeDestinationEnd = this._floatingSelection.destinationEnd;
						} else {
							this.commitFloatingSelection();

							this.selectionModeStep = SelectionModeStep.MovingSelectionStart;
							this._removeSelectionButton.style.display = "";

							this._tentativeSelectionBounds = {
								start: this._selectionBounds!.start,
								end: this._selectionBounds!.end,
							};
						}
					} else if (mouseIsAtEndOfSelection) {
						if (this.selectionDragEvent == SelectionDragEvent.Stretching) {
							if (this._floatingSelection == null) {
								for (let i = 0; i < 64; i++) this.temporaryArray[i] = this.chipData[i];
								this._floatingSelection = createFloatingSelectionFromBounds(this.chipData, bounds);
							}

							this.selectionModeStep = SelectionModeStep.StretchingFromEnd;
							this._removeSelectionButton.style.display = "";

							this._tentativeSelectionBounds = {
								start: Math.min(64, Math.max(0, this._floatingSelection.destinationStart)),
								end: Math.min(64, Math.max(0, this._floatingSelection.destinationEnd)),
							};

							this._floatingSelectionDragStartX = this._mouseX;
							this._floatingSelectionDragStartY = this._mouseY;

							this._tentativeDestinationStart = this._floatingSelection.destinationStart;
							this._tentativeDestinationEnd = this._floatingSelection.destinationEnd;
						} else {
							this.commitFloatingSelection();

							this.selectionModeStep = SelectionModeStep.MovingSelectionEnd;
							this._removeSelectionButton.style.display = "";

							this._tentativeSelectionBounds = {
								start: this._selectionBounds!.start,
								end: this._selectionBounds!.end,
							};
						}
					} else if (mouseIsInsideSelection) {
						this.selectionModeStep = SelectionModeStep.MovingFloatingSelection;
						this._removeSelectionButton.style.display = "";
						if (this._floatingSelection == null) {
							for (let i = 0; i < 64; i++) this.temporaryArray[i] = this.chipData[i];
							this._floatingSelection = createFloatingSelectionFromBounds(this.chipData, bounds);
						}

						this._floatingSelectionDragStartX = this._mouseX;
						this._floatingSelectionDragStartY = this._mouseY;

						this._tentativeSelectionBounds = {
							start: Math.min(64, Math.max(0, this._floatingSelection.destinationStart)),
							end: Math.min(64, Math.max(0, this._floatingSelection.destinationEnd)),
						};

						this._tentativeDestinationStart = this._floatingSelection.destinationStart;
						this._tentativeDestinationEnd = this._floatingSelection.destinationEnd;
						this._tentativeAmplitudeOffset = this._floatingSelection.amplitudeOffset;

						if (event.shiftKey) {
							this._lockSelectionHorizontally = true;
						} else {
							this._lockSelectionHorizontally = false;
						}
					} else {
						this.commitFloatingSelection();

						this.selectionModeStep = SelectionModeStep.MakingSelection;

						const newSelectionStart: number = Math.min(63, Math.max(0, Math.floor(this._mouseX * 64 / this._editorWidth)));
						const newSelectionEnd: number = newSelectionStart;
						this._selectionBounds = {
							start: newSelectionStart,
							end: newSelectionEnd,
						};
						this._tentativeSelectionBounds = {
							start: newSelectionStart,
							end: newSelectionEnd,
						};
					}
				} break;
				case SelectionModeStep.MovingSelectionStart: {
					throw new Error("This should be unreachable!");
				} break;
				case SelectionModeStep.MovingSelectionEnd: {
					throw new Error("This should be unreachable!");
				} break;
				case SelectionModeStep.MovingFloatingSelection: {
					throw new Error("This should be unreachable!");
				} break;
				case SelectionModeStep.StretchingFromStart: {
					throw new Error("This should be unreachable!");
				} break;
				case SelectionModeStep.StretchingFromEnd: {
					throw new Error("This should be unreachable!");
				} break;
			}
			this._renderSelection();
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
		} else if (this.drawMode == DrawMode.Curve) {
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
		} else if (this.drawMode == DrawMode.Selection) {
			this._renderSelection();
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
		} else if (this.drawMode == DrawMode.Curve) {
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
		} else if (this.drawMode == DrawMode.Selection) {
			switch (this.selectionModeStep) {
				case SelectionModeStep.NoSelection: {
					// Do nothing.
				} break;
				case SelectionModeStep.MakingSelection: {
					if (this._mouseDown) {
						const newSelectionEnd: number = Math.min(64, Math.max(0, Math.floor(this._mouseX * 64 / this._editorWidth)));
						if (newSelectionEnd > this._selectionBounds!.start) {
							this._tentativeSelectionBounds!.start = this._selectionBounds!.start;
							this._tentativeSelectionBounds!.end = newSelectionEnd;
						} else if (newSelectionEnd < this._selectionBounds!.start) {
							this._tentativeSelectionBounds!.start = newSelectionEnd;
							this._tentativeSelectionBounds!.end = this._selectionBounds!.start + 1;
						} else {
							// newSelectionEnd is the same as this._selectionBounds.start.
							// In this case the selection bounds remain what they initially
							// were when entering the MakingSelection state.
							this._tentativeSelectionBounds!.start = this._selectionBounds!.start;
							this._tentativeSelectionBounds!.end = this._selectionBounds!.end;
						}
					} else {
						// throw new Error("This should be unreachable!");
					}
				} break;
				case SelectionModeStep.HasSelection: {
					// Do nothing.
				} break;
				case SelectionModeStep.MovingSelectionStart: {
					if (this._mouseDown) {
						// This uses 64 as the maximum x coordinate because we want
						// to be able to make this selection empty by moving
						// the start edge.
						const newSelectionStart: number = Math.min(64, Math.max(0, Math.floor(this._mouseX * 64 / this._editorWidth)));
						if (newSelectionStart < this._selectionBounds!.end) {
							this._tentativeSelectionBounds!.start = newSelectionStart;
							this._tentativeSelectionBounds!.end = this._selectionBounds!.end;
						} else {
							// Make selection empty, just like in the piano roll.
							this._tentativeSelectionBounds!.start = this._selectionBounds!.start;
							this._tentativeSelectionBounds!.end = this._selectionBounds!.start;
						}
					} else {
						// throw new Error("This should be unreachable!");
					}
				} break;
				case SelectionModeStep.MovingSelectionEnd: {
					if (this._mouseDown) {
						const newSelectionEnd: number = Math.min(64, Math.max(0, Math.floor(this._mouseX * 64 / this._editorWidth)));
						if (newSelectionEnd > this._selectionBounds!.start) {
							this._tentativeSelectionBounds!.start = this._selectionBounds!.start;
							this._tentativeSelectionBounds!.end = newSelectionEnd;
						} else {
							// Make selection empty, just like in the piano roll.
							this._tentativeSelectionBounds!.start = this._selectionBounds!.start;
							this._tentativeSelectionBounds!.end = this._selectionBounds!.start;
						}
					} else {
						// throw new Error("This should be unreachable!");
					}
				} break;
				case SelectionModeStep.MovingFloatingSelection: {
					if (this._mouseDown) {
						const chipMouseX: number = Math.floor(this._mouseX * 64 / this._editorWidth);
						const chipMouseY: number = Math.floor(this._mouseY * 49 / this._editorHeight);
						const chipDragStartX: number = Math.floor(this._floatingSelectionDragStartX! * 64 / this._editorWidth);
						const chipDragStartY: number = Math.floor(this._floatingSelectionDragStartY! * 49 / this._editorHeight);
						const displacementX: number = chipMouseX - chipDragStartX;
						let displacementY: number = chipMouseY - chipDragStartY;
						if (this._lockSelectionHorizontally) {
							displacementY = 0;
						}

						this._tentativeDestinationStart = this._floatingSelection!.destinationStart + displacementX;
						this._tentativeDestinationEnd = this._floatingSelection!.destinationEnd + displacementX;
						this._tentativeSelectionBounds!.start = Math.min(64, Math.max(0, this._tentativeDestinationStart));
						this._tentativeSelectionBounds!.end = Math.min(64, Math.max(0, this._tentativeDestinationEnd));
						this._tentativeAmplitudeOffset = this._floatingSelection!.amplitudeOffset + displacementY;

						for (let i = 0; i < 64; i++) this.chipData[i] = this.temporaryArray[i];
						stampFloatingSelectionOntoChipWave(
							this.chipData,
							this._floatingSelection!.data,
							this._tentativeDestinationStart,
							this._tentativeDestinationEnd,
							this._tentativeAmplitudeOffset
						);
						new ChangeCustomWave(this._doc, this.chipData);
					} else {
						// throw new Error("This should be unreachable!");
					}
				} break;
				case SelectionModeStep.StretchingFromStart: {
					if (this._mouseDown) {
						const chipMouseX: number = Math.floor(this._mouseX * 64 / this._editorWidth);
						const chipDragStartX: number = Math.floor(this._floatingSelectionDragStartX! * 64 / this._editorWidth);
						const displacementX: number = chipMouseX - chipDragStartX;

						this._tentativeDestinationStart = this._floatingSelection!.destinationStart + displacementX;
						this._tentativeDestinationEnd = this._floatingSelection!.destinationEnd;
						this._tentativeSelectionBounds!.start = Math.min(64, Math.max(0, this._tentativeDestinationStart));
						this._tentativeSelectionBounds!.end = Math.min(64, Math.max(0, this._tentativeDestinationEnd));

						if (this._tentativeSelectionBounds!.start < this._tentativeSelectionBounds!.end) {
							for (let i = 0; i < 64; i++) this.chipData[i] = this.temporaryArray[i];
							stampFloatingSelectionOntoChipWave(
								this.chipData,
								this._floatingSelection!.data,
								this._tentativeDestinationStart,
								this._tentativeDestinationEnd,
								this._floatingSelection!.amplitudeOffset
							);
							new ChangeCustomWave(this._doc, this.chipData);
						} else {
							for (let i = 0; i < 64; i++) this.chipData[i] = this.temporaryArray[i];
							new ChangeCustomWave(this._doc, this.chipData);
						}
					} else {
						// throw new Error("This should be unreachable!");
					}
				} break;
				case SelectionModeStep.StretchingFromEnd: {
					if (this._mouseDown) {
						const chipMouseX: number = Math.floor(this._mouseX * 64 / this._editorWidth);
						const chipDragStartX: number = Math.floor(this._floatingSelectionDragStartX! * 64 / this._editorWidth);
						const displacementX: number = chipMouseX - chipDragStartX;

						this._tentativeDestinationStart = this._floatingSelection!.destinationStart;
						this._tentativeDestinationEnd = this._floatingSelection!.destinationEnd + displacementX;
						this._tentativeSelectionBounds!.start = Math.min(64, Math.max(0, this._tentativeDestinationStart));
						this._tentativeSelectionBounds!.end = Math.min(64, Math.max(0, this._tentativeDestinationEnd));

						if (this._tentativeSelectionBounds!.start < this._tentativeSelectionBounds!.end) {
							for (let i = 0; i < 64; i++) this.chipData[i] = this.temporaryArray[i];
							stampFloatingSelectionOntoChipWave(
								this.chipData,
								this._floatingSelection!.data,
								this._tentativeDestinationStart,
								this._tentativeDestinationEnd,
								this._floatingSelection!.amplitudeOffset
							);
							new ChangeCustomWave(this._doc, this.chipData);
						} else {
							for (let i = 0; i < 64; i++) this.chipData[i] = this.temporaryArray[i];
							new ChangeCustomWave(this._doc, this.chipData);
						}
					} else {
						// throw new Error("This should be unreachable!");
					}
				} break;
			}
			this._renderSelection();
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
		} else if (this.drawMode == DrawMode.Curve) {
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
		} else if (this.drawMode == DrawMode.Selection) {
			this._renderSelection();
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
					const steps: number = 200;
					for (var i = 0; i < steps; i++) {
						// https://pomax.github.io/bezierinfo/#whatis
						const lt: number = i / (steps - 1);

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
			} else if (this.drawMode == DrawMode.Selection) {
				// Do nothing.
			} else throw new Error("Unknown draw mode selected.");

			// Make a change to the data but don't record it, since this prompt uses its own undo/redo queue
			new ChangeCustomWave(this._doc, this.chipData);

			this._lastIndex = index;
			this._lastAmp = amp;
		}
	}

	public _whenCursorReleased = (event: Event): void => {
		if (this.drawMode == DrawMode.Curve && this._mouseDown) {
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
		} else if (this.drawMode == DrawMode.Selection) {
			switch (this.selectionModeStep) {
				case SelectionModeStep.NoSelection: {
					if (this._mouseDown) {
						throw new Error("This should be unreachable!");
					}
				} break;
				case SelectionModeStep.MakingSelection: {
					if (this._mouseDown) {
						const bounds: SelectionBounds | null = this._tentativeSelectionBounds;
						if (bounds != null && bounds.start < bounds.end) {
							this.selectionModeStep = SelectionModeStep.HasSelection;
							this._removeSelectionButton.style.display = "";

							this._selectionBounds!.start = bounds.start;
							this._selectionBounds!.end = bounds.end;
							this._tentativeSelectionBounds = null;
						} else {
							this.selectionModeStep = SelectionModeStep.NoSelection;
							this._removeSelectionButton.style.display = "none";

							this._selectionBounds = null;
							this._tentativeSelectionBounds = null;
						}
					}


					// There shouldn't be any changes to commit,
					// other than the potential one in the pressed event.
					this._mouseDown = false;
					return;
				} break;
				case SelectionModeStep.HasSelection: {
					// If this happens, it most likely means that
					// the mouse is outside of the canvas.
				} break;
				case SelectionModeStep.MovingSelectionStart: {
					if (this._mouseDown) {
						const bounds: SelectionBounds | null = this._tentativeSelectionBounds;
						if (bounds != null && bounds.start < bounds.end) {
							this.selectionModeStep = SelectionModeStep.HasSelection;
							this._removeSelectionButton.style.display = "";

							this._selectionBounds!.start = bounds.start;
							this._selectionBounds!.end = bounds.end;
							this._tentativeSelectionBounds = null;
						} else {
							this.selectionModeStep = SelectionModeStep.NoSelection;
							this._removeSelectionButton.style.display = "none";

							this._selectionBounds = null;
							this._tentativeSelectionBounds = null;
						}
					}


					// There shouldn't be any changes to commit,
					// other than the potential one in the pressed event.
					this._mouseDown = false;
					return;
				} break;
				case SelectionModeStep.MovingSelectionEnd: {
					if (this._mouseDown) {
						const bounds: SelectionBounds | null = this._tentativeSelectionBounds;
						if (bounds != null && bounds.start < bounds.end) {
							this.selectionModeStep = SelectionModeStep.HasSelection;
							this._removeSelectionButton.style.display = "";

							this._selectionBounds!.start = bounds.start;
							this._selectionBounds!.end = bounds.end;
							this._tentativeSelectionBounds = null;
						} else {
							this.selectionModeStep = SelectionModeStep.NoSelection;
							this._removeSelectionButton.style.display = "none";

							this._selectionBounds = null;
							this._tentativeSelectionBounds = null;
						}
					}


					// There shouldn't be any changes to commit,
					// other than the potential one in the pressed event.
					this._mouseDown = false;
					return;
				} break;
				case SelectionModeStep.MovingFloatingSelection: {
					if (this._mouseDown) {
						const bounds: SelectionBounds = this._tentativeSelectionBounds!;

						const differenceX: number = Math.abs(this._tentativeDestinationStart! - this._floatingSelection!.destinationStart);
						const differenceY: number = Math.abs(this._tentativeAmplitudeOffset! - this._floatingSelection!.amplitudeOffset);

						if (differenceX != 0 || differenceY != 0) {
							if (bounds.start < bounds.end) {
								this.selectionModeStep = SelectionModeStep.HasSelection;
								this._removeSelectionButton.style.display = "";

								this._selectionBounds!.start = bounds.start;
								this._selectionBounds!.end = bounds.end;

								this._floatingSelection!.destinationStart = this._tentativeDestinationStart!;
								this._floatingSelection!.destinationEnd = this._tentativeDestinationEnd!;
								this._floatingSelection!.amplitudeOffset = this._tentativeAmplitudeOffset!;

								for (let i = 0; i < 64; i++) this.chipData[i] = this.temporaryArray[i];
								stampFloatingSelectionOntoChipWave(
									this.chipData,
									this._floatingSelection!.data,
									this._floatingSelection!.destinationStart,
									this._floatingSelection!.destinationEnd,
									this._floatingSelection!.amplitudeOffset
								);
								new ChangeCustomWave(this._doc, this.chipData);
							} else {
								this.selectionModeStep = SelectionModeStep.NoSelection;
								this._removeSelectionButton.style.display = "none";

								this._selectionBounds = null;
								this._floatingSelection = null;

								for (let i = 0; i < 64; i++) this.chipData[i] = this.temporaryArray[i];
								new ChangeCustomWave(this._doc, this.chipData);
							}
						} else {
							this.selectionModeStep = SelectionModeStep.HasSelection;
							this._removeSelectionButton.style.display = "";
						}

						this._tentativeSelectionBounds = null;
						this._tentativeDestinationStart = null;
						this._tentativeDestinationEnd = null;
						this._tentativeAmplitudeOffset = null;
						this._floatingSelectionDragStartX = null;
						this._floatingSelectionDragStartY = null;
						this._lockSelectionHorizontally = false;
					}

					// There shouldn't be any changes to commit.
					this._mouseDown = false;
					return;
				} break;
				case SelectionModeStep.StretchingFromStart: {
					if (this._mouseDown) {
						const newSelectionStart: number = Math.min(64, Math.max(0, this._tentativeDestinationStart!));
						const newSelectionEnd: number = Math.min(64, Math.max(0, this._tentativeDestinationEnd!));

						const differenceX: number = Math.abs(this._tentativeDestinationStart! - this._floatingSelection!.destinationStart);

						if (differenceX != 0) {
							if (newSelectionStart < newSelectionEnd) {
								this.selectionModeStep = SelectionModeStep.HasSelection;
								this._removeSelectionButton.style.display = "";

								this._selectionBounds!.start = newSelectionStart;
								this._selectionBounds!.end = newSelectionEnd;

								this._floatingSelection!.destinationStart = this._tentativeDestinationStart!;
								this._floatingSelection!.destinationEnd = this._tentativeDestinationEnd!;

								for (let i = 0; i < 64; i++) this.chipData[i] = this.temporaryArray[i];
								stampFloatingSelectionOntoChipWave(
									this.chipData,
									this._floatingSelection!.data,
									this._floatingSelection!.destinationStart,
									this._floatingSelection!.destinationEnd,
									this._floatingSelection!.amplitudeOffset
								);
								new ChangeCustomWave(this._doc, this.chipData);
							} else {
								this.selectionModeStep = SelectionModeStep.NoSelection;
								this._removeSelectionButton.style.display = "none";

								this._selectionBounds = null;
								this._floatingSelection = null;

								for (let i = 0; i < 64; i++) this.chipData[i] = this.temporaryArray[i];
								new ChangeCustomWave(this._doc, this.chipData);
							}
						}

						this._tentativeSelectionBounds = null;
						this._tentativeDestinationStart = null;
						this._tentativeDestinationEnd = null;
						this._floatingSelectionDragStartX = null;
						this._floatingSelectionDragStartY = null;
					}

					// There shouldn't be any changes to commit.
					this._mouseDown = false;
					return;
				} break;
				case SelectionModeStep.StretchingFromEnd: {
					if (this._mouseDown) {
						const newSelectionStart: number = Math.min(64, Math.max(0, this._tentativeDestinationStart!));
						const newSelectionEnd: number = Math.min(64, Math.max(0, this._tentativeDestinationEnd!));

						const differenceX: number = Math.abs(this._tentativeDestinationEnd! - this._floatingSelection!.destinationEnd);

						if (differenceX != 0) {
							if (newSelectionStart < newSelectionEnd) {
								this.selectionModeStep = SelectionModeStep.HasSelection;
								this._removeSelectionButton.style.display = "";

								this._selectionBounds!.start = newSelectionStart;
								this._selectionBounds!.end = newSelectionEnd;

								this._floatingSelection!.destinationStart = this._tentativeDestinationStart!;
								this._floatingSelection!.destinationEnd = this._tentativeDestinationEnd!;

								for (let i = 0; i < 64; i++) this.chipData[i] = this.temporaryArray[i];
								stampFloatingSelectionOntoChipWave(
									this.chipData,
									this._floatingSelection!.data,
									this._floatingSelection!.destinationStart,
									this._floatingSelection!.destinationEnd,
									this._floatingSelection!.amplitudeOffset
								);
								new ChangeCustomWave(this._doc, this.chipData);
							} else {
								this.selectionModeStep = SelectionModeStep.NoSelection;
								this._removeSelectionButton.style.display = "none";

								this._selectionBounds = null;
								this._floatingSelection = null;

								for (let i = 0; i < 64; i++) this.chipData[i] = this.temporaryArray[i];
								new ChangeCustomWave(this._doc, this.chipData);
							}
						}

						this._tentativeSelectionBounds = null;
						this._tentativeDestinationStart = null;
						this._tentativeDestinationEnd = null;
						this._floatingSelectionDragStartX = null;
						this._floatingSelectionDragStartY = null;
					}

					// There shouldn't be any changes to commit.
					this._mouseDown = false;
					return;
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
		if (this.drawMode != DrawMode.Selection || this.selectionModeStep == SelectionModeStep.NoSelection) {
		for (let i = 0; i < 64; i++) this.chipData[i] = Math.min(24, Math.max(-24, this.chipData[i] - 1));
		} else {
			if (this.selectionModeStep == SelectionModeStep.HasSelection) {
				const bounds: SelectionBounds = this._selectionBounds!;
				if (this._selectionBounds == null) return;
				if (this._floatingSelection == null) {
					for (let i = 0; i < 64; i++) this.temporaryArray[i] = this.chipData[i];
					this._floatingSelection = createFloatingSelectionFromBounds(this.chipData, bounds);
				}
				for (let i = 0; i < this._floatingSelection!.data.length; i++) this._floatingSelection!.data[i] = Math.min(24, Math.max(-24, this._floatingSelection!.data[i] - 1));
				for (let i = 0; i < 64; i++) this.chipData[i] = this.temporaryArray[i];
				stampFloatingSelectionOntoChipWave(
					this.chipData,
					this._floatingSelection!.data,
					this._floatingSelection!.destinationStart,
					this._floatingSelection!.destinationEnd,
					this._floatingSelection!.amplitudeOffset
				);
			} else {
				throw new Error("Attempted to shift waveform points during an intermediate selection tool state.");
			}
		}
  		new ChangeCustomWave(this._doc, this.chipData);
  		this._storeChange();
  		this.render();
	}

	public shiftSamplesDown(): void {
		if (this.drawMode != DrawMode.Selection || this.selectionModeStep == SelectionModeStep.NoSelection) {
			for (let i = 0; i < 64; i++) this.chipData[i] = Math.min(24, Math.max(-24, this.chipData[i] + 1));
			} else {
				if (this.selectionModeStep == SelectionModeStep.HasSelection) {
					const bounds: SelectionBounds = this._selectionBounds!;
					if (this._selectionBounds == null) return;
					if (this._floatingSelection == null) {
						for (let i = 0; i < 64; i++) this.temporaryArray[i] = this.chipData[i];
						this._floatingSelection = createFloatingSelectionFromBounds(this.chipData, bounds);
					}
					for (let i = 0; i < this._floatingSelection!.data.length; i++) this._floatingSelection!.data[i] = Math.min(24, Math.max(-24, this._floatingSelection!.data[i] + 1));
					for (let i = 0; i < 64; i++) this.chipData[i] = this.temporaryArray[i];
					stampFloatingSelectionOntoChipWave(
						this.chipData,
						this._floatingSelection!.data,
						this._floatingSelection!.destinationStart,
						this._floatingSelection!.destinationEnd,
						this._floatingSelection!.amplitudeOffset
					);
				} else {
					throw new Error("Attempted to shift waveform points during an intermediate selection tool state.");
				}
			}
  		new ChangeCustomWave(this._doc, this.chipData);
  		this._storeChange();
  		this.render();
	}
}

export class CustomChipPrompt implements Prompt {

	private curveModeStepText: HTMLDivElement = div({style: "position: absolute; align-self: center; bottom: 57px; font-size: 15px;"}, "");

	public removeSelectionButton: HTMLButtonElement = button({ style: "position: absolute; width:30%; align-self: center; bottom: 54px; font-size: 13px;" }, [
		"Cancel Selection (Esc)",
	]);

	public customChipCanvas: CustomChipPromptCanvas = new CustomChipPromptCanvas(this._doc, this.curveModeStepText, this.removeSelectionButton);

	public readonly _playButton: HTMLButtonElement = button({ style: "width: 55%;", type: "button" });

	public readonly _undoButton: HTMLButtonElement = button({ style: "width: 15%; position: absolute; margin-left: 0px; left: 127px; top: 53px;" }, _.undoLabel);
	public readonly _redoButton: HTMLButtonElement = button({ style: "width: 15%; position: absolute; margin-right: 0px; right: 127px; top: 53px;" }, _.redoLabel);

	public readonly _drawType_Standard: HTMLButtonElement = button({ style: "border-radius: 0px; width: 65px;", title: "Cursor"}, [
		// Cursor icon:
		SVG.svg({ class: "no-underline", style: "flex-shrink: 0; position: absolute; top: 4px; left: 24px; pointer-events: none;", width: "16", height: "16", viewBox: "0 0 16 16" }, [
			SVG.path({ d: "M 14.082 2.182 a 0.5 0.5 0 0 1 0.103 0.557 L 8.528 15.467 a 0.5 0.5 0 0 1 -0.917 -0.007 L 8 8 L 0.803 8.652 a 0.5 0.5 0 0 1 -0.006 -0.916 l 12.728 -5.657 a 0.5 0.5 0 0 1 0.556 0.103 M 3 12 L 2 15 L 5 14 L 7.944 8.996 L 8 8 L 7.005 8.091 z", fill: "currentColor" }),
		]),
	]);
	public readonly _drawType_Line: HTMLButtonElement = button({ style: "border-radius: 0px; width: 65px;", title: "Line"}, [
		// Line icon:
		SVG.svg({ class: "no-underline", style: "flex-shrink: 0; position: absolute; top: 4px; left: 24px; pointer-events: none;", width: "16", height: "16", viewBox: "0 0 16 16" }, [
			SVG.path({ d: "M 14 2.5 a 12 12 0 0 0 -0.5 -0.5 h -6.967 a 0.5 0.5 0 0 0 0 1 h 5.483 L 2.146 13.146 a 0.5 0.5 0 0 0 0.708 0.708 L 13.009 3.991 V 9.504 a 0.5 0.5 0 0 0 1 0 z", fill: "currentColor" }),
		]),
	]);
	public readonly _drawType_Curve: HTMLButtonElement = button({ style: "border-radius: 0px; width: 65px;", title: "Curve"}, [
		// Curved-line icon:
		SVG.svg({ class: "no-underline", style: "flex-shrink: 0; position: absolute; top: 4px; left: 24px; pointer-events: none;", width: "16", height: "16", viewBox: "0 0 16 16" }, [
			SVG.path({ d: "M0 10.5A1.5 1.5 0 0 1 1.5 9h1A1.5 1.5 0 0 1 4 10.5v1A1.5 1.5 0 0 1 2.5 13h-1A1.5 1.5 0 0 1 0 11.5zm1.5-.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5zm10.5.5A1.5 1.5 0 0 1 13.5 9h1a1.5 1.5 0 0 1 1.5 1.5v1a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5zm1.5-.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5zM6 4.5A1.5 1.5 0 0 1 7.5 3h1A1.5 1.5 0 0 1 10 4.5v1A1.5 1.5 0 0 1 8.5 7h-1A1.5 1.5 0 0 1 6 5.5zM7.5 4a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5z", fill: "currentColor" }),
			SVG.path({ d: "M6 4.5H1.866a1 1 0 1 0 0 1h2.668A6.52 6.52 0 0 0 1.814 9H2.5q.186 0 .358.043a5.52 5.52 0 0 1 3.185-3.185A1.5 1.5 0 0 1 6 5.5zm3.957 1.358A1.5 1.5 0 0 0 10 5.5v-1h4.134a1 1 0 1 1 0 1h-2.668a6.52 6.52 0 0 1 2.72 3.5H13.5q-.185 0-.358.043a5.52 5.52 0 0 0-3.185-3.185", fill: "currentColor"}),
		]),
	]);
	public readonly _drawType_Selection: HTMLButtonElement = button({ style: "border-radius: 0px; width: 65px;", title: "Selection"}, [
		// Dotted-outline box icon:
		SVG.svg({ class: "no-underline", style: "flex-shrink: 0; position: absolute; top: 4px; left: 24px; pointer-events: none;", width: "16", height: "16", viewBox: "0 0 16 16" }, [
			SVG.path({ d: "M 2.5 0 q -0.25 0 -0.487 0.048 l 0.194 0.98 A 1.5 1.5 0 0 1 2.5 1 h 0.458 V 0 z m 2.292 0 h -0.917 v 1 h 0.917 z m 1.833 0 h -0.917 v 1 h 0.917 z m 1.833 0 h -0.916 v 1 h 0.916 z m 1.834 0 h -0.917 v 1 h 0.917 z m 1.833 0 h -0.917 v 1 h 0.917 z M 13.5 0 h -0.458 v 1 h 0.458 q 0.151 0 0.293 0.029 l 0.194 -0.981 A 2.5 2.5 0 0 0 13.5 0 m 2.079 1.11 a 2.5 2.5 0 0 0 -0.69 -0.689 l -0.556 0.831 q 0.248 0.167 0.415 0.415 l 0.83 -0.556 z M 1.11 0.421 a 2.5 2.5 0 0 0 -0.689 0.69 l 0.831 0.556 c 0.11 -0.164 0.251 -0.305 0.415 -0.415 z M 16 2.5 q 0 -0.25 -0.048 -0.487 l -0.98 0.194 q 0.027 0.141 0.028 0.293 v 0.458 h 1 z M 0.048 2.013 A 2.5 2.5 0 0 0 0 2.5 v 0.458 h 1 V 2.5 q 0 -0.151 0.029 -0.293 z M 0 3.875 v 0.917 h 1 v -0.917 z m 16 0.917 v -0.917 h -1 v 0.917 z M 0 5.708 v 0.917 h 1 v -0.917 z m 16 0.917 v -0.917 h -1 v 0.917 z M 0 7.542 v 0.916 h 1 v -0.916 z m 15 0.916 h 1 v -0.916 h -1 z M 0 9.375 v 0.917 h 1 v -0.917 z m 16 0.917 v -0.917 h -1 v 0.917 z m -16 0.916 v 0.917 h 1 v -0.917 z m 16 0.917 v -0.917 h -1 v 0.917 z m -16 0.917 v 0.458 q 0 0.25 0.048 0.487 l 0.98 -0.194 A 1.5 1.5 0 0 1 1 13.5 v -0.458 z m 16 0.458 v -0.458 h -1 v 0.458 q 0 0.151 -0.029 0.293 l 0.981 0.194 Q 16 13.75 16 13.5 M 0.421 14.89 c 0.183 0.272 0.417 0.506 0.69 0.689 l 0.556 -0.831 a 1.5 1.5 0 0 1 -0.415 -0.415 z m 14.469 0.689 c 0.272 -0.183 0.506 -0.417 0.689 -0.69 l -0.831 -0.556 c -0.11 0.164 -0.251 0.305 -0.415 0.415 l 0.556 0.83 z m -12.877 0.373 Q 2.25 16 2.5 16 h 0.458 v -1 H 2.5 q -0.151 0 -0.293 -0.029 z M 13.5 16 q 0.25 0 0.487 -0.048 l -0.194 -0.98 A 1.5 1.5 0 0 1 13.5 15 h -0.458 v 1 z m -9.625 0 h 0.917 v -1 h -0.917 z m 1.833 0 h 0.917 v -1 h -0.917 z m 1.834 -1 v 1 h 0.916 v -1 z m 1.833 1 h 0.917 v -1 h -0.917 z m 1.833 0 h 0.917 v -1 h -0.917 z", fill: "currentColor" }),
		]),
	]);
	private readonly drawToolsContainer: HTMLDivElement = div({ class: "instrument-bar", style: "margin-left: -4px; display: grid; grid-template-columns: repeat(4, 70px); grid-gap: 2px 0px; width: 270px;" }, this._drawType_Standard, this._drawType_Line, this._drawType_Curve, this._drawType_Selection);

	private readonly dragOnSelectionButton1: HTMLButtonElement = button({ style: "width: 90px; position: absolute; top: 84px; align-self: center;", title: "Extend Selection Ends"}, [
		// Extending dotted-outline box icon:
		SVG.svg({ class: "no-underline", style: "flex-shrink: 0; scale: 2; position: absolute; top: 7px; left: 31px; pointer-events: none;", width: "24", height: "24", viewBox: "0 0 30 24" }, [
			SVG.path({ d: "M4 3 5 3 5 3.5 4 3.5 4 3M6 3 7 3 7 3.5 6 3.5 6 3M8 3 9 3 9 3.5 8 3.5 8 3M10 3 11 3 11 3.5 10 3.5 10 3M12 3 13 3 13 3.5 12 3.5 12 3M14 3 15 3 15 3.5 14 3.5 14 3M16 3 17 3 17 3.5 16 3.5 16 3M18 3 19 3 19 3.5 18 3.5 18 3M3 4 3.5 4 3.5 5 3 5 3 4M3 6 3.5 6 3.5 7 3 7 3 6M3 8 3.5 8 3.5 9 3 9 3 8M3 10 3.5 10 3.5 11 3 11 3 10M3 12 3.5 12 3.5 13 3 13 3 12M4 14 4 13.5 5 13.5 5 14 4 14M6 14 6 13.5 7 13.5 7 14 6 14M8 14 8 13.5 9 13.5 9 14 8 14M10 14 10 13.5 11 13.5 11 14 10 14M12 14 12 13.5 13 13.5 13 14 12 14M14 14 14 13.5 15 13.5 15 14 14 14M16 14 16 13.5 17 13.5 17 14 16 14M18 14 18 13.5 19 13.5 19 14 18 14M20 4 19.5 4 19.5 5 20 5 20 4M20 6 19.5 6 19.5 7 20 7 20 6M24 8 19.5 8 19.5 9 24 9 24 11 26 8.5 24 6 24 8M20 10 19.5 10 19.5 11 20 11 20 10M20 12 19.5 12 19.5 13 20 13 20 12M28 6 27 5 27.5 7 28 7 28 6M28 8 27.5 8 27.5 9 28 9 28 8M28 10 27.5 10 27 12 28 11 28 10ZM5 6 5 5 10 5 10 11 13 11 13 7 16 7 16 9 18 9 18 10 16 10 16 8 13 8 13 12 10 12 10 6 5 6Z", fill: "currentColor" }),
		]),
	]);
	private readonly dragOnSelectionButton2: HTMLButtonElement = button({ style: "width: 90px; position: absolute; top: 84px; align-self: center;", title: "Stretch Items in Selection"}, [
		// Stretching dotted-outline box icon:
		SVG.svg({ class: "no-underline", style: "flex-shrink: 0; scale: 2; position: absolute; top: 7px; left: 31px; pointer-events: none;", width: "24", height: "24", viewBox: "0 0 30 24" }, [
			SVG.path({ d: "M4 3 5 3 5 3.5 4 3.5 4 3M6 3 7 3 7 3.5 6 3.5 6 3M8 3 9 3 9 3.5 8 3.5 8 3M10 3 11 3 11 3.5 10 3.5 10 3M12 3 13 3 13 3.5 12 3.5 12 3M14 3 15 3 15 3.5 14 3.5 14 3M16 3 17 3 17 3.5 16 3.5 16 3M18 3 19 3 19 3.5 18 3.5 18 3M20 3 21 3 21 3.5 20 3.5 20 3M22 3 23 3 23 3.5 22 3.5 22 3M24 3 25 3 25 3.5 24 3.5 24 3M26 3 27 3 27 3.5 26 3.5 26 3M3 4 3.5 4 3.5 5 3 5 3 4M3 6 3.5 6 3.5 7 3 7 3 6M3 8 3.5 8 3.5 9 3 9 3 8M3 10 3.5 10 3.5 11 3 11 3 10M3 12 3.5 12 3.5 13 3 13 3 12M4 14 4 13.5 5 13.5 5 14 4 14M6 14 6 13.5 7 13.5 7 14 6 14M8 14 8 13.5 9 13.5 9 14 8 14M10 14 10 13.5 11 13.5 11 14 10 14M12 14 12 13.5 13 13.5 13 14 12 14M14 14 14 13.5 15 13.5 15 14 14 14M16 14 16 13.5 17 13.5 17 14 16 14M18 14 18 13.5 19 13.5 19 14 18 14M20 14 21 14 21 13.5 20 13.5 20 14M22 14 23 14 23 13.5 22 13.5 22 14M24 14 25 14 25 13.5 24 13.5 24 14M26 14 27 14 27 13.5 26 13.5 26 14M28 4 27.5 4 27.5 5 28 5 28 4M28 6 27.5 6 27.5 7 28 7 28 6M28 8 27.5 8 27.5 9 28 9 28 8M28 10 27.5 10 27.5 11 28 11 28 10M28 12 27.5 12 27.5 13 28 13 28 12ZM5 6 5 5 13 5 13 11 18 11 18 7 23 7 23 9 26 9 26 10 23 10 23 8 18 8 18 12 13 12 13 6 5 6Z", fill: "currentColor" }),
		]),
	]);

	private readonly _flipHorizontalButton: HTMLButtonElement = button({ style: "position: absolute; width: 14%; align-self: center; left: 224px; bottom: 20px; font-size: 10.35px;" }, [
		"Flip Left ↔ Right (H)",
	]);
	private readonly _flipVerticalButton: HTMLButtonElement = button({ style: "position: absolute; width: 14%; align-self: center; right: 224px; bottom: 20px; font-size: 10.35px;" }, [
		"Flip Top ↔ Bottom (N)",
	]);

	private readonly _cancelButton: HTMLButtonElement = button({ class: "cancelButton" });
	private readonly _okayButton: HTMLButtonElement = button({ class: "okayButton", style: "width:32%; font-size: 15px;" }, _.confirmLabel);

	private readonly copyButton: HTMLButtonElement = button({ style: "width: 36.66%; margin-right: 5px; text-align: center;", class: "copyButton" }, [
		_.copyLabel,
		// Copy icon:
		SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;", width: "2em", height: "2em", viewBox: "-5 -21 26 26" }, [
			SVG.path({ d: "M 0 -15 L 1 -15 L 1 0 L 13 0 L 13 1 L 0 1 L 0 -15 z M 2 -1 L 2 -17 L 10 -17 L 14 -13 L 14 -1 z M 3 -2 L 13 -2 L 13 -12 L 9 -12 L 9 -16 L 3 -16 z", fill: "currentColor" }),
		]),
	]);
	private readonly pasteButton: HTMLButtonElement = button({ style: "width: 36.66%; text-align: center;", class: "pasteButton" }, [
		_.pasteLabel,
		// Paste icon:
		SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;", width: "2em", height: "2em", viewBox: "0 0 26 26" }, [
			SVG.path({ d: "M 8 18 L 6 18 L 6 5 L 17 5 L 17 7 M 9 8 L 16 8 L 20 12 L 20 22 L 9 22 z", stroke: "currentColor", fill: "none" }),
			SVG.path({ d: "M 9 3 L 14 3 L 14 6 L 9 6 L 9 3 z M 16 8 L 20 12 L 16 12 L 16 8 z", fill: "currentColor", }),
		]),
	]);
	private readonly copyPasteContainer: HTMLDivElement = div({ style: "position: absolute; left: -11px; bottom: 20px; width: 40%;" }, this.copyButton, this.pasteButton);

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
		this._undoButton,
		this._redoButton,
		this.dragOnSelectionButton1,
		this.dragOnSelectionButton2,
		div({ style: "display: flex; width: 55%; align-self: center; flex-direction: row; align-items: center; justify-content: center;" },
			this._playButton,
		),
		div({ style: "margin-top: 36px; margin-bottom: 3px; align-self: center; display: flex; flex-direction: row; align-items: center; justify-content: center;" },
			this.drawToolsContainer,
		),
		div({ style: "margin-top: 2px; display: flex; flex-direction: row; align-items: center; justify-content: center;" },
			this.customChipCanvas.container,
		),
		this.curveModeStepText,
		this.removeSelectionButton,
		this._flipHorizontalButton,
		this._flipVerticalButton,
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
		this.randomizeButton.addEventListener("click", this._decideRandomization);
		this._undoButton.addEventListener("click", this.customChipCanvas.undo);
		this._redoButton.addEventListener("click", this.customChipCanvas.redo);
		this._playButton.addEventListener("click", this._togglePlay);
		this.updatePlayButton();
		this._drawType_Standard.addEventListener("click", this._selectStandardDrawType);
		this._drawType_Line.addEventListener("click", this._selectLineDrawType);
		this._drawType_Curve.addEventListener("click", this._selectCurveDrawType);
		this._drawType_Selection.addEventListener("click", this._selectSelectionDrawType);
		this.removeSelectionButton.addEventListener("click", this._removeSelection);
		this._flipHorizontalButton.addEventListener("click", this.customChipCanvas.flipHorizontally);
		this._flipVerticalButton.addEventListener("click", this.customChipCanvas.flipVertically);
		this.dragOnSelectionButton1.addEventListener("click", this._extendSelectionPressed);
		this.dragOnSelectionButton2.addEventListener("click", this._stretchSelectionPressed);
		this.curveModeStepText.style.display = "none";
		this.removeSelectionButton.style.display = "none";
		this.dragOnSelectionButton1.style.display = "none";
		this.dragOnSelectionButton2.style.display = "none";

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

	private _removeSelection = (): void => {
		this.customChipCanvas.clearSelection();
		this._songEditor.refocusStage();
	}

	private _selectStandardDrawType = (): void => {
		this._drawType_Standard.classList.add("selected-instrument");
		this._drawType_Line.classList.remove("selected-instrument");
		this._drawType_Curve.classList.remove("selected-instrument");
		this._drawType_Selection.classList.remove("selected-instrument");
		this.customChipCanvas.drawMode = DrawMode.Standard;
		this.customChipCanvas.clearSelection();
		this.curveModeStepText.style.display = "none";
		this.dragOnSelectionButton1.style.display = "none";
		this.dragOnSelectionButton2.style.display = "none";
	}

	private _selectLineDrawType = (): void => {
		this._drawType_Standard.classList.remove("selected-instrument");
		this._drawType_Line.classList.add("selected-instrument");
		this._drawType_Curve.classList.remove("selected-instrument");
		this._drawType_Selection.classList.remove("selected-instrument");
		this.customChipCanvas.drawMode = DrawMode.Line;
		this.customChipCanvas.clearSelection();
		this.curveModeStepText.style.display = "none";
		this.dragOnSelectionButton1.style.display = "none";
		this.dragOnSelectionButton2.style.display = "none";
	}

	private _selectCurveDrawType = (): void => {
		this._drawType_Standard.classList.remove("selected-instrument");
		this._drawType_Line.classList.remove("selected-instrument");
		this._drawType_Curve.classList.add("selected-instrument");
		this._drawType_Selection.classList.remove("selected-instrument");
		if (this.customChipCanvas.drawMode != DrawMode.Curve) this.customChipCanvas.curveModeStep = CurveModeStep.First;
		this.customChipCanvas.drawMode = DrawMode.Curve;
		this.customChipCanvas.clearSelection();
		this.curveModeStepText.style.display = "";
		this.curveModeStepText.textContent = getCurveModeStepMessage(this.customChipCanvas.curveModeStep);
		this.dragOnSelectionButton1.style.display = "none";
		this.dragOnSelectionButton2.style.display = "none";
	}

	private _selectSelectionDrawType = (): void => {
		this._drawType_Standard.classList.remove("selected-instrument");
		this._drawType_Line.classList.remove("selected-instrument");
		this._drawType_Curve.classList.remove("selected-instrument");
		this._drawType_Selection.classList.add("selected-instrument");
		this.customChipCanvas.drawMode = DrawMode.Selection;
		this.customChipCanvas.clearSelection();
		this.curveModeStepText.style.display = "none";
		this.dragOnSelectionButton1.style.display = "";
		this.dragOnSelectionButton2.style.display = "none";
	}

	private _close = (): void => {
		this._doc.prompt = null;
		this._doc.undo();
	}

	public cleanUp = (): void => {
		this.customChipCanvas.cleanUp();
		this._okayButton.removeEventListener("click", this._saveChanges);
		this._cancelButton.removeEventListener("click", this._close);
		this.container.removeEventListener("keydown", this.whenKeyPressed);
		this.copyButton.removeEventListener("click", this._copySettings);
		this.pasteButton.removeEventListener("click", this._pasteSettings);
		this.loadWaveformPresetSelect.removeEventListener("change", this._customWavePresetHandler);
		this.randomizeButton.removeEventListener("click", this._decideRandomization);
		this._playButton.removeEventListener("click", this._togglePlay);
		this._drawType_Standard.removeEventListener("click", this._selectStandardDrawType);
		this._drawType_Line.removeEventListener("click", this._selectLineDrawType);
		this._drawType_Curve.removeEventListener("click", this._selectCurveDrawType);
		this._drawType_Selection.removeEventListener("click", this._selectSelectionDrawType);
		this.removeSelectionButton.removeEventListener("click", this._removeSelection);
		this._flipHorizontalButton.removeEventListener("click", this.customChipCanvas.flipHorizontally);
		this._flipVerticalButton.removeEventListener("click", this.customChipCanvas.flipVertically);
	}

	private _copySettings = (): void => {
		this.customChipCanvas.copy();
	}
	private _pasteSettings = (): void => {
		this.customChipCanvas.paste();
	}
	
	private _extendSelectionPressed = (): void => {
		this.dragOnSelectionButton1.style.display = "none";
		this.dragOnSelectionButton2.style.display = "";
		this.customChipCanvas.selectionDragEvent = SelectionDragEvent.Stretching;
		this._songEditor.refocusStage();
	}
	private _stretchSelectionPressed = (): void => {
		this.dragOnSelectionButton1.style.display = "";
		this.dragOnSelectionButton2.style.display = "none";
		this.customChipCanvas.selectionDragEvent = SelectionDragEvent.Extending;
		this._songEditor.refocusStage();
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
		this.customChipCanvas.curveModeStep = CurveModeStep.First;
		this.curveModeStepText.textContent = getCurveModeStepMessage(this.customChipCanvas.curveModeStep);
        this.loadWaveformPresetSelect.selectedIndex = 0;
    }

	private _decideRandomization = (): void => {
		if (this.customChipCanvas.drawMode != DrawMode.Selection || this.customChipCanvas.selectionModeStep == SelectionModeStep.NoSelection) {
			this.customChipCanvas._randomizeCustomChip();
		} else {
			this.customChipCanvas._randomizeSelection();
		}
		this.curveModeStepText.textContent = getCurveModeStepMessage(this.customChipCanvas.curveModeStep);
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
		else if (event.keyCode == 82) { // r
			this._decideRandomization();
		  	event.stopPropagation();
		}
		else if (event.keyCode == 67) { // c
			this.customChipCanvas.copy();
			event.stopPropagation();
	  	}
		else if (event.keyCode == 86) { // v
			this.customChipCanvas.paste();
			event.stopPropagation();
	  	}
		else if (event.keyCode == 72) { // h
			this.customChipCanvas.flipHorizontally();
			event.stopPropagation();
		}
		else if (event.keyCode == 78) { // n
			this.customChipCanvas.flipVertically();
			event.stopPropagation();
		}
		else if (event.keyCode == 49) { // 1
			this._selectStandardDrawType();
			event.stopPropagation();
	  	}
		else if (event.keyCode == 50) { // 2
			this._selectLineDrawType();
			event.stopPropagation();
	  	}
		else if (event.keyCode == 51) { // 3
			this._selectCurveDrawType();
			event.stopPropagation();
	  	}
		else if (event.keyCode == 52) { // 4
			this._selectSelectionDrawType();
			event.stopPropagation();
	  	}
		else if (event.keyCode == 27) { // esc
			// Pointed out to me. This is the standard keybind for getting rid of selections.
			event.stopPropagation();
			if (this.customChipCanvas.selectionModeStep != SelectionModeStep.NoSelection) {
				this.customChipCanvas.clearSelection();
			} else {
				this._close();
			}
		}
	}

	private _saveChanges = (): void => {
		this._doc.prompt = null;
		// Restore custom chip to starting values
		new ChangeCustomWave(this._doc, this.customChipCanvas.startingChipData);
		this._doc.record(new ChangeCustomWave(this._doc, this.customChipCanvas.chipData), true);
	}
}