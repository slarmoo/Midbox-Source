// Copyright (C) 2020 John Nesky, distributed under the MIT license.

import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";
import { Prompt } from "./Prompt";
import { SongDocument } from "./SongDocument";
import { ColorConfig } from "./ColorConfig";
import { ChangeCustomWave } from "./changes";
import { SongEditor } from "./SongEditor";
import { Localization as _ } from "./Localization";

//namespace beepbox {
const { button, div, h2 } = HTML;

export class CustomChipPromptCanvas {
	private readonly _doc: SongDocument;
	public drawMode: number = 0;
	private _mouseX: number = 0;
	private _mouseY: number = 0;
	private _markedMouseX: number = 0;
	private _markedMouseY: number = 0;
	private _markedMouseXEnd: number = 0;
	private _markedMouseYEnd: number = 0;
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

	constructor(doc: SongDocument) {

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
		if (this.drawMode == 1) {
			this._markedMouseX = this._mouseX;
			this._markedMouseY = this._mouseY;
			for (let i = 0; i < 64; i++) this.temporaryArray[i] = this.chipData[i];
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

		this._whenCursorMoved();
	}

	private _whenMouseMoved = (event: MouseEvent): void => {
		if (this.container.offsetParent == null) return;
		const boundingRect: ClientRect = this._svg.getBoundingClientRect();
		this._mouseX = ((event.clientX || event.pageX) - boundingRect.left) * this._editorWidth / (boundingRect.right - boundingRect.left);
		this._mouseY = ((event.clientY || event.pageY) - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
		if (isNaN(this._mouseX)) this._mouseX = 0;
		if (isNaN(this._mouseY)) this._mouseY = 0;
		if (this.drawMode == 1 && this._mouseDown) {
			this._markedMouseXEnd = this._mouseX;
			this._markedMouseYEnd = this._mouseY;
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
		this._whenCursorMoved();
	}

	private _whenCursorMoved(): void {
		if (this._mouseDown) {
			const index: number = Math.min(63, Math.max(0, Math.floor(this._mouseX * 64 / this._editorWidth)));
			const amp: number = Math.min(48, Math.max(0, Math.floor(this._mouseY * 49 / this._editorHeight)));

			// Paint between mouse drag indices unless a click just happened.
			if (this.drawMode == 0) {
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
			} else if (this.drawMode == 1) {
				for (let i = 0; i < 64; i++) {
 					this.chipData[i] = this.temporaryArray[i];
					this._blocks.children[i].setAttribute("y", "" + ((this.temporaryArray[i] + 24) * (this._editorHeight / 49)));
				}
				let lowest: number = Math.min(63, Math.max(0, Math.floor(this._markedMouseX * 64 / this._editorWidth)));
				let startingAmp: number = Math.min(48, Math.max(0, Math.floor(this._markedMouseY * 49 / this._editorHeight)));
				let highest: number = Math.min(63, Math.max(0, Math.floor(this._markedMouseXEnd * 64 / this._editorWidth)));
				let endingAmp: number = Math.min(48, Math.max(0, Math.floor(this._markedMouseYEnd * 49 / this._editorHeight)));
				if (highest != lowest) {
					if (highest < lowest) {
						lowest = highest;
						highest = lowest;
						startingAmp = endingAmp;
						endingAmp = startingAmp;
					}
					for (var i = lowest; i <= highest; i++) {
						const medAmp: number = Math.round(startingAmp + (endingAmp - startingAmp) * ((i - lowest) / (highest - lowest)));
						this.temporaryArray[i] = medAmp - 24;
						this._blocks.children[i].setAttribute("y", "" + (medAmp * (this._editorHeight / 49)));
					}
				}
				else {
					this.temporaryArray[lowest] = startingAmp - 24;
					this._blocks.children[lowest].setAttribute("y", "" + (startingAmp * (this._editorHeight / 49)));
				}
			} else throw new Error("Unknown draw mode selected.");

			// Make a change to the data but don't record it, since this prompt uses its own undo/redo queue
			new ChangeCustomWave(this._doc, this.chipData);

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

export class CustomChipPrompt implements Prompt {

	public customChipCanvas: CustomChipPromptCanvas = new CustomChipPromptCanvas(this._doc);

	public readonly _playButton: HTMLButtonElement = button({ style: "width: 55%;", type: "button" });

	public readonly _drawType_Standard: HTMLButtonElement = button({ style: "border-radius: 0px; width: 65px; height 50px;"}, [
		// Cursor icon:
		SVG.svg({ class: "no-underline", style: "flex-shrink: 0; position: absolute; top: 4px; left: 24px; pointer-events: none;", width: "16", height: "16", viewBox: "0 0 16 16" }, [
			SVG.path({ d: "M14.082 2.182a.5.5 0 0 1 .103.557L8.528 15.467a.5.5 0 0 1-.917-.007L5.57 10.694.803 8.652a.5.5 0 0 1-.006-.916l12.728-5.657a.5.5 0 0 1 .556.103z", fill: "currentColor" }),
		]),
	]);
	public readonly _drawType_Line: HTMLButtonElement = button({ style: "border-radius: 0px; width: 65px; height 50px;"}, [
		// Line icon:
		SVG.svg({ class: "no-underline", style: "flex-shrink: 0; position: absolute; top: 4px; left: 24px; pointer-events: none;", width: "16", height: "16", viewBox: "0 0 16 16" }, [
			SVG.path({ d: "M14 2.5a.5.5 0 0 0-.5-.5h-6a.5.5 0 0 0 0 1h4.793L2.146 13.146a.5.5 0 0 0 .708.708L13 3.707V8.5a.5.5 0 0 0 1 0z", fill: "currentColor" }),
		]),
	]);
	public readonly _drawType_Selection: HTMLButtonElement = button({ style: "border-radius: 0px; width: 65px; height 50px;"}, [
		// Dotted-outline box icon:
		SVG.svg({ class: "no-underline", style: "flex-shrink: 0; position: absolute; top: 4px; left: 24px; pointer-events: none;", width: "16", height: "16", viewBox: "0 0 16 16" }, [
			SVG.path({ d: "M2.5 0q-.25 0-.487.048l.194.98A1.5 1.5 0 0 1 2.5 1h.458V0zm2.292 0h-.917v1h.917zm1.833 0h-.917v1h.917zm1.833 0h-.916v1h.916zm1.834 0h-.917v1h.917zm1.833 0h-.917v1h.917zM13.5 0h-.458v1h.458q.151 0 .293.029l.194-.981A2.5 2.5 0 0 0 13.5 0m2.079 1.11a2.5 2.5 0 0 0-.69-.689l-.556.831q.248.167.415.415l.83-.556zM1.11.421a2.5 2.5 0 0 0-.689.69l.831.556c.11-.164.251-.305.415-.415zM16 2.5q0-.25-.048-.487l-.98.194q.027.141.028.293v.458h1zM.048 2.013A2.5 2.5 0 0 0 0 2.5v.458h1V2.5q0-.151.029-.293zM0 3.875v.917h1v-.917zm16 .917v-.917h-1v.917zM0 5.708v.917h1v-.917zm16 .917v-.917h-1v.917zM0 7.542v.916h1v-.916zm15 .916h1v-.916h-1zM0 9.375v.917h1v-.917zm16 .917v-.917h-1v.917zm-16 .916v.917h1v-.917zm16 .917v-.917h-1v.917zm-16 .917v.458q0 .25.048.487l.98-.194A1.5 1.5 0 0 1 1 13.5v-.458zm16 .458v-.458h-1v.458q0 .151-.029.293l.981.194Q16 13.75 16 13.5M.421 14.89c.183.272.417.506.69.689l.556-.831a1.5 1.5 0 0 1-.415-.415zm14.469.689c.272-.183.506-.417.689-.69l-.831-.556c-.11.164-.251.305-.415.415l.556.83zm-12.877.373Q2.25 16 2.5 16h.458v-1H2.5q-.151 0-.293-.029zM13.5 16q.25 0 .487-.048l-.194-.98A1.5 1.5 0 0 1 13.5 15h-.458v1zm-9.625 0h.917v-1h-.917zm1.833 0h.917v-1h-.917zm1.834-1v1h.916v-1zm1.833 1h.917v-1h-.917zm1.833 0h.917v-1h-.917zM8.5 4.5a.5.5 0 0 0-1 0v3h-3a.5.5 0 0 0 0 1h3v3a.5.5 0 0 0 1 0v-3h3a.5.5 0 0 0 0-1h-3z", fill: "currentColor" }),
		]),
	]);
	private readonly drawToolsContainer: HTMLDivElement = div({ class: "instrument-bar", style: "margin-left: 66px; display: grid; grid-template-columns: repeat(3, 70px); grid-gap: 2px 0px; width: 270px;" }, this._drawType_Standard, this._drawType_Line, this._drawType_Selection);

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
		this._playButton.addEventListener("click", this._togglePlay);
		this.updatePlayButton();
		this._drawType_Standard.addEventListener("click", this._selectStandardDrawType);
		this._drawType_Line.addEventListener("click", this._selectLineDrawType);
		this._drawType_Selection.addEventListener("click", this._selectSelectionDrawType);

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
		this._drawType_Selection.classList.remove("selected-instrument");
		this.customChipCanvas.drawMode = 0;
	}

	private _selectLineDrawType = (): void => {
		this._drawType_Standard.classList.remove("selected-instrument");
		this._drawType_Line.classList.add("selected-instrument");
		this._drawType_Selection.classList.remove("selected-instrument");
		this.customChipCanvas.drawMode = 1;
	}

	private _selectSelectionDrawType = (): void => {
		this._drawType_Standard.classList.remove("selected-instrument");
		this._drawType_Line.classList.remove("selected-instrument");
		this._drawType_Selection.classList.add("selected-instrument");
		this.customChipCanvas.drawMode = 2;
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
	}

	private _saveChanges = (): void => {
		this._doc.prompt = null;
		// Restore custom chip to starting values
		new ChangeCustomWave(this._doc, this.customChipCanvas.startingChipData);
		this._doc.record(new ChangeCustomWave(this._doc, this.customChipCanvas.chipData), true);
	}
}
//}
