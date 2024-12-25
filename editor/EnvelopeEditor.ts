// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import {InstrumentType, Config, DropdownID} from "../synth/SynthConfig";
import {Instrument, EnvelopeComputer, LFOShapes} from "../synth/synth";
import {ColorConfig} from "./ColorConfig";
import {SongDocument} from "./SongDocument";
import {ChangeSetEnvelopeTarget, ChangeSetEnvelopeType, ChangeRemoveEnvelope, ChangeEnvelopeOrder, ChangePerEnvelopeSpeed, ChangeDiscreteEnvelope, ChangeLowerBound, ChangeUpperBound, ChangeEnvelopeDelay, ChangePitchEnvelopeStart, ChangePitchEnvelopeEnd, ChangePitchAmplify, ChangePitchBounce, ChangeEnvelopePosition, ChangeMeasurementType, ChangeClapMirrorAmount, ChangeLFOEnvelopeShape, ChangeEnvelopeAccelerationEnabled, ChangeEnvelopeLooping, ChangeEnvelopeIgnorance, ChangeEnvelopeAcceleration, ChangeLFOEnvelopePulseWidth, ChangeLFOEnvelopeTrapezoidRatio, ChangeLFOEnvelopeStairsStepAmount, ChangePasteEnvelope, RandomEnvelope} from "./changes";
import {HTML, SVG} from "imperative-html/dist/esm/elements-strict";
import {Localization as _} from "./Localization";
import {clamp, remap} from "./UsefulCodingStuff";
import {Change} from "./Change";

const {div, span, canvas, option, input, button, select} = HTML;

function buildOptions(menu: HTMLSelectElement, items: ReadonlyArray<string | number>): HTMLSelectElement {
    for (let index: number = 0; index < items.length; index++) {
        menu.appendChild(option({ value: index }, items[index]));
    }
    return menu;
}

export class EnvelopeLineGraph {
	public range: number = 4;

    constructor(public readonly canvas: HTMLCanvasElement, private readonly _doc: SongDocument, public index: number, public forDrumset: boolean) {
		this.render();
    }

