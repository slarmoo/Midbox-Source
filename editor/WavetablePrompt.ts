// Copyright (C) 2020 John Nesky, distributed under the MIT license.

import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";
import { Prompt } from "./Prompt";
import { SongDocument } from "./SongDocument";
import { ColorConfig } from "./ColorConfig";
import { ChangeWavetableCustomWave, ChangeCycleWaves } from "./changes";
import { SongEditor } from "./SongEditor";
import { Localization as _ } from "./Localization";

//namespace beepbox {
const { button, div, h2 } = HTML;

export class WavetablePromptCanvas {
	private readonly _doc: SongDocument;
	private _mouseX: number = 0;
	private _mouseY: number = 0;
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

	wavetableIndex: number;

	constructor(doc: SongDocument, wavetableIndex: number) {

		this._doc = doc;
		this.wavetableIndex = wavetableIndex;

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
			let val: number = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].wavetableWaves[this.wavetableIndex][i];
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
			new ChangeWavetableCustomWave(this._doc, this.chipData, this.wavetableIndex);
			this.render();
		}

	}

	public redo = (): void => {
		// Go forward, if there is a change to go to
		if (this._undoHistoryState > 0) {
			this._undoHistoryState--;
			this.chipData = this._changeQueue[this._undoHistoryState].slice();
			new ChangeWavetableCustomWave(this._doc, this.chipData, this.wavetableIndex);
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

		this._whenCursorMoved();
	}

	private _whenMouseMoved = (event: MouseEvent): void => {
		if (this.container.offsetParent == null) return;
		const boundingRect: ClientRect = this._svg.getBoundingClientRect();
		this._mouseX = ((event.clientX || event.pageX) - boundingRect.left) * this._editorWidth / (boundingRect.right - boundingRect.left);
		this._mouseY = ((event.clientY || event.pageY) - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
		if (isNaN(this._mouseX)) this._mouseX = 0;
		if (isNaN(this._mouseY)) this._mouseY = 0;
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
		this._whenCursorMoved();
	}

	private _whenCursorMoved(): void {
		if (this._mouseDown) {
			const index: number = Math.min(63, Math.max(0, Math.floor(this._mouseX * 64 / this._editorWidth)));
			const amp: number = Math.min(48, Math.max(0, Math.floor(this._mouseY * 49 / this._editorHeight)));

			// Paint between mouse drag indices unless a click just happened.
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


			// Make a change to the data but don't record it, since this prompt uses its own undo/redo queue
			new ChangeWavetableCustomWave(this._doc, this.chipData, this.wavetableIndex);

			this._lastIndex = index;
			this._lastAmp = amp;

		}
	}

	private _whenCursorReleased = (event: Event): void => {
		// Add current data into queue, if it is unique from last data
		this._storeChange();
		this._mouseDown = false;
	}

	public render(): void {
		for (var i = 0; i < 64; i++) {
			this._blocks.children[i].setAttribute("y", "" + ((this.chipData[i] + 24) * (this._editorHeight / 49)));
		}
	}
}

export class WavetablePrompt implements Prompt {

	public wavetableCanvas: WavetablePromptCanvas = new WavetablePromptCanvas(this._doc, this._songEditor._wavetableIndex);

	public readonly _playButton: HTMLButtonElement = button({ style: "width: 55%;", type: "button" });

	private readonly _cancelButton: HTMLButtonElement = button({ class: "cancelButton" });
	private readonly _okayButton: HTMLButtonElement = button({ class: "okayButton", style: "width:45%;" }, _.confirmLabel);

	private readonly copyButton: HTMLButtonElement = button({ style: "width:86px; margin-right: 5px;", class: "copyButton" }, [
		_.copyLabel,
		// Copy icon:
		SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;", width: "2em", height: "2em", viewBox: "-5 -21 26 26" }, [
			SVG.path({ d: "M 0 -15 L 1 -15 L 1 0 L 13 0 L 13 1 L 0 1 L 0 -15 z M 2 -1 L 2 -17 L 10 -17 L 14 -13 L 14 -1 z M 3 -2 L 13 -2 L 13 -12 L 9 -12 L 9 -16 L 3 -16 z", fill: "currentColor" }),
		]),
	]);
	private readonly pasteButton: HTMLButtonElement = button({ style: "width:86px;", class: "pasteButton" }, [
		_.pasteLabel,
		// Paste icon:
		SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 0; top: 50%; margin-top: -1em; pointer-events: none;", width: "2em", height: "2em", viewBox: "0 0 26 26" }, [
			SVG.path({ d: "M 8 18 L 6 18 L 6 5 L 17 5 L 17 7 M 9 8 L 16 8 L 20 12 L 20 22 L 9 22 z", stroke: "currentColor", fill: "none" }),
			SVG.path({ d: "M 9 3 L 14 3 L 14 6 L 9 6 L 9 3 z M 16 8 L 20 12 L 16 12 L 16 8 z", fill: "currentColor", }),
		]),
	]);
	private readonly copyPasteContainer: HTMLDivElement = div({ style: "width: 185px;" }, this.copyButton, this.pasteButton);

	public readonly _wavetableWaveButtons: HTMLButtonElement[] = [];
	public readonly _wavetableWaveButtonContainer: HTMLDivElement = div({class: "instrument-bar", style: "justify-content: center;"});

	public readonly _cycleEditorButtons: HTMLButtonElement[] = [];
	public readonly _cycleEditorButtonContainer: HTMLDivElement = div({class: "instrument-bar", style: "justify-content: center;"});
	public _buttonOn: Boolean[] = [];

	public readonly container: HTMLDivElement = div({ class: "prompt noSelection", style: "width: 600px;" },
		h2("Edit Wavetable Waves"),
		div({ style: "display: flex; width: 55%; align-self: center; flex-direction: row; align-items: center; justify-content: center;" },
			this._playButton,
		),
		this._wavetableWaveButtonContainer,
		this._cycleEditorButtonContainer,
		div({ style: "display: flex; flex-direction: row; align-items: center; justify-content: center;" },
			this.wavetableCanvas.container,
		),
		div({ style: "display: flex; flex-direction: row-reverse; justify-content: space-between;" },
			this._okayButton,
			this.copyPasteContainer,
		),
		this._cancelButton,
	);

	public startingCurrentCycle: number[];
	public cycle = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].currentCycle;

	constructor(private _doc: SongDocument, private _songEditor: SongEditor) {

		this._okayButton.addEventListener("click", this._saveChanges);
		this._cancelButton.addEventListener("click", this._close);
		this.container.addEventListener("keydown", this.whenKeyPressed);
		this.copyButton.addEventListener("click", this._copySettings);
		this.pasteButton.addEventListener("click", this._pasteSettings);
		this._playButton.addEventListener("click", this._togglePlay);
		this.updatePlayButton();

		let colors = ColorConfig.getChannelColor(this._doc.song, this._doc.channel);

		for (let i: number = 0; i < 32; i++) {
			let newSubButton: HTMLButtonElement = button({ class: "no-underline", style: "font-size: 92%; max-width: 2em;"}, "" + (i + 1));
			this._wavetableWaveButtons.push(newSubButton);
			this._wavetableWaveButtonContainer.appendChild(newSubButton);
			newSubButton.addEventListener("click", () => { this._changeWavetableIndex(i); });
		}
		this._wavetableWaveButtons[31].classList.add("last-button");
		this._wavetableWaveButtons[this._songEditor._wavetableIndex].classList.add("selected-instrument");

		this._wavetableWaveButtonContainer.style.setProperty("--text-color-lit", colors.primaryNote);
		this._wavetableWaveButtonContainer.style.setProperty("--text-color-dim", colors.secondaryNote);
		this._wavetableWaveButtonContainer.style.setProperty("--background-color-lit", colors.primaryChannel);
		this._wavetableWaveButtonContainer.style.setProperty("--background-color-dim", colors.secondaryChannel);

		const instrument = _doc.song.channels[_doc.channel].instruments[_doc.getCurrentInstrument()];
		this.startingCurrentCycle = instrument.currentCycle;

		let cycle = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].currentCycle;
		for (let i: number = 0; i < 32; i++) this._buttonOn.push(false);
		for (let i: number = 0; i < cycle.length; i++) this._buttonOn[cycle[i]] = true;

		for (let i: number = 0; i < 32; i++) {
			let newSubButton: HTMLButtonElement = button({ class: "no-underline", style: "font-size: 130%; max-width: 2em;"}, "●");
			this._cycleEditorButtons.push(newSubButton);
			this._cycleEditorButtonContainer.appendChild(newSubButton);
			newSubButton.addEventListener("click", () => { this._changeCycleEditorButton(i); });
		}
		this._cycleEditorButtons[31].classList.add("last-button");

		setTimeout(() => this._playButton.focus());

		this.wavetableCanvas.render();
	}

	private _changeWavetableIndex = (index: number): void => {
		this._wavetableWaveButtons[this.wavetableCanvas.wavetableIndex].classList.remove("selected-instrument");
		this.wavetableCanvas.wavetableIndex = index;
		for (let i: number = 0; i < 64; i++) {
			let val: number = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].wavetableWaves[index][i];
			this.wavetableCanvas.chipData[i] = val;
		}
		this.wavetableCanvas._storeChange();
		this.wavetableCanvas.render();
		this._wavetableWaveButtons[index].classList.add("selected-instrument");
	}

	private _changeCycleEditorButton = (index: number): void => {
		if (this._buttonOn[index] == true) {
			this._buttonOn[index] = false;
		} else {
			this._buttonOn[index] = true;
		}
		this._cycleEditorButtons[index].innerHTML = (this._buttonOn[index]) ? "●" : "○";
		this.wavetableCanvas._storeChange();
		this.cycle = [];
		this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].currentCycle = this.cycle;
		for (let i: number = 0; i < this._buttonOn.length; i++) {
			if (this._buttonOn[i]) {
				this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].currentCycle.push(i);
			}
		}
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
		const chipCopy: Float32Array = this.wavetableCanvas.chipData
		window.localStorage.setItem("chipCopy", JSON.stringify(Array.from(chipCopy)));
	}

	private _pasteSettings = (): void => {

		const storedChipWave: any = JSON.parse(String(window.localStorage.getItem("chipCopy")));
		for (let i: number = 0; i < 64; i++) {
    	this.wavetableCanvas.chipData[i] = storedChipWave[i];
		}
		this.wavetableCanvas._storeChange();
		new ChangeWavetableCustomWave(this._doc, this.wavetableCanvas.chipData, this.wavetableCanvas.wavetableIndex);
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
			this.wavetableCanvas.undo();
			event.stopPropagation();
		}
		else if (event.keyCode == 89) { // y
			this.wavetableCanvas.redo();
			event.stopPropagation();
		}
		else if (event.keyCode == 219) { // [
			this._doc.synth.goToPrevBar();
		}
		else if (event.keyCode == 221) { // ]
			this._doc.synth.goToNextBar();
		}
	}

	private _saveChanges = (): void => {
		this._doc.prompt = null;
		// Restore wavetable to starting values
		new ChangeWavetableCustomWave(this._doc, this.wavetableCanvas.startingChipData, this.wavetableCanvas.wavetableIndex);
		this._doc.record(new ChangeWavetableCustomWave(this._doc, this.wavetableCanvas.chipData, this.wavetableCanvas.wavetableIndex), true);
		new ChangeCycleWaves(this._doc, this.startingCurrentCycle);
		this._doc.record(new ChangeCycleWaves(this._doc, this.cycle));
	}
}