	private _drawCanvas(graphX: number, graphY: number, graphWidth: number, graphHeight: number): void {
		const envelopeGraph: number[] = [];
		let instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
		
		let instEnv;
		let envelope;
		if (this.forDrumset) {
			instEnv = instrument.drumsetEnvelopes[this.index];
			envelope = Config.drumsetEnvelopes[instEnv.envelope];
		} else {
			instEnv = instrument.envelopes[this.index];
			envelope = Config.envelopes[instEnv.envelope];
		}
		let speed: number = instEnv.envelopeSpeed;
		let delay: number = instEnv.delay;
		let LFOStepAmount: number = instEnv.LFOSettings.LFOStepAmount;
		const beatsPerTick: number = 1.0 / (Config.ticksPerPart * Config.partsPerBeat);
		const beatsPerMinute: number = this._doc.song != null ? this._doc.song.getBeatsPerMinute() : 0;
        const beatsPerSecond: number = beatsPerMinute / 60.0;
        const partsPerSecond: number = Config.partsPerBeat * beatsPerSecond;
        const tickPerSecond: number = Config.ticksPerPart * partsPerSecond;
        const samplesPerTick: number = this._doc.synth.samplesPerSecond / tickPerSecond;
		const secondsPerTick: number = samplesPerTick / this._doc.synth.samplesPerSecond;
		let xAxisIsInSeconds: boolean = instEnv.measurementType === false;
		let timeRangeInBeats: number = this.range;
		let timeRangeInSeconds: number = this.range / beatsPerTick * secondsPerTick;
		let delayInBeats: number = delay * speed;
		let delayInSeconds: number = delayInBeats / beatsPerTick * secondsPerTick;
		if (xAxisIsInSeconds) {
			timeRangeInBeats = this.range / secondsPerTick * beatsPerTick;
			timeRangeInSeconds = this.range;
			delayInSeconds = delay * speed;
			delayInBeats = delayInSeconds / secondsPerTick * beatsPerTick;
		}
		let qualitySteps: number = 300;
		let minValue = -0.1;
      	let maxValue = -Infinity;
		for (let i: number = 0; i < qualitySteps; i++) {
			const x: number = i / (qualitySteps - 1);
			const seconds: number = (x * timeRangeInSeconds) * speed;
			const beats: number = (x * timeRangeInBeats) * speed;
			const beatNote: number = (x * timeRangeInBeats) * speed;
			const noteSize: number = (1 - x) * Config.noteSizeMax;
			const pitch: number = 1;
			let value = EnvelopeComputer.computeEnvelope(envelope, seconds, beats, beatNote, noteSize, instEnv.lowerBound, instEnv.upperBound, delayInBeats, delayInSeconds, 0, 0, pitch, instEnv.mirrorAmount, instEnv.LFOSettings.LFOShape, instEnv.LFOSettings.LFOAllowAccelerate ? instEnv.LFOSettings.LFOAcceleration : 1, instEnv.LFOSettings.LFOLoopOnce, instEnv.LFOSettings.LFOIgnorance, instEnv.LFOSettings.LFOPulseWidth * 5, instEnv.LFOSettings.LFOTrapezoidRatio, LFOStepAmount);
			envelopeGraph.push(value);
			maxValue = Math.max(value, maxValue);
        	minValue = Math.min(value, minValue);
		}

		var ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
		ctx.clearRect(0, 0, graphWidth, graphHeight);

		// Draw background.
		ctx.fillStyle = ColorConfig.getComputed("--editor-background");
        ctx.fillRect(0, 0, graphX, graphY);

		// Proceed to draw envelope graph.
		ctx.fillStyle = ColorConfig.getComputed("--loop-accent");
		ctx.strokeStyle = ColorConfig.getChannelColor(this._doc.song, this._doc.channel).primaryChannel;
		ctx.beginPath();
		for (let i: number = 0; i < qualitySteps; i++) {
			const value: number = envelopeGraph[i];
			const x = graphX + remap(i, 0, qualitySteps - 1, 0, graphWidth);
			const y = (graphY + remap(value, minValue, maxValue, graphHeight, 0)) * 1.1;
			if (i == 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.lineWidth = 2.5;
		ctx.stroke();
	}

	public render() {
		this._drawCanvas(0, 0, this.canvas.width, this.canvas.height);
	}
}

export class EnvelopeStartLine {
	// MID TODO: Merge this with the EnvelopeLineGraph class.
	public timeRange: number = 4;

    constructor(public readonly canvas: HTMLCanvasElement, private readonly _doc: SongDocument, public index: number, public forDrumset: boolean) {
		this.render();
    }

	private _drawCanvas(graphX: number, graphY: number, graphWidth: number, graphHeight: number): void {
		let instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
		let instEnv;
		if (this.forDrumset) {
			instEnv = instrument.drumsetEnvelopes[this.index];
		} else {
			instEnv = instrument.envelopes[this.index];
		}
		let speed: number = instEnv.envelopeSpeed;
		let delay: number = instEnv.delay;
		let phase: number = instEnv.phase;
		const beatsPerTick: number = 1.0 / (Config.ticksPerPart * Config.partsPerBeat);
		const beatsPerMinute: number = this._doc.song != null ? this._doc.song.getBeatsPerMinute() : 0;
        const beatsPerSecond: number = beatsPerMinute / 60.0;
        const partsPerSecond: number = Config.partsPerBeat * beatsPerSecond;
        const tickPerSecond: number = Config.ticksPerPart * partsPerSecond;
        const samplesPerTick: number = this._doc.synth.samplesPerSecond / tickPerSecond;
		const secondsPerTick: number = samplesPerTick / this._doc.synth.samplesPerSecond;
		let xAxisIsInSeconds: boolean = instEnv.measurementType === false;
		let delayInBeats: number = delay * speed;
		let delayInSeconds: number = delayInBeats / beatsPerTick * secondsPerTick;
		let phaseInBeats: number = phase;
		let phaseInSeconds: number = phaseInBeats / beatsPerTick * secondsPerTick;
		let positionLine: number = Math.max(0, (phaseInBeats + delayInBeats));
		let timeRange: number = this.timeRange * speed;
		if (xAxisIsInSeconds) {
			delayInSeconds = delay * speed;
			delayInBeats = delayInSeconds / secondsPerTick * beatsPerTick;
			phaseInSeconds = phase;
			phaseInBeats = phaseInSeconds / secondsPerTick * beatsPerTick;
			positionLine = Math.max(0, (phaseInSeconds + delayInSeconds));
		}

		var ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
		ctx.clearRect(0, 0, graphWidth, graphHeight);

		// Draw background.
        ctx.fillRect(0, 0, graphX, graphY);

		ctx.strokeStyle = ColorConfig.getComputed("--playhead");
		ctx.fillStyle = ColorConfig.getComputed("--playhead");

		// Draw line.
		ctx.beginPath();
		ctx.setLineDash([2, 2]);
		let x = graphX + remap(positionLine, 0, timeRange, 0, graphWidth);
		let y = graphY;
		ctx.moveTo(x, y);
		x = graphX + remap(positionLine, 0, timeRange, 0, graphWidth);
		y = graphY + graphHeight;
		ctx.lineTo(x, y);
		
		ctx.lineWidth = 3;
		ctx.stroke();

		// Draw a triangle mark at the top.
		const triangleWidth: number = 12;
		const halfTriangleWidth: number = triangleWidth / 2;
		const triangleHeight: number = 14;
		y = graphY + triangleHeight;
		ctx.setLineDash([]);
		ctx.beginPath();
		ctx.moveTo(x - halfTriangleWidth, y - triangleHeight);
		ctx.lineTo(x + halfTriangleWidth, y - triangleHeight);
		ctx.lineTo(x, y);
		ctx.fill();
	}

	public render() {
		this._drawCanvas(0, 0, this.canvas.width, this.canvas.height);
	}
}

export class EnvelopeEditor {
	public readonly container: HTMLElement = div({class: "envelopeEditor"});
	
	// Everything must be declared as arrays for each envelope
	// Properly given styles and what not in render()
	private readonly _rows: HTMLDivElement[] = [];
	private readonly _envelopePlotters: EnvelopeLineGraph[] = [];
	private readonly _envelopeStartPlotterLines: EnvelopeStartLine[] = [];
	private readonly _envelopePlotterRows: HTMLElement[] = [];
	private readonly _plotterTimeRangeInputBoxes: HTMLInputElement[] = [];
	private readonly _plotterTimeRangeRows: HTMLElement[] = [];
	private readonly _perEnvelopeSpeedSliders: HTMLInputElement[] = [];
	private readonly _perEnvelopeSpeedInputBoxes: HTMLInputElement[] = [];
	private readonly _perEnvelopeSpeedRows: HTMLElement[] = [];
	private readonly _discreteEnvelopeToggles: HTMLInputElement[] = [];
	private readonly _discreteEnvelopeRows: HTMLElement[] = [];
	private readonly _lowerBoundSliders: HTMLInputElement[] = [];
	private readonly _upperBoundSliders: HTMLInputElement[] = [];
	private readonly _lowerBoundInputBoxes: HTMLInputElement[] = [];
	private readonly _upperBoundInputBoxes: HTMLInputElement[] = [];
	private readonly _lowerBoundRows: HTMLElement[] = [];
	private readonly _upperBoundRows: HTMLElement[] = [];
	private readonly _envelopeDelaySliders: HTMLInputElement[] = [];
	private readonly _envelopeDelayInputBoxes: HTMLInputElement[] = [];
	private readonly _envelopeDelayRows: HTMLElement[] = [];
	private readonly _pitchStartSliders: HTMLInputElement[] = [];
	private readonly _pitchStartInputBoxes: HTMLInputElement[] = [];
	private readonly _pitchStartNoteTexts: HTMLSpanElement[] = [];
	private readonly _pitchEndSliders: HTMLInputElement[] = [];
	private readonly _pitchEndInputBoxes: HTMLInputElement[] = [];
	private readonly _pitchEndNoteTexts: HTMLSpanElement[] = [];
	private readonly _pitchStartGroups: HTMLElement[] = [];
	private readonly _pitchEndGroups: HTMLElement[] = [];
	private readonly _pitchAmplifyToggles: HTMLInputElement[] = [];
	private readonly _pitchBounceToggles: HTMLInputElement[] = [];
	private readonly _extraPitchSettingRows: HTMLElement[] = [];
	private readonly _envelopePhaseSliders: HTMLInputElement[] = [];
	private readonly _envelopePhaseInputBoxes: HTMLInputElement[] = [];
	private readonly _envelopePhaseRows: HTMLElement[] = [];
	private readonly _measureInSecondButtons: HTMLButtonElement[] = [];
	private readonly _measureInBeatButtons: HTMLButtonElement[] = [];
	private readonly _measurementTypeRows: HTMLElement[] = [];
	private readonly _clapMirrorAmountSliders: HTMLInputElement[] = [];
	private readonly _clapMirrorAmountInputBoxes: HTMLInputElement[] = [];
	private readonly _clapMirrorAmountRows: HTMLElement[] = [];
	private readonly _envelopeCopyButtons: HTMLButtonElement[] = [];
	private readonly _envelopePasteButtons: HTMLButtonElement[] = [];
	private readonly _randomEnvelopeButtons: HTMLButtonElement[] = [];
	private readonly _envelopeMoveUpButtons: HTMLButtonElement[] = [];
	private readonly _envelopeMoveDownButtons: HTMLButtonElement[] = [];
	private readonly _pitchEnvAutoBoundButtons: HTMLButtonElement[] = [];
	private readonly _basicCustomPromptButtons: HTMLButtonElement[] = [];
	private readonly _LFOShapeSelects: HTMLSelectElement[] = [];
	private readonly _LFOShapeRows: HTMLElement[] = [];
	private readonly _LFOEnableAccelerationToggles: HTMLInputElement[] = [];
	private readonly _LFOLoopOnceToggles: HTMLInputElement[] = [];
	private readonly _LFOIgnoranceToggles: HTMLInputElement[] = [];
	private readonly _LFORadioButtonRows: HTMLElement[] = [];
	private readonly _LFOAccelerationSliders: HTMLInputElement[] = [];
	private readonly _LFOAccelerationInputBoxes: HTMLInputElement[] = [];
	private readonly _LFOAccelerationRows: HTMLElement[] = [];
	private readonly _LFOPulseWidthSliders: HTMLInputElement[] = [];
	private readonly _LFOPulseWidthRows: HTMLElement[] = [];
	private readonly _LFOTrapezoidRatioSliders: HTMLInputElement[] = [];
	private readonly _LFOTrapezoidRatioRows: HTMLElement[] = [];
	private readonly _LFOStairsStepAmountSliders: HTMLInputElement[] = [];
	private readonly _LFOStairsStepAmountInputBoxes: HTMLInputElement[] = [];
	private readonly _LFOStairsStepAmountRows: HTMLElement[] = [];
	private readonly _envelopeDropdownGroups: HTMLElement[] = [];
	private readonly _envelopeDropdowns: HTMLButtonElement[] = [];
	private readonly _targetSelects: HTMLSelectElement[] = [];
	private readonly _envelopeSelects: HTMLSelectElement[] = [];
	private readonly _deleteButtons: HTMLButtonElement[] = [];
	private _lastChange: Change | null = null;
	private _renderedEnvelopeCount: number = 0;
	private _renderedEqFilterCount: number = -1;
	private _renderedNoteFilterCount: number = -1;
	private _renderedInstrumentType: InstrumentType;
	private _renderedEffects: number = 0;
	private _openPerEnvelopeDropdowns: boolean[] = [];
	
	constructor(private _doc: SongDocument, private _openPrompt: (name: string, extraStuff?: any) => void) {
		this.container.addEventListener("change", this._onChange);
		this.container.addEventListener("input", this._onInput);
		this.container.addEventListener("click", this._onClick);
		this.container.addEventListener("keydown", this._typingInInput);

		const instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
		for (let envelopeIndex: number = this._rows.length; envelopeIndex < instrument.envelopeCount; envelopeIndex++) {
			this._openPerEnvelopeDropdowns[envelopeIndex] = false;
		}
	}
	
	private _onInput = (event: Event) => {
		const instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];

		// For sliders here, we'll only record the change in _onChange(). Instead, just assign the
		// change class to this._lastChange but don't record yet.
		const plotterTimeRangeInputBoxIndex = this._plotterTimeRangeInputBoxes.indexOf(<any> event.target);
		const perEnvelopeSpeedInputBoxIndex = this._perEnvelopeSpeedInputBoxes.indexOf(<any> event.target);
		const perEnvelopeSpeedSliderIndex = this._perEnvelopeSpeedSliders.indexOf(<any> event.target);
		const discreteEnvelopeToggleIndex = this._discreteEnvelopeToggles.indexOf(<any> event.target);
		const lowerBoundInputBoxIndex = this._lowerBoundInputBoxes.indexOf(<any> event.target);
		const lowerBoundSliderIndex = this._lowerBoundSliders.indexOf(<any> event.target);
		const upperBoundInputBoxIndex = this._upperBoundInputBoxes.indexOf(<any> event.target);
		const upperBoundSliderIndex = this._upperBoundSliders.indexOf(<any> event.target);
		const envelopeDelayInputBoxIndex = this._envelopeDelayInputBoxes.indexOf(<any> event.target);
		const envelopeDelaySliderIndex = this._envelopeDelaySliders.indexOf(<any> event.target);
		const startInputBoxIndex = this._pitchStartInputBoxes.indexOf(<any>event.target);
		const endInputBoxIndex = this._pitchEndInputBoxes.indexOf(<any>event.target);
		const startSliderIndex = this._pitchStartSliders.indexOf(<any>event.target);
		const endSliderIndex = this._pitchEndSliders.indexOf(<any>event.target);
		const pitchAmplifyToggleIndex = this._pitchAmplifyToggles.indexOf(<any> event.target);
		const pitchBounceToggleIndex = this._pitchBounceToggles.indexOf(<any> event.target);
		const envelopePhaseInputBoxIndex = this._envelopePhaseInputBoxes.indexOf(<any> event.target);
		const envelopePhaseSliderIndex = this._envelopePhaseSliders.indexOf(<any> event.target);
		const clapMirrorAmountInputBoxIndex = this._clapMirrorAmountInputBoxes.indexOf(<any> event.target);
		const clapMirrorAmountSliderIndex = this._clapMirrorAmountSliders.indexOf(<any> event.target);
		const LFOEnableAccelerationToggleIndex = this._LFOEnableAccelerationToggles.indexOf(<any> event.target);
		const LFOLoopOnceToggleIndex = this._LFOLoopOnceToggles.indexOf(<any> event.target);
		const LFOIgnoranceToggleIndex = this._LFOIgnoranceToggles.indexOf(<any> event.target);
		const LFOAccelerationInputBoxIndex = this._LFOAccelerationInputBoxes.indexOf(<any> event.target);
		const LFOAccelerationSliderIndex = this._LFOAccelerationSliders.indexOf(<any> event.target);
		const LFOPulseWidthSliderIndex = this._LFOPulseWidthSliders.indexOf(<any> event.target);
		const LFOTrapezoidRatioSliderIndex = this._LFOTrapezoidRatioSliders.indexOf(<any> event.target);
		const LFOStairsStepAmountInputBoxIndex = this._LFOStairsStepAmountInputBoxes.indexOf(<any> event.target);
		const LFOStairsStepAmountSliderIndex = this._LFOStairsStepAmountSliders.indexOf(<any> event.target);

		if (plotterTimeRangeInputBoxIndex != -1) {
			this._changeTimeRange(plotterTimeRangeInputBoxIndex, this._envelopePlotters[plotterTimeRangeInputBoxIndex].range, +(this._plotterTimeRangeInputBoxes[plotterTimeRangeInputBoxIndex].value));
		}
		if (perEnvelopeSpeedInputBoxIndex != -1) {
			this._lastChange = new ChangePerEnvelopeSpeed(this._doc, perEnvelopeSpeedInputBoxIndex, instrument.envelopes[perEnvelopeSpeedInputBoxIndex].envelopeSpeed, +(this._perEnvelopeSpeedInputBoxes[perEnvelopeSpeedInputBoxIndex].value));
		}
		if (perEnvelopeSpeedSliderIndex != -1) {
			this._perEnvelopeSpeedInputBoxes[perEnvelopeSpeedSliderIndex].value = this._perEnvelopeSpeedSliders[perEnvelopeSpeedSliderIndex].value;
			this._lastChange = new ChangePerEnvelopeSpeed(this._doc, perEnvelopeSpeedSliderIndex, instrument.envelopes[perEnvelopeSpeedSliderIndex].envelopeSpeed, +(this._perEnvelopeSpeedSliders[perEnvelopeSpeedSliderIndex].value));
		}
		if (discreteEnvelopeToggleIndex != -1) {
			this._doc.record(new ChangeDiscreteEnvelope(this._doc, discreteEnvelopeToggleIndex, this._discreteEnvelopeToggles[discreteEnvelopeToggleIndex].checked));
		}
		if (lowerBoundInputBoxIndex != -1) {
			this._lastChange = new ChangeLowerBound(this._doc, lowerBoundInputBoxIndex, instrument.envelopes[lowerBoundInputBoxIndex].lowerBound, +(this._lowerBoundInputBoxes[lowerBoundInputBoxIndex].value));
		}
		if (lowerBoundSliderIndex != -1) {
			this._lowerBoundInputBoxes[lowerBoundSliderIndex].value = this._lowerBoundSliders[lowerBoundSliderIndex].value;
			this._lastChange = new ChangeLowerBound(this._doc, lowerBoundSliderIndex, instrument.envelopes[lowerBoundSliderIndex].lowerBound, +(this._lowerBoundSliders[lowerBoundSliderIndex].value));
		}
		if (upperBoundInputBoxIndex != -1) {
			this._lastChange = new ChangeUpperBound(this._doc, upperBoundInputBoxIndex, instrument.envelopes[upperBoundInputBoxIndex].upperBound, +(this._upperBoundInputBoxes[upperBoundInputBoxIndex].value));
		}
		if (upperBoundSliderIndex != -1) {
			this._upperBoundInputBoxes[upperBoundSliderIndex].value = this._upperBoundSliders[upperBoundSliderIndex].value;
			this._lastChange = new ChangeUpperBound(this._doc, upperBoundSliderIndex, instrument.envelopes[upperBoundSliderIndex].upperBound, +(this._upperBoundSliders[upperBoundSliderIndex].value));
		}
		if (envelopeDelayInputBoxIndex != -1) {
			this._lastChange = new ChangeEnvelopeDelay(this._doc, envelopeDelayInputBoxIndex, instrument.envelopes[envelopeDelayInputBoxIndex].delay, +(this._envelopeDelayInputBoxes[envelopeDelayInputBoxIndex].value));
		}
		if (envelopeDelaySliderIndex != -1) {
			this._envelopeDelayInputBoxes[envelopeDelaySliderIndex].value = this._envelopeDelaySliders[envelopeDelaySliderIndex].value;
			this._lastChange = new ChangeEnvelopeDelay(this._doc, envelopeDelaySliderIndex, instrument.envelopes[envelopeDelaySliderIndex].delay, +(this._envelopeDelaySliders[envelopeDelaySliderIndex].value));
		}
		if (startInputBoxIndex != -1) {
			this._lastChange = new ChangePitchEnvelopeStart(this._doc, startInputBoxIndex, instrument.envelopes[startInputBoxIndex].pitchStart, +(this._pitchStartInputBoxes[startInputBoxIndex].value));
		}
		if (endInputBoxIndex != -1) {
			this._lastChange = new ChangePitchEnvelopeEnd(this._doc, endInputBoxIndex, instrument.envelopes[endInputBoxIndex].pitchEnd, +(this._pitchEndInputBoxes[endInputBoxIndex].value));
		} 
		if (startSliderIndex != -1) {
			this._pitchStartInputBoxes[startSliderIndex].value = this._pitchStartSliders[startSliderIndex].value;
			this._pitchStartNoteTexts[startSliderIndex].textContent = String(_.pitchStartLabel + this._pitchToNote(parseInt(this._pitchStartInputBoxes[startSliderIndex].value), instrument.isNoiseInstrument) + ":");
			this._lastChange = new ChangePitchEnvelopeStart(this._doc, startSliderIndex, instrument.envelopes[startSliderIndex].pitchStart, +(this._pitchStartSliders[startSliderIndex].value));
		} 
		if (endSliderIndex != -1) {
			this._pitchEndInputBoxes[endSliderIndex].value = this._pitchEndSliders[endSliderIndex].value;
			this._pitchEndNoteTexts[endSliderIndex].textContent = String(_.pitchEndLabel + this._pitchToNote(parseInt(this._pitchEndInputBoxes[endSliderIndex].value), instrument.isNoiseInstrument) + ":");
			this._lastChange = new ChangePitchEnvelopeEnd(this._doc, endSliderIndex, instrument.envelopes[endSliderIndex].pitchEnd, +(this._pitchEndSliders[endSliderIndex].value));
		}
		if (pitchAmplifyToggleIndex != -1) {
			this._doc.record(new ChangePitchAmplify(this._doc, pitchAmplifyToggleIndex, this._pitchAmplifyToggles[pitchAmplifyToggleIndex].checked));
		}
		if (pitchBounceToggleIndex != -1) {
			this._doc.record(new ChangePitchBounce(this._doc, pitchBounceToggleIndex, this._pitchBounceToggles[pitchBounceToggleIndex].checked));
		}
		if (envelopePhaseInputBoxIndex != -1) {
			this._lastChange = new ChangeEnvelopePosition(this._doc, envelopePhaseInputBoxIndex, instrument.envelopes[envelopePhaseInputBoxIndex].phase, +(this._envelopePhaseInputBoxes[envelopePhaseInputBoxIndex].value));
		}
		if (envelopePhaseSliderIndex != -1) {
			this._envelopePhaseInputBoxes[envelopePhaseSliderIndex].value = this._envelopePhaseSliders[envelopePhaseSliderIndex].value;
			this._lastChange = new ChangeEnvelopePosition(this._doc, envelopePhaseSliderIndex, instrument.envelopes[envelopePhaseSliderIndex].phase, +(this._envelopePhaseSliders[envelopePhaseSliderIndex].value));
		}
		if (clapMirrorAmountInputBoxIndex != -1) {
			this._lastChange = new ChangeClapMirrorAmount(this._doc, clapMirrorAmountInputBoxIndex, instrument.envelopes[clapMirrorAmountInputBoxIndex].mirrorAmount, +(this._clapMirrorAmountInputBoxes[clapMirrorAmountInputBoxIndex].value));
		}
		if (clapMirrorAmountSliderIndex != -1) {
			this._clapMirrorAmountInputBoxes[clapMirrorAmountSliderIndex].value = this._clapMirrorAmountSliders[clapMirrorAmountSliderIndex].value;
			this._lastChange = new ChangeClapMirrorAmount(this._doc, clapMirrorAmountSliderIndex, instrument.envelopes[clapMirrorAmountSliderIndex].mirrorAmount, +(this._clapMirrorAmountSliders[clapMirrorAmountSliderIndex].value));
		}
		if (LFOEnableAccelerationToggleIndex != -1) {
			this._doc.record(new ChangeEnvelopeAccelerationEnabled(this._doc, LFOEnableAccelerationToggleIndex, this._LFOEnableAccelerationToggles[LFOEnableAccelerationToggleIndex].checked));
		}
		if (LFOLoopOnceToggleIndex != -1) {
			this._doc.record(new ChangeEnvelopeLooping(this._doc, LFOLoopOnceToggleIndex, this._LFOLoopOnceToggles[LFOLoopOnceToggleIndex].checked));
		}
		if (LFOIgnoranceToggleIndex != -1) {
			this._doc.record(new ChangeEnvelopeIgnorance(this._doc, LFOIgnoranceToggleIndex, this._LFOIgnoranceToggles[LFOIgnoranceToggleIndex].checked));
		}
		if (LFOAccelerationInputBoxIndex != -1) {
			this._lastChange = new ChangeEnvelopeAcceleration(this._doc, LFOAccelerationInputBoxIndex, instrument.envelopes[LFOAccelerationInputBoxIndex].phase, +(this._LFOAccelerationInputBoxes[LFOAccelerationInputBoxIndex].value));
		}
		if (LFOAccelerationSliderIndex != -1) {
			this._LFOAccelerationInputBoxes[LFOAccelerationSliderIndex].value = this._LFOAccelerationSliders[LFOAccelerationSliderIndex].value;
			this._lastChange = new ChangeEnvelopeAcceleration(this._doc, LFOAccelerationSliderIndex, instrument.envelopes[LFOAccelerationSliderIndex].phase, +(this._LFOAccelerationSliders[LFOAccelerationSliderIndex].value));
		}
		if (LFOPulseWidthSliderIndex != -1) {
			this._lastChange = new ChangeLFOEnvelopePulseWidth(this._doc, LFOPulseWidthSliderIndex, instrument.envelopes[LFOPulseWidthSliderIndex].phase, +(this._LFOPulseWidthSliders[LFOPulseWidthSliderIndex].value));
		}
		if (LFOTrapezoidRatioSliderIndex != -1) {
			this._lastChange = new ChangeLFOEnvelopeTrapezoidRatio(this._doc, LFOTrapezoidRatioSliderIndex, instrument.envelopes[LFOTrapezoidRatioSliderIndex].phase, +(this._LFOTrapezoidRatioSliders[LFOTrapezoidRatioSliderIndex].value));
		}
		if (LFOStairsStepAmountInputBoxIndex != -1) {
			this._lastChange = new ChangeLFOEnvelopeStairsStepAmount(this._doc, LFOStairsStepAmountInputBoxIndex, instrument.envelopes[LFOStairsStepAmountInputBoxIndex].LFOSettings.LFOStepAmount, +(this._LFOStairsStepAmountInputBoxes[LFOStairsStepAmountInputBoxIndex].value));
		}
		if (LFOStairsStepAmountSliderIndex != -1) {
			this._LFOStairsStepAmountInputBoxes[LFOStairsStepAmountSliderIndex].value = this._LFOStairsStepAmountSliders[LFOStairsStepAmountSliderIndex].value;
			this._lastChange = new ChangeLFOEnvelopeStairsStepAmount(this._doc, LFOStairsStepAmountSliderIndex, instrument.envelopes[LFOStairsStepAmountSliderIndex].LFOSettings.LFOStepAmount, +(this._LFOStairsStepAmountSliders[LFOStairsStepAmountSliderIndex].value));
		}
	}

	private _onChange = (event: Event): void => {
		const instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];

		const targetSelectIndex: number = this._targetSelects.indexOf(<any> event.target);
		const envelopeSelectIndex: number = this._envelopeSelects.indexOf(<any> event.target);
		const perEnvelopeSpeedInputBoxIndex = this._perEnvelopeSpeedInputBoxes.indexOf(<any> event.target);
		const perEnvelopeSpeedSliderIndex = this._perEnvelopeSpeedSliders.indexOf(<any> event.target);
		const lowerBoundInputBoxIndex = this._lowerBoundInputBoxes.indexOf(<any> event.target);
		const upperBoundInputBoxIndex = this._upperBoundInputBoxes.indexOf(<any> event.target);
		const lowerBoundSliderIndex = this._lowerBoundSliders.indexOf(<any> event.target);
		const upperBoundSliderIndex = this._upperBoundSliders.indexOf(<any> event.target);
		const envelopeDelayInputBoxIndex = this._envelopeDelayInputBoxes.indexOf(<any> event.target);
		const envelopeDelaySliderIndex = this._envelopeDelaySliders.indexOf(<any> event.target);
		const startInputBoxIndex = this._pitchStartInputBoxes.indexOf(<any>event.target);
		const endInputBoxIndex = this._pitchEndInputBoxes.indexOf(<any>event.target);
		const startSliderIndex = this._pitchStartSliders.indexOf(<any>event.target);
		const endSliderIndex = this._pitchEndSliders.indexOf(<any>event.target);
		const envelopePhaseInputBoxIndex = this._envelopePhaseInputBoxes.indexOf(<any> event.target);
		const envelopePhaseSliderIndex = this._envelopePhaseSliders.indexOf(<any> event.target);
		const clapMirrorAmountInputBoxIndex = this._clapMirrorAmountInputBoxes.indexOf(<any> event.target);
		const clapMirrorAmountSliderIndex = this._clapMirrorAmountSliders.indexOf(<any> event.target);
		const LFOShapeSelectIndex = this._LFOShapeSelects.indexOf(<any> event.target);
		const LFOAccelerationInputBoxIndex = this._LFOAccelerationInputBoxes.indexOf(<any> event.target);
		const LFOAccelerationSliderIndex = this._LFOAccelerationSliders.indexOf(<any> event.target);
		const LFOPulseWidthSliderIndex = this._LFOPulseWidthSliders.indexOf(<any> event.target);
		const LFOTrapezoidRatioSliderIndex = this._LFOTrapezoidRatioSliders.indexOf(<any> event.target);
		const LFOStairsStepAmountInputBoxIndex = this._LFOStairsStepAmountInputBoxes.indexOf(<any> event.target);
		const LFOStairsStepAmountSliderIndex = this._LFOStairsStepAmountSliders.indexOf(<any> event.target);

		if (targetSelectIndex != -1) {
			const combinedValue: number = parseInt(this._targetSelects[targetSelectIndex].value);
			const target: number = combinedValue % Config.instrumentAutomationTargets.length;
			const index: number = (combinedValue / Config.instrumentAutomationTargets.length) >>> 0;
			this._doc.record(new ChangeSetEnvelopeTarget(this._doc, targetSelectIndex, target, index));
		} else if (envelopeSelectIndex != -1) {
			this._doc.record(new ChangeSetEnvelopeType(this._doc, envelopeSelectIndex, this._envelopeSelects[envelopeSelectIndex].selectedIndex));
		}
		if (perEnvelopeSpeedInputBoxIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (perEnvelopeSpeedSliderIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (lowerBoundInputBoxIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (upperBoundInputBoxIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (lowerBoundSliderIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (upperBoundSliderIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (envelopeDelayInputBoxIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (envelopeDelaySliderIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (startInputBoxIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (endInputBoxIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (startSliderIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (endSliderIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (envelopePhaseInputBoxIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (envelopePhaseSliderIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (clapMirrorAmountInputBoxIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (clapMirrorAmountSliderIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (LFOShapeSelectIndex != -1) {
			this._doc.record(new ChangeLFOEnvelopeShape(this._doc, LFOShapeSelectIndex, instrument.envelopes[LFOShapeSelectIndex].LFOSettings.LFOShape, this._LFOShapeSelects[LFOShapeSelectIndex].selectedIndex));
		}
		if (LFOAccelerationInputBoxIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (LFOAccelerationSliderIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (LFOPulseWidthSliderIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (LFOTrapezoidRatioSliderIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (LFOStairsStepAmountInputBoxIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (LFOStairsStepAmountSliderIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
	}

	private _changeTimeRange(envelopeIndex: number, oldValue: number, newValue: number): void {
        if (oldValue != newValue) {
            this._envelopePlotters[envelopeIndex].range = newValue;
			this._envelopeStartPlotterLines[envelopeIndex].timeRange = newValue;
            this._doc.notifier.changed();
        }
	}

	private _onClick = (event: MouseEvent): void => {
		// Commented-out code is a failed dropdown opening system for the movement buttons.
		//let dropdownStatus: boolean;

		const deleteButtonIndex: number = this._deleteButtons.indexOf(<any> event.target);
		const moveUpButtonIndex: number = this._envelopeMoveUpButtons.indexOf(<any> event.target);
		const moveDownButtonIndex: number = this._envelopeMoveDownButtons.indexOf(<any> event.target);

		if (deleteButtonIndex != -1) {
			this._doc.record(new ChangeRemoveEnvelope(this._doc, deleteButtonIndex));
		}
		if (moveUpButtonIndex != -1) {
			//dropdownStatus = this._openPerEnvelopeDropdowns[moveUpButtonIndex-1];
			this._doc.record(new ChangeEnvelopeOrder(this._doc, moveUpButtonIndex, true));
			//this._openPerEnvelopeDropdowns[moveUpButtonIndex] = dropdownStatus;
			//this._openPerEnvelopeDropdowns[moveUpButtonIndex-1] = true;
		}
		if (moveDownButtonIndex != -1) {
			//dropdownStatus = this._openPerEnvelopeDropdowns[moveUpButtonIndex+1];
			this._doc.record(new ChangeEnvelopeOrder(this._doc, moveDownButtonIndex, false));
			//this._openPerEnvelopeDropdowns[moveUpButtonIndex] = dropdownStatus;
			//this._openPerEnvelopeDropdowns[moveUpButtonIndex+1] = true;
		}
	}

	private _typingInInput = (event: KeyboardEvent): void => {
		const plotterTimeRangeInputBoxIndex: number = this._plotterTimeRangeInputBoxes.indexOf(<any> event.target);
		const perEnvelopeSpeedInputBoxIndex: number = this._perEnvelopeSpeedInputBoxes.indexOf(<any> event.target);
		const lowerBoundInputBoxIndex: number = this._lowerBoundInputBoxes.indexOf(<any> event.target);
		const upperBoundInputBoxIndex: number = this._upperBoundInputBoxes.indexOf(<any> event.target);
		const envelopeDelayInputBoxIndex: number = this._envelopeDelayInputBoxes.indexOf(<any> event.target);
		const startInputBoxIndex: number = this._pitchStartInputBoxes.indexOf(<any>event.target);
		const endInputBoxIndex: number = this._pitchEndInputBoxes.indexOf(<any>event.target);
		const envelopePhaseInputBoxIndex: number = this._envelopePhaseInputBoxes.indexOf(<any>event.target);
		const clapMirrorAmountInputBoxIndex: number = this._clapMirrorAmountInputBoxes.indexOf(<any> event.target);
		const LFOAccelerationInputBoxIndex: number = this._LFOAccelerationInputBoxes.indexOf(<any> event.target);
		const LFOStairsStepAmountInputBoxIndex: number = this._LFOStairsStepAmountInputBoxes.indexOf(<any> event.target);

		if (plotterTimeRangeInputBoxIndex != -1) event.stopPropagation();
		if (perEnvelopeSpeedInputBoxIndex != -1) event.stopPropagation();
		if (lowerBoundInputBoxIndex != -1) event.stopPropagation();
		if (upperBoundInputBoxIndex != -1) event.stopPropagation();
		if (envelopeDelayInputBoxIndex != -1) event.stopPropagation();
		if (startInputBoxIndex != -1) event.stopPropagation();
		if (endInputBoxIndex != -1) event.stopPropagation();
		if (envelopePhaseInputBoxIndex != -1) event.stopPropagation();
		if (clapMirrorAmountInputBoxIndex != -1) event.stopPropagation();
		if (LFOAccelerationInputBoxIndex != -1) event.stopPropagation();
		if (LFOStairsStepAmountInputBoxIndex != -1) event.stopPropagation();
	}
	
	private _makeOption(target: number, index: number): HTMLOptionElement {
		let displayName = Config.instrumentAutomationTargets[target].displayName;
		if (Config.instrumentAutomationTargets[target].maxCount > 1) {
			if (displayName.indexOf("#") != -1) {
				displayName = displayName.replace("#", String(index+1));
			} else {
				displayName += " " + (index+1);
			}
		}
		return option({value: target + index * Config.instrumentAutomationTargets.length}, displayName);
	}
	
	private _updateTargetOptionVisibility(menu: HTMLSelectElement, instrument: Instrument): void {
		for (let optionIndex: number = 0; optionIndex < menu.childElementCount; optionIndex++) {
			const option: HTMLOptionElement = <HTMLOptionElement> menu.children[optionIndex];
			const combinedValue: number = parseInt(option.value);
			const target: number = combinedValue % Config.instrumentAutomationTargets.length;
			const index: number = (combinedValue / Config.instrumentAutomationTargets.length) >>> 0;
			option.hidden = !instrument.supportsEnvelopeTarget(target, index);
		}
	}

	private _pitchToNote(value: number, isNoise: boolean): string {
		let text = "";
		if (isNoise) value = value * 6 + 12;
		const offset: number = Config.keys[this._doc.song.key].basePitch % Config.pitchesPerOctave;
		const keyValue = (value + offset) % Config.pitchesPerOctave;
		if (Config.keys[keyValue].isWhiteKey) {
			text = Config.keys[keyValue].name;
		} else {
			const shiftDir: number = Config.blackKeyNameParents[value % Config.pitchesPerOctave];
			text = Config.keys[(keyValue + Config.pitchesPerOctave + shiftDir) % Config.pitchesPerOctave].name;
			if (shiftDir == 1) {
				text += "♭";
			} else if (shiftDir == -1) {
				text += "♯";
			}
		}
		return "[" + text + Math.floor((value + Config.pitchesPerOctave) / 12 + this._doc.song.octave - 1) + "]";
	}

	public render(): void {
		const instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
		let drumPitchEnvBoolean: boolean = instrument.isNoiseInstrument;
		
		for (let envelopeIndex: number = this._rows.length; envelopeIndex < instrument.envelopeCount; envelopeIndex++) {
			const envelopePlotter: EnvelopeLineGraph = new EnvelopeLineGraph(canvas({ width: 180, height: 80, style: `border: 2px solid ${ColorConfig.uiWidgetBackground}; width: 155px; height: 68px; margin-left: 15px;`, id: "EnvelopeLineGraph" }), this._doc, envelopeIndex, false);
			const envelopeStartPlotLine: EnvelopeStartLine = new EnvelopeStartLine(canvas({ width: 180, height: 90, style: `width: 157px; height: 78px; top: -6px; right: -1px; position: relative; margin-left: 15px;`, id: "EnvelopeStartPlotLine" }), this._doc, envelopeIndex, false);
			const envelopePlotterRow: HTMLElement = div({class: "selectRow dropFader", style: "margin-top: 22px; margin-bottom: 29px;"}, envelopePlotter.canvas, envelopeStartPlotLine.canvas);
			const plotterTimeRangeInputBox: HTMLInputElement = input({style: "width: 14.5em; font-size: 80%; margin-left: 0px; vertical-align: middle;", id: "timeRangeInputBox", type: "number", step: "0.1", min: "0.1", max: "200", value: "4"});
			const plotterTimeRangeRow: HTMLElement = div({ class: "selectRow dropFader", style: "margin-left: 16px; margin-bottom: 18px;" }, div({},
				span({ class: "tip", style: "height:1em; font-size: small; white-space: nowrap;", onclick: () => this._openPrompt("plotterTimeRange") }, _.timeRangeLabel),
				div({ style: "color: " + ColorConfig.secondaryText + "; margin-top: -3px;" }, plotterTimeRangeInputBox),
			));
			const perEnvelopeSpeedSlider: HTMLInputElement = input({style: "margin: 0;", type: "range", min: Config.perEnvelopeSpeedMin, max: Config.perEnvelopeSpeedMax, value: "1", step: "0.25"});
			const perEnvelopeSpeedInputBox: HTMLInputElement = input({style: "width: 4em; font-size: 80%; ", id: "perEnvelopeSpeedInputBox", type: "number", step: "0.001", min: Config.perEnvelopeSpeedMin, max: Config.perEnvelopeSpeedMax, value: "1"});
			const perEnvelopeSpeedRow: HTMLElement = div({class: "selectRow dropFader"}, div({},
				span({class: "tip", style: "height: 1em; font-size: 12px;", onclick: () => this._openPrompt("perEnvelopeSpeed")}, span(_.perEnvelopeSpeedLabel)),
				div({style: `color: ${ColorConfig.secondaryText}; margin-top: -3px;`}, perEnvelopeSpeedInputBox),
			), perEnvelopeSpeedSlider);
			const discreteEnvelopeToggle: HTMLInputElement = input({style: "width: 3em; padding: 0; margin-right: 3em;", type: "checkbox"});
			const discreteEnvelopeRow: HTMLElement = div({class: "selectRow dropFader"}, div({},
				span({class: "tip", style: "height: 1em; font-size: 12px;", onclick: () => this._openPrompt("discreteEnvelope")}, span(_.discreteEnvelopeLabel))
			), discreteEnvelopeToggle);
			const lowerBoundSlider: HTMLInputElement = input({style: "margin: 0;", type: "range", min: Config.lowerBoundMin, max: Config.lowerBoundMax, value: "0", step: "0.20"});
			const upperBoundSlider: HTMLInputElement = input({style: "margin: 0;", type: "range", min: Config.upperBoundMin, max: Config.upperBoundMax, value: "1", step: "0.20"});
			const lowerBoundInputBox: HTMLInputElement = input({style: "width: 4em; font-size: 80%; ", id: "lowerBoundInputBox", type: "number", step: "0.001", min: Config.lowerBoundMin, max: Config.lowerBoundMax, value: "0"});
			const upperBoundInputBox: HTMLInputElement = input({style: "width: 4em; font-size: 80%; ", id: "upperBoundInputBox", type: "number", step: "0.001", min: Config.upperBoundMin, max: Config.upperBoundMax, value: "1"});
			const lowerBoundRow: HTMLElement = div({class: "selectRow dropFader"}, div({},
				span({class: "tip", style: "height: 1em; font-size: 12px;", onclick: () => this._openPrompt("envelopeBounds")}, span(_.lowerBoundLabel)),
				div({style: `color: ${ColorConfig.secondaryText}; margin-top: -3px;`}, lowerBoundInputBox),
			), lowerBoundSlider);
			const upperBoundRow: HTMLElement = div({class: "selectRow dropFader"}, div({},
				span({class: "tip", style: "height: 1em; font-size: 12px;", onclick: () => this._openPrompt("envelopeBounds")}, span(_.upperBoundLabel)),
				div({style: `color: ${ColorConfig.secondaryText}; margin-top: -3px;`}, upperBoundInputBox),
			), upperBoundSlider);
			const envelopeDelaySlider: HTMLInputElement = input({style: "margin: 0;", type: "range", min: 0, max: Config.envelopeDelayMax, value: "0", step: "0.5"});
			const envelopeDelayInputBox: HTMLInputElement = input({style: "width: 4em; font-size: 80%; ", id: "envelopeDelayInputBox", type: "number", step: "0.01", min: 0, max: Config.envelopeDelayMax, value: "0"});
			const envelopeDelayRow: HTMLElement = div({class: "selectRow dropFader"}, div({},
				span({class: "tip", style: "height: 1em; font-size: 12px;", onclick: () => this._openPrompt("envelopeDelay")}, span(_.envelopeDelayLabel)),
				div({style: `color: ${ColorConfig.secondaryText}; margin-top: -3px;`}, envelopeDelayInputBox),
			), envelopeDelaySlider);
			const pitchStartSlider: HTMLInputElement = input({style: "margin: 0;", type: "range", min: drumPitchEnvBoolean ? 1 : 0, max: drumPitchEnvBoolean ? Config.drumCount : Config.maxPitch, value: "0", step: "1"});
			const pitchStartInputBox: HTMLInputElement = input({style: "width: 4em; font-size: 80%; ", id: "pitchStartInputBox", type: "number", step: "1", min: drumPitchEnvBoolean ? 1 : 0, max: drumPitchEnvBoolean ? Config.drumCount : Config.maxPitch, value: "0"});
			const pitchStartNoteText: HTMLSpanElement = span({class: "tip", style: "height: 1em; white-space: nowrap; font-size: smaller;", onclick: () => this._openPrompt("pitchEnvelope")}, span(_.pitchStartLabel + this._pitchToNote(parseInt(pitchStartInputBox.value), drumPitchEnvBoolean) + ":"));
			const pitchEndSlider: HTMLInputElement = input({style: "margin: 0;", type: "range", min: drumPitchEnvBoolean ? 1 : 0, max: drumPitchEnvBoolean ? Config.drumCount : Config.maxPitch, value: drumPitchEnvBoolean ? Config.drumCount : Config.maxPitch, step: "1"});
			const pitchEndInputBox: HTMLInputElement = input({style: "width: 4em; font-size: 80%; ", id: "pitchEndInputBox", type: "number", step: "1", min: drumPitchEnvBoolean ? 1 : 0, max: drumPitchEnvBoolean ? Config.drumCount : Config.maxPitch, value: drumPitchEnvBoolean ? Config.drumCount : Config.maxPitch});
			const pitchEndNoteText: HTMLSpanElement = span({class: "tip", style: "height: 1em; white-space: nowrap; font-size: smaller;", onclick: () => this._openPrompt("pitchEnvelope")}, span(_.pitchEndLabel + this._pitchToNote(parseInt(pitchEndInputBox.value), drumPitchEnvBoolean) + ":"));
			const pitchStartGroup: HTMLElement = div({class: "selectRow dropFader"}, div({},
				pitchStartNoteText,
				div({style: `color: ${ColorConfig.secondaryText}; margin-top: -3px;`}, pitchStartInputBox),
			), pitchStartSlider);
			const pitchEndGroup: HTMLElement = div({class: "selectRow dropFader"}, div({},
				pitchEndNoteText,
				div({style: `color: ${ColorConfig.secondaryText}; margin-top: -3px;`}, pitchEndInputBox),
			), pitchEndSlider);
			const pitchAmplifyToggle: HTMLInputElement = input({style: "width: 3em; padding: 0;", type: "checkbox"});
			const pitchBounceToggle: HTMLInputElement = input({style: "width: 3em; padding: 0;", type: "checkbox"});
			const extraPitchSettingRow: HTMLElement = div({}, div({class: "", style: "display: flex; flex-direction: row; justify-content: space-evenly;"},
				div({style: "display: flex; flex-direction: column; gap: 5px;"},
					span({class: "tip", style: "height: 1em; width: 4em;", onclick: () => this._openPrompt("extraPitchEnvSettings")}, span(_.pitchAmplifyLabel)),
					div({style: ""}, pitchAmplifyToggle),
				),
				div({style: "display: flex; flex-direction: column; gap: 5px;"},
					span({class: "tip", style: "height: 1em; width: 4em;", onclick: () => this._openPrompt("extraPitchEnvSettings")}, span(_.pitchBounceLabel)),
					div({style: ""}, pitchBounceToggle),
				),
			));
			const envelopePhaseSlider: HTMLInputElement = input({style: "margin: 0;", type: "range", min: 0, max: Config.envelopePhaseMax, value: "0", step: "1"});
			const envelopePhaseInputBox: HTMLInputElement = input({style: "width: 4em; font-size: 80%; ", id: "envelopePhaseInputBox", type: "number", step: "0.01", min: 0, max: Config.envelopePhaseMax, value: "0"});
			const envelopePhaseRow: HTMLElement = div({class: "selectRow dropFader"}, div({},
				span({class: "tip", style: "height: 1em; font-size: 11px;", onclick: () => this._openPrompt("envelopePhase")}, span(_.envelopeStartingPointLabel)),
				div({style: `color: ${ColorConfig.secondaryText}; margin-top: -3px;`}, envelopePhaseInputBox),
			), envelopePhaseSlider);
			const measureInBeatsButton: HTMLButtonElement = button({ style: "font-size: x-small; width: 50%; height: 40%", class: "no-underline", onclick: () => this._switchMeasurementType(true, envelopeIndex) }, span(_.measureInBeatsLabel));
    		const measureInSecondsButton: HTMLButtonElement = button({ style: "font-size: x-small; width: 50%; height: 40%", class: "last-button no-underline", onclick: () => this._switchMeasurementType(false, envelopeIndex) }, span(_.measureInSecondsLabel));
    		const measurementTypeRow: HTMLElement = div({ class: "selectRow", style: "padding-top: 4px; margin-bottom: -3px;" }, span({ style: "font-size: small;", class: "tip", onclick: () => this._openPrompt("envelopeDelayPhaseMeasurement") }, span(_.delayPhaseMeasurementLabel)), div({ class: "instrument-bar" }, measureInBeatsButton, measureInSecondsButton));
			const clapMirrorAmountSlider: HTMLInputElement = input({style: "margin: 0;", type: "range", min: 1, max: Config.clapMirrorsMax, value: "5", step: "1"});
			const clapMirrorAmountInputBox: HTMLInputElement = input({style: "width: 4em; font-size: 80%; ", id: "clapMirrorAmountInputBox", type: "number", step: "1", min: 1, max: Config.clapMirrorsMax, value: "5"});
			const clapMirrorAmountRow: HTMLElement = div({class: "selectRow dropFader"}, div({},
				span({class: "tip", style: "height: 1em; font-size: 12px;", onclick: () => this._openPrompt("mirrorAmount")}, span(_.clapMirrorAmountLabel)),
				div({style: `color: ${ColorConfig.secondaryText}; margin-top: -3px;`}, clapMirrorAmountInputBox),
			), clapMirrorAmountSlider);
			const LFOShapeSelect: HTMLSelectElement = buildOptions(select(), [
				_.LFOShape1Label,
				_.LFOShape2Label,
				_.LFOShape3Label,
				_.LFOShape4Label,
				_.LFOShape5Label,
				_.LFOShape6Label,
				_.LFOShape7Label
			]);
			const LFOShapeRow: HTMLElement = div({class: "selectRow"}, span({ class: "tip", onclick: () => this._openPrompt("LFOShape") }, span(_.LFOShapeLabel)), div({ class: "selectContainer" }, LFOShapeSelect));
			const LFOEnableAccelerationToggle: HTMLInputElement = input({style: "width: 3em; padding: 0;", type: "checkbox"});
			const LFOLoopOnceToggle: HTMLInputElement = input({style: "width: 3em; padding: 0;", type: "checkbox"});
			const LFOIgnoranceToggle: HTMLInputElement = input({style: "width: 3em; padding: 0;", type: "checkbox"});
			const LFORadioButtonsRow: HTMLElement = div({}, div({class: "", style: "display: flex; flex-direction: row; justify-content: space-evenly;"},
				div({style: "display: flex; flex-direction: column; gap: 5px; text-align: center;"},
					span({class: "tip", style: "font-size: 10.5px; height: 1em; width: 5em;", onclick: () => this._openPrompt("LFOAcceleration")}, span(_.LFOEnableAccelerationLabel)),
					div({style: ""}, LFOEnableAccelerationToggle),
				),
				div({style: "display: flex; flex-direction: column; gap: 5px; text-align: center;"},
					span({class: "tip", style: "font-size: 10.5px; height: 1em; width: 5em;", onclick: () => this._openPrompt("LFOLoopOnce")}, span(_.LFOLoopsLabel)),
					div({style: ""}, LFOLoopOnceToggle),
				),
				div({style: "display: flex; flex-direction: column; gap: 5px; text-align: center;"},
					span({class: "tip", style: "font-size: 10.5px; height: 1em; width: 5em;", onclick: () => this._openPrompt("LFOIgnorance")}, span(_.LFOIgnorantLabel)),
					div({style: ""}, LFOIgnoranceToggle),
				),
			));
			const LFOAccelerationSlider: HTMLInputElement = input({style: "margin: 0;", type: "range", min: Config.LFOAccelerationMin, max: Config.LFOAccelerationMax, value: "1", step: "0.25"});
			const LFOAccelerationInputBox: HTMLInputElement = input({style: "width: 4em; font-size: 80%; ", id: "LFOAccelerationInputBox", type: "number", step: "0.01", min: Config.LFOAccelerationMin, max: Config.LFOAccelerationMax, value: "1"});
			const LFOAccelerationRow: HTMLElement = div({class: "selectRow dropFader"}, div({},
				span({class: "tip", style: "height: 1em; font-size: 10.5px;", onclick: () => this._openPrompt("LFOAcceleration")}, span(_.LFOAccelerationLabel)),
				div({style: `color: ${ColorConfig.secondaryText}; margin-top: -3px;`}, LFOAccelerationInputBox),
			), LFOAccelerationSlider);
			const LFOPulseWidthSlider: HTMLInputElement = input({style: "margin: 0;", type: "range", min: 0, max: "20", value: "4", step: "1"});
			const LFOPulseWidthRow: HTMLElement = div({class: "selectRow dropFader"}, span({ class: "tip", onclick: () => this._openPrompt("LFOPulseWidth") }, span(_.LFOPulseWidthLabel)), LFOPulseWidthSlider);
			const LFOTrapezoidRatioSlider: HTMLInputElement = input({style: "margin: 0;", type: "range", min: Config.LFOTrapezoidRatioMin, max: Config.LFOTrapezoidRatioMax, value: "1", step: "0.1"});
			const LFOTrapezoidRatioRow: HTMLElement = div({class: "selectRow dropFader"}, span({ class: "tip", onclick: () => this._openPrompt("LFOTrapezoidRatio") }, span(_.LFOTrapezoidRatioLabel)), LFOTrapezoidRatioSlider);
			const LFOStairsStepAmountSlider: HTMLInputElement = input({style: "margin: 0;", type: "range", min: 1, max: Config.LFOStairsStepAmountMax, value: "4", step: "1"});
			const LFOStairsStepAmountInputBox: HTMLInputElement = input({style: "width: 4em; font-size: 80%; ", id: "LFOStairsStepAmountInputBox", type: "number", step: "1", min: 1, max: Config.LFOStairsStepAmountMax, value: "4"});
			const LFOStairsStepAmountRow: HTMLElement = div({class: "selectRow dropFader"}, div({},
				span({class: "tip", style: "height: 1em; font-size: 12px;", onclick: () => this._openPrompt("LFOStepAmount")}, span(_.LFOStairsStepAmountLabel)),
				div({style: `color: ${ColorConfig.secondaryText}; margin-top: -3px;`}, LFOStairsStepAmountInputBox),
			), LFOStairsStepAmountSlider);
			const envelopeCopyButton: HTMLButtonElement = button({class: "envelope-button", title: _.copyLabel, style: "flex: 3;", onclick: () => this._copyEnvelopeSettings(envelopeIndex)}, 
				// Copy icon:
				SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 4%; top: 40%; margin-top: -0.75em; pointer-events: none;", width: "2em", height: "2em", viewBox: "-5 -21 26 26" }, [
					SVG.path({ d: "M 0 -15 L 1 -15 L 1 0 L 13 0 L 13 1 L 0 1 L 0 -15 z M 2 -1 L 2 -17 L 10 -17 L 14 -13 L 14 -1 z M 3 -2 L 13 -2 L 13 -12 L 9 -12 L 9 -16 L 3 -16 z", fill: "currentColor" }),
				]),
			);
			const envelopePasteButton: HTMLButtonElement = button({class: "envelope-button", title: _.pasteLabel, style: "flex: 3;", onclick: () => this._pasteEnvelopeSettings(envelopeIndex)}, 
				// Paste icon:
				SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 2%; top: 38%; margin-top: -0.75em; pointer-events: none;", width: "2em", height: "2em", viewBox: "0 0 26 26" }, [
					SVG.path({ d: "M 8 18 L 6 18 L 6 5 L 17 5 L 17 7 M 9 8 L 16 8 L 20 12 L 20 22 L 9 22 z", stroke: "currentColor", fill: "none" }),
					SVG.path({ d: "M 9 3 L 14 3 L 14 6 L 9 6 L 9 3 z M 16 8 L 20 12 L 16 12 L 16 8 z", fill: "currentColor" }),
				]),
			);
			const randomEnvelopeButton: HTMLButtonElement = button({class: "envelope-button", title: _.randomizeEnvelopeLabel, style: "flex: 3;", onclick: () => this._randomizeEnvelope(envelopeIndex)}, 
				// Dice icon:
				SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 5px; top: 21%; pointer-events: none;", width: "16", height: "16", viewBox: "0 0 16 16"}, [
					SVG.path({ d: "M13 1a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V3a2 2 0 012-2zM3 0a3 3 0 00-3 3v10a3 3 0 003 3h10a3 3 0 003-3V3a3 3 0 00-3-3zM5.5 4a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0m8 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0m0 8a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0m-8 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0m4-4a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0", fill: "currentColor"}),
				]),
			);
			const envelopeMoveUpButton: HTMLButtonElement = button({class: "envelope-button", title: _.moveUpLabel, style: "flex: 3;"}, 
				// Up-arrow icon:
				SVG.svg({ style: "flex-shrink: 0; position: absolute; left: -43%; top: 40%; margin-top: -0.75em; pointer-events: none;", width: "2.4em", height: "2.4em", viewBox: "0 0 3 9" }, [
					SVG.path({ d: "M 2 3 L 4 1 L 6 3 L 4.5 3 L 4.5 6.5 L 3.5 6.5 L 3.5 3 L 2 3 z", fill: "currentColor" }),
				]),
			);
			const envelopeMoveDownButton: HTMLButtonElement = button({class: "envelope-button", title: _.moveDownLabel, style: "flex: 3;"}, 
				// Down-arrow icon:
				SVG.svg({ style: "flex-shrink: 0; position: absolute; left: -45%; top: 35%; margin-top: -0.75em; pointer-events: none;", width: "2.4em", height: "2.4em", viewBox: "0 0 3 9" }, [
					SVG.path({ d: "M 6 5 L 4 7 L 2 5 L 3.5 5 L 3.5 1.5 L 4.5 1.5 L 4.5 5 L 6 5 z", fill: "currentColor"}),
				]),
			);
			const pitchEnvAutoBoundButton: HTMLButtonElement = button({class: "envelope-button", title: _.pitchEnvAutoBoundLabel, style: "flex: 3;", onclick: () => this._doc.selection.pitchEnvAutoBind(envelopeIndex, instrument)}, 
				// Horizontal extension icon:
				SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 5px; top: 21%; pointer-events: none;", width: "3.5em", height: "3.5em", viewBox: "6 6 24 24"}, [
					SVG.path({ d: "M 6 6 L 14 6 L 14 7 L 6 7 L 6 6 M 6 14 L 14 14 L 14 13 L 6 13 L 6 14 M 10 7 L 8.5 8.5 L 9.4 8.5 L 9.4 11.5 L 8.4 11.5 L 10 13 L 11.5 11.5 L 10.6 11.5 L 10.6 8.5 L 11.5 8.5 L 10 7", fill: "currentColor"}),
				]),
			);
			const basicCustomPromptButton: HTMLButtonElement = button({class: "envelope-button", title: _.basicCustomPromptOpenLabel, style: "flex: 3;", onclick: () => this._openPrompt("basicCustomEnvelopePrompt", envelopeIndex)}, 
				// Pencil icon:
				SVG.svg({ style: "flex-shrink: 0; position: absolute; left: 4px; top: 19%; pointer-events: none;", width: "4em", height: "4em", viewBox: "6 6 24 24"}, [
					SVG.path({ d: "M12 6 11.8 6.2 13.8 8.2 14 8C14 6.8 13.2 6 12 6M11.5 6.5 11.8 6.8 7.5 11 7.8 11 7.8 11.3 8.1 11.3 8.1 11.6 8.4 11.6 8.4 11.9 8.7 11.9 8.7 12.2 9 12.2 9 12.5 13 8.5 11.5 7 11.8 6.8 13.5 8.5 9 13 7 11 11.5 6.5M7 11 7 13 9 13", fill: "currentColor"}),
				]),
			);
			const envelopeDropdownGroup: HTMLElement = div({class: "editor-controls", style: "display: none;"}, plotterTimeRangeRow, envelopePlotterRow, pitchStartGroup, pitchEndGroup, extraPitchSettingRow, LFOShapeRow, LFORadioButtonsRow, LFOAccelerationRow, LFOPulseWidthRow, LFOTrapezoidRatioRow, LFOStairsStepAmountRow, perEnvelopeSpeedRow, discreteEnvelopeRow, lowerBoundRow, upperBoundRow, clapMirrorAmountRow, measurementTypeRow, envelopeDelayRow, envelopePhaseRow);
			const envelopeDropdown: HTMLButtonElement = button({style: "margin-left: 0.6em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;", onclick: () => this._toggleDropdownMenu(DropdownID.PerEnvelope, envelopeIndex)}, "▼");

			const targetSelect: HTMLSelectElement = select();
			for (let target: number = 0; target < Config.instrumentAutomationTargets.length; target++) {
				const interleaved: boolean = (Config.instrumentAutomationTargets[target].interleave);
				for (let index: number = 0; index < Config.instrumentAutomationTargets[target].maxCount; index++) {
					targetSelect.appendChild(this._makeOption(target, index));
					if (interleaved) {
						targetSelect.appendChild(this._makeOption(target + 1, index));
					}
				}
				if (interleaved) target++;
			}
			
			const envelopeSelect: HTMLSelectElement = select();
			for (let envelope: number = 0; envelope < Config.envelopes.length; envelope++) {
				envelopeSelect.appendChild(option({value: envelope}, Config.envelopes[envelope].name));
			} 
			
			const deleteButton: HTMLButtonElement = button({type: "button", class: "delete-envelope", title: _.removeEnvelopeLabel});

			const row: HTMLDivElement = div(
				div({style: "width: 0; position: absolute; margin-top: 22px;"}, envelopeDropdown),
				div({class: "envelope-row", style: "width: 90%; margin-left: 10%; margin-bottom: -2px;"},
					div({style: "width: 0; flex: 1; margin-right: -4px;"}, envelopeMoveUpButton),
					div({style: "width: 0; flex: 1; margin-right: -4px;"}, envelopeCopyButton),
					div({class: "selectContainer", style: "width: 0; flex: 3;"}, targetSelect),
					div({style: "width: 0; flex: 1; margin-right: -4px;"}, deleteButton),
				), 
				div({class: "envelope-row", style: "width: 90%; margin-left: 10%;"},
					div({style: "width: 0; flex: 1; margin-right: -4px;"}, envelopeMoveDownButton),
					div({style: "width: 0; flex: 1; margin-right: -4px;"}, envelopePasteButton),
					div({class: "selectContainer", style: "width: 0; flex: 3;"}, envelopeSelect),
					div({style: "position: absolute; margin-top: 0px; margin-left: 119px;"}, pitchEnvAutoBoundButton),
					div({style: "position: absolute; margin-top: 0px; margin-left: 119px;"}, basicCustomPromptButton),
					div({style: "width: 0; flex: 1; margin-right: -4px;"}, randomEnvelopeButton),
				),
			envelopeDropdownGroup);
			
			this.container.appendChild(row);
			this._rows[envelopeIndex] = row;
			this._envelopePlotters[envelopeIndex] = envelopePlotter;
			this._envelopeStartPlotterLines[envelopeIndex] = envelopeStartPlotLine;
			this._envelopePlotterRows[envelopeIndex] = envelopePlotterRow;
			this._plotterTimeRangeInputBoxes[envelopeIndex] = plotterTimeRangeInputBox;
			this._plotterTimeRangeRows[envelopeIndex] = plotterTimeRangeRow;
			this._perEnvelopeSpeedSliders[envelopeIndex] = perEnvelopeSpeedSlider;
			this._perEnvelopeSpeedInputBoxes[envelopeIndex] = perEnvelopeSpeedInputBox;
			this._perEnvelopeSpeedRows[envelopeIndex] = perEnvelopeSpeedRow;
			this._discreteEnvelopeToggles[envelopeIndex] = discreteEnvelopeToggle;
			this._discreteEnvelopeRows[envelopeIndex] = discreteEnvelopeRow;
			this._lowerBoundSliders[envelopeIndex] = lowerBoundSlider;
			this._upperBoundSliders[envelopeIndex] = upperBoundSlider;
			this._lowerBoundInputBoxes[envelopeIndex] = lowerBoundInputBox;
			this._upperBoundInputBoxes[envelopeIndex] = upperBoundInputBox;
			this._lowerBoundRows[envelopeIndex] = lowerBoundRow;
			this._upperBoundRows[envelopeIndex] = upperBoundRow;
			this._LFOStairsStepAmountSliders[envelopeIndex] = LFOStairsStepAmountSlider;
			this._LFOStairsStepAmountInputBoxes[envelopeIndex] = LFOStairsStepAmountInputBox;
			this._LFOStairsStepAmountRows[envelopeIndex] = LFOStairsStepAmountRow;
			this._envelopeDelaySliders[envelopeIndex] = envelopeDelaySlider;
			this._envelopeDelayInputBoxes[envelopeIndex] = envelopeDelayInputBox;
			this._envelopeDelayRows[envelopeIndex] = envelopeDelayRow;
			this._pitchStartSliders[envelopeIndex] = pitchStartSlider;
			this._pitchStartInputBoxes[envelopeIndex] = pitchStartInputBox;
			this._pitchStartNoteTexts[envelopeIndex] = pitchStartNoteText;
			this._pitchEndSliders[envelopeIndex] = pitchEndSlider;
			this._pitchEndInputBoxes[envelopeIndex] = pitchEndInputBox;
			this._pitchEndNoteTexts[envelopeIndex] = pitchEndNoteText;
			this._pitchStartGroups[envelopeIndex] = pitchStartGroup;
			this._pitchEndGroups[envelopeIndex] = pitchEndGroup;
			this._pitchAmplifyToggles[envelopeIndex] = pitchAmplifyToggle;
			this._pitchBounceToggles[envelopeIndex] = pitchBounceToggle;
			this._extraPitchSettingRows[envelopeIndex] = extraPitchSettingRow;
			this._envelopePhaseSliders[envelopeIndex] = envelopePhaseSlider;
			this._envelopePhaseInputBoxes[envelopeIndex] = envelopePhaseInputBox;
			this._envelopePhaseRows[envelopeIndex] = envelopePhaseRow;
			this._measureInBeatButtons[envelopeIndex] = measureInBeatsButton;
			this._measureInSecondButtons[envelopeIndex] = measureInSecondsButton;
			this._measurementTypeRows[envelopeIndex] = measurementTypeRow;
			this._clapMirrorAmountSliders[envelopeIndex] = clapMirrorAmountSlider;
			this._clapMirrorAmountInputBoxes[envelopeIndex] = clapMirrorAmountInputBox;
			this._clapMirrorAmountRows[envelopeIndex] = clapMirrorAmountRow;
			this._envelopeCopyButtons[envelopeIndex] = envelopeCopyButton;
			this._envelopePasteButtons[envelopeIndex] = envelopePasteButton;
			this._randomEnvelopeButtons[envelopeIndex] = randomEnvelopeButton;
			this._envelopeMoveUpButtons[envelopeIndex] = envelopeMoveUpButton;
			this._envelopeMoveDownButtons[envelopeIndex] = envelopeMoveDownButton;
			this._pitchEnvAutoBoundButtons[envelopeIndex] = pitchEnvAutoBoundButton;
			this._basicCustomPromptButtons[envelopeIndex] = basicCustomPromptButton;
			this._LFOShapeSelects[envelopeIndex] = LFOShapeSelect;
			this._LFOShapeRows[envelopeIndex] = LFOShapeRow;
			this._LFOEnableAccelerationToggles[envelopeIndex] = LFOEnableAccelerationToggle;
			this._LFOLoopOnceToggles[envelopeIndex] = LFOLoopOnceToggle;
			this._LFOIgnoranceToggles[envelopeIndex] = LFOIgnoranceToggle;
			this._LFORadioButtonRows[envelopeIndex] = LFORadioButtonsRow;
			this._LFOAccelerationSliders[envelopeIndex] = LFOAccelerationSlider;
			this._LFOAccelerationInputBoxes[envelopeIndex] = LFOAccelerationInputBox;
			this._LFOAccelerationRows[envelopeIndex] = LFOAccelerationRow;
			this._LFOPulseWidthSliders[envelopeIndex] = LFOPulseWidthSlider;
			this._LFOPulseWidthRows[envelopeIndex] = LFOPulseWidthRow;
			this._LFOTrapezoidRatioSliders[envelopeIndex] = LFOTrapezoidRatioSlider;
			this._LFOTrapezoidRatioRows[envelopeIndex] = LFOTrapezoidRatioRow;
			this._envelopeDropdownGroups[envelopeIndex] = envelopeDropdownGroup;
			this._envelopeDropdowns[envelopeIndex] = envelopeDropdown;
			this._targetSelects[envelopeIndex] = targetSelect;
			this._envelopeSelects[envelopeIndex] = envelopeSelect;
			this._deleteButtons[envelopeIndex] = deleteButton;
		}
		
		for (let envelopeIndex: number = this._renderedEnvelopeCount; envelopeIndex < instrument.envelopeCount; envelopeIndex++) {
			this._rows[envelopeIndex].style.display = "";
			// For newly visible rows, update target option visibiliy.
			this._updateTargetOptionVisibility(this._targetSelects[envelopeIndex], instrument);
		}
		
		for (let envelopeIndex: number = instrument.envelopeCount; envelopeIndex < this._renderedEnvelopeCount; envelopeIndex++) {
			this._rows[envelopeIndex].style.display = "none";
		}

		let useControlPointCount: number = instrument.noteFilter.controlPointCount;
		if (instrument.noteFilterType) useControlPointCount = 1;
		
		if (this._renderedEqFilterCount != instrument.eqFilter.controlPointCount ||
			this._renderedNoteFilterCount != useControlPointCount ||
			this._renderedInstrumentType != instrument.type ||
			this._renderedEffects != instrument.effects)
		{
			// Update target option visibility for previously visible rows.
			for (let envelopeIndex: number = 0; envelopeIndex < this._renderedEnvelopeCount; envelopeIndex++) {
				this._updateTargetOptionVisibility(this._targetSelects[envelopeIndex], instrument);
			}
		}
		
		for (let envelopeIndex: number = 0; envelopeIndex < instrument.envelopeCount; envelopeIndex++) {
			const instEnv = instrument.envelopes[envelopeIndex];
			this._envelopePlotters[envelopeIndex].render();
			this._envelopeStartPlotterLines[envelopeIndex].render();
			this._plotterTimeRangeInputBoxes[envelopeIndex].value = String(clamp(0.1, 201, this._envelopePlotters[envelopeIndex].range));
			this._perEnvelopeSpeedSliders[envelopeIndex].value = String(clamp(Config.perEnvelopeSpeedMin, Config.perEnvelopeSpeedMax+1, instEnv.envelopeSpeed));
			this._perEnvelopeSpeedInputBoxes[envelopeIndex].value = String(clamp(Config.perEnvelopeSpeedMin, Config.perEnvelopeSpeedMax+1, instEnv.envelopeSpeed));
			this._discreteEnvelopeToggles[envelopeIndex].checked = instEnv.discrete ? true : false;
			this._lowerBoundSliders[envelopeIndex].value = String(clamp(Config.lowerBoundMin, Config.lowerBoundMax+1, instEnv.lowerBound));
			this._upperBoundSliders[envelopeIndex].value = String(clamp(Config.upperBoundMin, Config.upperBoundMax+1, instEnv.upperBound));
			this._lowerBoundInputBoxes[envelopeIndex].value = String(clamp(Config.lowerBoundMin, Config.lowerBoundMax+1, instEnv.lowerBound));
			this._upperBoundInputBoxes[envelopeIndex].value = String(clamp(Config.upperBoundMin, Config.upperBoundMax+1, instEnv.upperBound));
			this._envelopeDelaySliders[envelopeIndex].value = String(clamp(0, Config.envelopeDelayMax+1, instEnv.delay));
			this._envelopeDelayInputBoxes[envelopeIndex].value = String(clamp(0, Config.envelopeDelayMax+1, instEnv.delay));
			// Reset min/max for pitch envelope UI elements before resetting value.
			this._pitchStartSliders[envelopeIndex].min = (drumPitchEnvBoolean ? 1 : 0).toString();
			this._pitchStartSliders[envelopeIndex].max = (drumPitchEnvBoolean ? Config.drumCount : Config.maxPitch).toString();
			this._pitchStartInputBoxes[envelopeIndex].min = (drumPitchEnvBoolean ? 1 : 0).toString();
			this._pitchStartInputBoxes[envelopeIndex].max = (drumPitchEnvBoolean ? Config.drumCount : Config.maxPitch).toString();
			this._pitchEndSliders[envelopeIndex].min = (drumPitchEnvBoolean ? 1 : 0).toString();
			this._pitchEndSliders[envelopeIndex].max = (drumPitchEnvBoolean ? Config.drumCount : Config.maxPitch).toString();
			this._pitchEndInputBoxes[envelopeIndex].min = (drumPitchEnvBoolean ? 1 : 0).toString();
			this._pitchEndInputBoxes[envelopeIndex].max = (drumPitchEnvBoolean ? Config.drumCount : Config.maxPitch).toString();
			this._pitchStartSliders[envelopeIndex].value = String(clamp(drumPitchEnvBoolean ? 1 : 0, (drumPitchEnvBoolean ? Config.drumCount+1 : Config.maxPitch+1), instEnv.pitchStart));
			this._pitchStartInputBoxes[envelopeIndex].value = String(clamp(drumPitchEnvBoolean ? 1 : 0, (drumPitchEnvBoolean ? Config.drumCount+1 : Config.maxPitch+1), instEnv.pitchStart));
			this._pitchStartNoteTexts[envelopeIndex].textContent = String(_.pitchStartLabel + this._pitchToNote(parseInt(this._pitchStartInputBoxes[envelopeIndex].value), drumPitchEnvBoolean) + ":");
			this._pitchEndSliders[envelopeIndex].value = String(clamp(drumPitchEnvBoolean ? 1 : 0, (drumPitchEnvBoolean ? Config.drumCount+1 : Config.maxPitch+1), instEnv.pitchEnd));
			this._pitchEndInputBoxes[envelopeIndex].value = String(clamp(drumPitchEnvBoolean ? 1 : 0, (drumPitchEnvBoolean ? Config.drumCount+1 : Config.maxPitch+1), instEnv.pitchEnd));
			this._pitchEndNoteTexts[envelopeIndex].textContent = String(_.pitchEndLabel + this._pitchToNote(parseInt(this._pitchEndInputBoxes[envelopeIndex].value), drumPitchEnvBoolean) + ":");
			this._pitchAmplifyToggles[envelopeIndex].checked = instEnv.pitchAmplify ? true : false;
			this._pitchBounceToggles[envelopeIndex].checked = instEnv.pitchBounce ? true : false;
			this._envelopePhaseSliders[envelopeIndex].value = String(clamp(0, Config.envelopePhaseMax+1, instEnv.phase));
			this._envelopePhaseInputBoxes[envelopeIndex].value = String(clamp(0, Config.envelopePhaseMax+1, instEnv.phase));
			if (instEnv.measurementType) {
				this._measureInBeatButtons[envelopeIndex].classList.remove("deactivated");
				this._measureInSecondButtons[envelopeIndex].classList.add("deactivated");
			} else {
				this._measureInBeatButtons[envelopeIndex].classList.add("deactivated");
				this._measureInSecondButtons[envelopeIndex].classList.remove("deactivated");
			}
			this._clapMirrorAmountSliders[envelopeIndex].value = String(clamp(1, Config.clapMirrorsMax+1, instEnv.mirrorAmount));
			this._clapMirrorAmountInputBoxes[envelopeIndex].value = String(clamp(1, Config.clapMirrorsMax+1, instEnv.mirrorAmount));
			this._LFOShapeSelects[envelopeIndex].selectedIndex = instEnv.LFOSettings.LFOShape;
			this._LFOEnableAccelerationToggles[envelopeIndex].checked = instEnv.LFOSettings.LFOAllowAccelerate ? true : false;
			this._LFOLoopOnceToggles[envelopeIndex].checked = instEnv.LFOSettings.LFOLoopOnce ? true : false;
			this._LFOIgnoranceToggles[envelopeIndex].checked = instEnv.LFOSettings.LFOIgnorance ? true : false;
			this._LFOAccelerationSliders[envelopeIndex].value = String(clamp(Config.LFOAccelerationMin, Config.LFOAccelerationMax+1, instEnv.LFOSettings.LFOAcceleration));
			this._LFOAccelerationInputBoxes[envelopeIndex].value = String(clamp(Config.LFOAccelerationMin, Config.LFOAccelerationMax+1, instEnv.LFOSettings.LFOAcceleration));
			this._LFOPulseWidthSliders[envelopeIndex].value = String(clamp(0, 21, instEnv.LFOSettings.LFOPulseWidth));
			this._LFOTrapezoidRatioSliders[envelopeIndex].value = String(clamp(Config.LFOTrapezoidRatioMin, Config.LFOTrapezoidRatioMax+1, instEnv.LFOSettings.LFOTrapezoidRatio));
			this._LFOStairsStepAmountSliders[envelopeIndex].value = String(clamp(1, Config.LFOStairsStepAmountMax+1, instEnv.LFOSettings.LFOStepAmount));
			this._LFOStairsStepAmountInputBoxes[envelopeIndex].value = String(clamp(1, Config.LFOStairsStepAmountMax+1, instEnv.LFOSettings.LFOStepAmount));
			this._envelopeMoveUpButtons[envelopeIndex].disabled = !(this._doc.prefs.showEnvReorderButtons);
			this._envelopeMoveDownButtons[envelopeIndex].disabled = !(this._doc.prefs.showEnvReorderButtons);
			this._pitchEnvAutoBoundButtons[envelopeIndex].disabled = !(instEnv.envelope == Config.envelopes.dictionary["pitch"].index);
			this._basicCustomPromptButtons[envelopeIndex].disabled = !(instEnv.envelope == Config.envelopes.dictionary["custom (basic)"].index);
			this._targetSelects[envelopeIndex].value = String(instEnv.target + instEnv.index * Config.instrumentAutomationTargets.length);
			this._envelopeSelects[envelopeIndex].selectedIndex = instEnv.envelope;
			this._targetSelects[envelopeIndex].style.minWidth = this._doc.prefs.showEnvReorderButtons ? "" : "116px";
			this._targetSelects[envelopeIndex].style.marginLeft = this._doc.prefs.showEnvReorderButtons ? "" : "-27px";
			this._envelopeCopyButtons[envelopeIndex].style.marginLeft = this._doc.prefs.showEnvReorderButtons ? "" : "-27px";
			this._envelopeSelects[envelopeIndex].style.minWidth = (this._doc.prefs.showEnvReorderButtons || (instEnv.envelope == Config.envelopes.dictionary["pitch"].index || instEnv.envelope == Config.envelopes.dictionary["custom (basic)"].index)) ? "" : "116px";
			this._envelopeSelects[envelopeIndex].style.maxWidth = (instEnv.envelope == Config.envelopes.dictionary["pitch"].index || instEnv.envelope == Config.envelopes.dictionary["custom (basic)"].index) ? this._doc.prefs.showEnvReorderButtons ? "61px" : "88px" : "";
			this._envelopeSelects[envelopeIndex].style.marginLeft = this._doc.prefs.showEnvReorderButtons ? "" : "-27px";
			this._envelopePasteButtons[envelopeIndex].style.marginLeft = this._doc.prefs.showEnvReorderButtons ? "" : "-27px";
			
			if ( // Special case on envelope plotters
				instEnv.envelope == Config.envelopes.dictionary["none"].index ||
				instEnv.envelope == Config.envelopes.dictionary["note size"].index ||
				instEnv.envelope == Config.envelopes.dictionary["pitch"].index
			) {
				this._envelopePlotterRows[envelopeIndex].style.display = "none";
				this._plotterTimeRangeRows[envelopeIndex].style.display = "none";
			} else {
				this._envelopePlotterRows[envelopeIndex].style.display = "";
				this._plotterTimeRangeRows[envelopeIndex].style.display = "";
			}

			if ( // Special case on IES
				instEnv.envelope == Config.envelopes.dictionary["none"].index ||
				instEnv.envelope == Config.envelopes.dictionary["note size"].index ||
				instEnv.envelope == Config.envelopes.dictionary["pitch"].index
			) {
				this._perEnvelopeSpeedRows[envelopeIndex].style.display = "none";
			} else {
				this._perEnvelopeSpeedRows[envelopeIndex].style.display = "";
			}

			// Special case on discrete toggles.
			if (
				instEnv.envelope == Config.envelopes.dictionary["none"].index ||
				instEnv.envelope == Config.envelopes.dictionary["pitch"].index
			) {
				this._discreteEnvelopeRows[envelopeIndex].style.display = "none";
			} else { 
				this._discreteEnvelopeRows[envelopeIndex].style.display = "";
			}

			if ( // Special case on lower/upper boundaries.
				instEnv.envelope == Config.envelopes.dictionary["none"].index
			) {
				this._lowerBoundRows[envelopeIndex].style.display = "none";
				this._upperBoundRows[envelopeIndex].style.display = "none";
			} else {
				this._lowerBoundRows[envelopeIndex].style.display = "";
				this._upperBoundRows[envelopeIndex].style.display = "";
			}

			if ( // Special case on mirror amount.
				instEnv.envelope == Config.envelopes.dictionary["dogebox2 clap"].index
			) {
				this._clapMirrorAmountRows[envelopeIndex].style.display = "";
			} else {
				this._clapMirrorAmountRows[envelopeIndex].style.display = "none";
			}

			if ( // Special case on delay and phase.
				instEnv.envelope == Config.envelopes.dictionary["none"].index ||
				instEnv.envelope == Config.envelopes.dictionary["note size"].index ||
				instEnv.envelope == Config.envelopes.dictionary["pitch"].index
			) {
				this._measurementTypeRows[envelopeIndex].style.display = "none";
				this._envelopeDelayRows[envelopeIndex].style.display = "none";
				this._envelopePhaseRows[envelopeIndex].style.display = "none";
			} else {
				this._measurementTypeRows[envelopeIndex].style.display = "";
				this._envelopeDelayRows[envelopeIndex].style.display = "";
				this._envelopePhaseRows[envelopeIndex].style.display = "";
			}

			if ( // Pitch settings are special-cased to the pitch envelope.
				instEnv.envelope == Config.envelopes.dictionary["pitch"].index
			) {
				this._pitchStartGroups[envelopeIndex].style.display = "";
				this._pitchEndGroups[envelopeIndex].style.display = "";
				this._extraPitchSettingRows[envelopeIndex].style.display = "";
			} else {
				this._pitchStartGroups[envelopeIndex].style.display = "none";
				this._pitchEndGroups[envelopeIndex].style.display = "none";
				this._extraPitchSettingRows[envelopeIndex].style.display = "none";
			}

			if ( // LFO settings are special-cased to the LFO envelope.
				instEnv.envelope == Config.envelopes.dictionary["LFO"].index
			) {
				this._LFOShapeRows[envelopeIndex].style.display = "";
				this._LFORadioButtonRows[envelopeIndex].style.display = "";
				// Acceleration rows are only viewable when their radio button is selected.
				if (instEnv.LFOSettings.LFOAllowAccelerate) {
					this._LFOAccelerationRows[envelopeIndex].style.display = "";
				} else {
					this._LFOAccelerationRows[envelopeIndex].style.display = "none";
				}
				// Pulse width is special-cased to the "pulses" LFO shape.
				if (instEnv.LFOSettings.LFOShape == LFOShapes.Pulses) { 
					this._LFOPulseWidthRows[envelopeIndex].style.display = "";
				} else {
					this._LFOPulseWidthRows[envelopeIndex].style.display = "none";
				}
				// Trapezoid ratio is special-cased to the "trapezoid" LFO shape.
				if (instEnv.LFOSettings.LFOShape == LFOShapes.Trapezoid) { 
					this._LFOTrapezoidRatioRows[envelopeIndex].style.display = "";
				} else {
					this._LFOTrapezoidRatioRows[envelopeIndex].style.display = "none";
				}
				// Step amount is special-cased to the "stairs" LFO shape.
				if (instEnv.LFOSettings.LFOShape == LFOShapes.Stairs) { 
					this._LFOStairsStepAmountRows[envelopeIndex].style.display = "";
				} else {
					this._LFOStairsStepAmountRows[envelopeIndex].style.display = "none";
				}
			} else {
				this._LFOShapeRows[envelopeIndex].style.display = "none";
				this._LFORadioButtonRows[envelopeIndex].style.display = "none";
				this._LFOAccelerationRows[envelopeIndex].style.display = "none";
				this._LFOPulseWidthRows[envelopeIndex].style.display = "none";
				this._LFOTrapezoidRatioRows[envelopeIndex].style.display = "none";
				this._LFOStairsStepAmountRows[envelopeIndex].style.display = "none";
			}
		}
		
		this._renderedEnvelopeCount = instrument.envelopeCount;
		this._renderedEqFilterCount = instrument.eqFilter.controlPointCount;
		this._renderedNoteFilterCount = useControlPointCount;
		this._renderedInstrumentType = instrument.type;
		this._renderedEffects = instrument.effects;
	}

	private _switchMeasurementType(type: boolean, index: number) {
		const measurementType = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()].envelopes[index].measurementType;
		this._doc.record(new ChangeMeasurementType(this._doc, index, measurementType, type));
    }

	private _copyEnvelopeSettings(copiedIndex: number): void {
		let instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
		let envelope = instrument.envelopes[copiedIndex];
		const envelopeCopy: any = envelope.toJsonObject(instrument);
		window.localStorage.setItem("envelopeCopy", JSON.stringify(envelopeCopy));
	}

	private _pasteEnvelopeSettings(pasteIndex: number): void {
		let instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
		const storedEnvelope: any = JSON.parse(String(window.localStorage.getItem("envelopeCopy")));
		this._doc.record(new ChangePasteEnvelope(this._doc, instrument, instrument.envelopes[pasteIndex], storedEnvelope));
	}

	private _randomizeEnvelope(envelopeIndex: number): void {
		let instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
		this._doc.record(new RandomEnvelope(this._doc, envelopeIndex, instrument));
	}

	private _toggleDropdownMenu(dropdown: DropdownID, submenu: number = 0): void {
        let target: HTMLButtonElement = this._envelopeDropdowns[submenu];
        let group: HTMLElement = this._envelopeDropdownGroups[submenu];
        switch (dropdown) {
            case DropdownID.Envelope:
                target = this._envelopeDropdowns[submenu];
                this._openPerEnvelopeDropdowns[submenu] = this._openPerEnvelopeDropdowns[submenu] ? false : true;
                group = this._envelopeDropdownGroups[submenu];
                break;
        }

        if (target.textContent == "▼") {
            target.textContent = "▲";
			group.style.display = "";
            for (let i: number = 0; i < group.children.length; i++) {
                // A timeout is needed so that the previous 0s, 0 opacity settings can be applied. They're not done until the group is visible again because display: none prunes animation steps.
                setTimeout(() => {
                    (group.children[i] as HTMLElement).style.animationDelay = '0.17s';
                    (group.children[i] as HTMLElement).style.opacity = '1';}
                );
            }
        } else {
            for (let i: number = 0; i < group.children.length; i++) {
                (group.children[i] as HTMLElement).style.animationDelay = '0s';
                (group.children[i] as HTMLElement).style.opacity = '0';
            }
            target.textContent = "▼";
            group.style.display = "none";
        }
    }
}
