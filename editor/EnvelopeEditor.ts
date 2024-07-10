// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import {InstrumentType, Config, DropdownID} from "../synth/SynthConfig";
import {Instrument, EnvelopeComputer} from "../synth/synth";
import {ColorConfig} from "./ColorConfig";
import {SongDocument} from "./SongDocument";
import {ChangeSetEnvelopeTarget, ChangeSetEnvelopeType, ChangeRemoveEnvelope, ChangePerEnvelopeSpeed, ChangeDiscreteEnvelope, ChangeLowerBound, ChangeUpperBound, ChangeStairsStepAmount, ChangeEnvelopeDelay, ChangePitchEnvelopeStart, ChangePitchEnvelopeEnd, ChangePitchAmplify, ChangePitchBounce, ChangeEnvelopePosition, ChangeMeasurementType} from "./changes";
import {HTML} from "imperative-html/dist/esm/elements-strict";
import {Localization as _} from "./Localization";
import {clamp, remap} from "./UsefulCodingStuff";
import {Change} from "./Change";

const {div, span, canvas, option, input, button, select} = HTML;

class EnvelopeLineGraph {
	public range: number = 4;

    constructor(public readonly canvas: HTMLCanvasElement, private readonly _doc: SongDocument, public index: number) {
		this.render();
    }

	private _drawCanvas(graphX: number, graphY: number, graphWidth: number, graphHeight: number): void {
		const envelopeGraph: number[] = [];
		let instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
		let instEnv = instrument.envelopes[this.index];
		let envelope = Config.envelopes[instEnv.envelope];
		let speed: number = instEnv.envelopeSpeed;
		let lowerBound: number = instEnv.lowerBound;
		let upperBound: number = instEnv.upperBound;
		let stepAmount: number = instEnv.stepAmount;
		let delay: number = instEnv.delay;
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
			let value = EnvelopeComputer.computeEnvelope(envelope, seconds, beats, beatNote, noteSize, lowerBound, upperBound, stepAmount, delayInBeats, delayInSeconds, 0, 0, pitch);
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

class EnvelopeStartLine {
	public timeRange: number = 4;

    constructor(public readonly canvas: HTMLCanvasElement, private readonly _doc: SongDocument, public index: number) {
		this.render();
    }

	private _drawCanvas(graphX: number, graphY: number, graphWidth: number, graphHeight: number): void {
		let instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
		let instEnv = instrument.envelopes[this.index];
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
		const triangleWidth: number = 16;
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
	private readonly _stairsStepAmountSliders: HTMLInputElement[] = [];
	private readonly _stairsStepAmountInputBoxes: HTMLInputElement[] = [];
	private readonly _stairsStepAmountRows: HTMLElement[] = [];
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
	
	constructor(private _doc: SongDocument, private _openPrompt: (name: string) => void) {
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

		const plotterTimeRangeInputBoxIndex = this._plotterTimeRangeInputBoxes.indexOf(<any> event.target);
		if (plotterTimeRangeInputBoxIndex != -1) {
			this._changeTimeRange(plotterTimeRangeInputBoxIndex, this._envelopePlotters[plotterTimeRangeInputBoxIndex].range, +(this._plotterTimeRangeInputBoxes[plotterTimeRangeInputBoxIndex].value));
		}

		// For sliders here, we'll only record the change in _onChange(). Instead, just assign the
		// change class to this._lastChange but don't record yet.
		// MID TODO: Reorganize this and _onChange() a tiny bit for my OCD pleaseeeeeeeee
		const perEnvelopeSpeedInputBoxIndex = this._perEnvelopeSpeedInputBoxes.indexOf(<any> event.target);
		const perEnvelopeSpeedSliderIndex = this._perEnvelopeSpeedSliders.indexOf(<any> event.target);
		if (perEnvelopeSpeedInputBoxIndex != -1) {
			this._lastChange = new ChangePerEnvelopeSpeed(this._doc, perEnvelopeSpeedInputBoxIndex, instrument.envelopes[perEnvelopeSpeedInputBoxIndex].envelopeSpeed, +(this._perEnvelopeSpeedInputBoxes[perEnvelopeSpeedInputBoxIndex].value));
		}
		if (perEnvelopeSpeedSliderIndex != -1) {
			this._perEnvelopeSpeedInputBoxes[perEnvelopeSpeedSliderIndex].value = this._perEnvelopeSpeedSliders[perEnvelopeSpeedSliderIndex].value;
			this._lastChange = new ChangePerEnvelopeSpeed(this._doc, perEnvelopeSpeedSliderIndex, instrument.envelopes[perEnvelopeSpeedSliderIndex].envelopeSpeed, +(this._perEnvelopeSpeedSliders[perEnvelopeSpeedSliderIndex].value));
		}
		const discreteEnvelopeToggleIndex = this._discreteEnvelopeToggles.indexOf(<any> event.target);
		if (discreteEnvelopeToggleIndex != -1) {
			this._doc.record(new ChangeDiscreteEnvelope(this._doc, discreteEnvelopeToggleIndex, this._discreteEnvelopeToggles[discreteEnvelopeToggleIndex].checked));
		}
		const lowerBoundInputBoxIndex = this._lowerBoundInputBoxes.indexOf(<any> event.target);
		const lowerBoundSliderIndex = this._lowerBoundSliders.indexOf(<any> event.target);
		const upperBoundInputBoxIndex = this._upperBoundInputBoxes.indexOf(<any> event.target);
		const upperBoundSliderIndex = this._upperBoundSliders.indexOf(<any> event.target);
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
		const stairsStepAmountInputBoxIndex = this._stairsStepAmountInputBoxes.indexOf(<any> event.target);
		const stairsStepAmountSliderIndex = this._stairsStepAmountSliders.indexOf(<any> event.target);
		if (stairsStepAmountInputBoxIndex != -1) {
			this._lastChange = new ChangeStairsStepAmount(this._doc, stairsStepAmountInputBoxIndex, instrument.envelopes[stairsStepAmountInputBoxIndex].stepAmount, +(this._stairsStepAmountInputBoxes[stairsStepAmountInputBoxIndex].value));
		}
		if (stairsStepAmountSliderIndex != -1) {
			this._stairsStepAmountInputBoxes[stairsStepAmountSliderIndex].value = this._stairsStepAmountSliders[stairsStepAmountSliderIndex].value;
			this._lastChange = new ChangeStairsStepAmount(this._doc, stairsStepAmountSliderIndex, instrument.envelopes[stairsStepAmountSliderIndex].stepAmount, +(this._stairsStepAmountSliders[stairsStepAmountSliderIndex].value));
		}
		const envelopeDelayInputBoxIndex = this._envelopeDelayInputBoxes.indexOf(<any> event.target);
		const envelopeDelaySliderIndex = this._envelopeDelaySliders.indexOf(<any> event.target);
		if (envelopeDelayInputBoxIndex != -1) {
			this._lastChange = new ChangeEnvelopeDelay(this._doc, envelopeDelayInputBoxIndex, instrument.envelopes[envelopeDelayInputBoxIndex].delay, +(this._envelopeDelayInputBoxes[envelopeDelayInputBoxIndex].value));
		}
		if (envelopeDelaySliderIndex != -1) {
			this._envelopeDelayInputBoxes[envelopeDelaySliderIndex].value = this._envelopeDelaySliders[envelopeDelaySliderIndex].value;
			this._lastChange = new ChangeEnvelopeDelay(this._doc, envelopeDelaySliderIndex, instrument.envelopes[envelopeDelaySliderIndex].delay, +(this._envelopeDelaySliders[envelopeDelaySliderIndex].value));
		}
		const startInputBoxIndex = this._pitchStartInputBoxes.indexOf(<any>event.target);
		const endInputBoxIndex = this._pitchEndInputBoxes.indexOf(<any>event.target);
		const startSliderIndex = this._pitchStartSliders.indexOf(<any>event.target);
		const endSliderIndex = this._pitchEndSliders.indexOf(<any>event.target);
		if (startInputBoxIndex != -1) {
			this._lastChange = new ChangePitchEnvelopeStart(this._doc, startInputBoxIndex, instrument.envelopes[startInputBoxIndex].pitchStart, +(this._pitchStartInputBoxes[startInputBoxIndex].value));
		}
		if (endInputBoxIndex != -1) {
			this._lastChange = new ChangePitchEnvelopeEnd(this._doc, endInputBoxIndex, instrument.envelopes[endInputBoxIndex].pitchEnd, +(this._pitchEndInputBoxes[endInputBoxIndex].value));
		} 
		if (startSliderIndex != -1) {
			this._pitchStartInputBoxes[startSliderIndex].value = this._pitchStartSliders[startSliderIndex].value;
			this._pitchStartNoteTexts[startSliderIndex].textContent = String(_.pitchStartLabel + this._pitchToNote(parseInt(this._pitchStartInputBoxes[startSliderIndex].value)) + ":");
			this._lastChange = new ChangePitchEnvelopeStart(this._doc, startSliderIndex, instrument.envelopes[startSliderIndex].pitchStart, +(this._pitchStartSliders[startSliderIndex].value));
		} 
		if (endSliderIndex != -1) {
			this._pitchEndInputBoxes[endSliderIndex].value = this._pitchEndSliders[endSliderIndex].value;
			this._pitchEndNoteTexts[endSliderIndex].textContent = String(_.pitchEndLabel + this._pitchToNote(parseInt(this._pitchEndInputBoxes[endSliderIndex].value)) + ":");
			this._lastChange = new ChangePitchEnvelopeEnd(this._doc, endSliderIndex, instrument.envelopes[endSliderIndex].pitchEnd, +(this._pitchEndSliders[endSliderIndex].value));
		}
		const pitchAmplifyToggleIndex = this._pitchAmplifyToggles.indexOf(<any> event.target);
		const pitchBounceToggleIndex = this._pitchBounceToggles.indexOf(<any> event.target);
		if (pitchAmplifyToggleIndex != -1) {
			this._doc.record(new ChangePitchAmplify(this._doc, pitchAmplifyToggleIndex, this._pitchAmplifyToggles[pitchAmplifyToggleIndex].checked));
		}
		if (pitchBounceToggleIndex != -1) {
			this._doc.record(new ChangePitchBounce(this._doc, pitchBounceToggleIndex, this._pitchBounceToggles[pitchBounceToggleIndex].checked));
		}
		const envelopePhaseInputBoxIndex = this._envelopePhaseInputBoxes.indexOf(<any> event.target);
		const envelopePhaseSliderIndex = this._envelopePhaseSliders.indexOf(<any> event.target);
		if (envelopePhaseInputBoxIndex != -1) {
			this._lastChange = new ChangeEnvelopePosition(this._doc, envelopePhaseInputBoxIndex, instrument.envelopes[envelopePhaseInputBoxIndex].phase, +(this._envelopePhaseInputBoxes[envelopePhaseInputBoxIndex].value));
		}
		if (envelopePhaseSliderIndex != -1) {
			this._envelopePhaseInputBoxes[envelopePhaseSliderIndex].value = this._envelopePhaseSliders[envelopePhaseSliderIndex].value;
			this._lastChange = new ChangeEnvelopePosition(this._doc, envelopePhaseSliderIndex, instrument.envelopes[envelopePhaseSliderIndex].phase, +(this._envelopePhaseSliders[envelopePhaseSliderIndex].value));
		}
	};

	private _onChange = (event: Event): void => {
		const targetSelectIndex: number = this._targetSelects.indexOf(<any> event.target);
		const envelopeSelectIndex: number = this._envelopeSelects.indexOf(<any> event.target);
		if (targetSelectIndex != -1) {
			const combinedValue: number = parseInt(this._targetSelects[targetSelectIndex].value);
			const target: number = combinedValue % Config.instrumentAutomationTargets.length;
			const index: number = (combinedValue / Config.instrumentAutomationTargets.length) >>> 0;
			this._doc.record(new ChangeSetEnvelopeTarget(this._doc, targetSelectIndex, target, index));
		} else if (envelopeSelectIndex != -1) {
			this._doc.record(new ChangeSetEnvelopeType(this._doc, envelopeSelectIndex, this._envelopeSelects[envelopeSelectIndex].selectedIndex));
		}
		const perEnvelopeSpeedInputBoxIndex = this._perEnvelopeSpeedInputBoxes.indexOf(<any> event.target);
		const perEnvelopeSpeedSliderIndex = this._perEnvelopeSpeedSliders.indexOf(<any> event.target);
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
		const lowerBoundInputBoxIndex = this._lowerBoundInputBoxes.indexOf(<any> event.target);
		const upperBoundInputBoxIndex = this._upperBoundInputBoxes.indexOf(<any> event.target);
		const lowerBoundSliderIndex = this._lowerBoundSliders.indexOf(<any> event.target);
		const upperBoundSliderIndex = this._upperBoundSliders.indexOf(<any> event.target);
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
		const stairsStepAmountInputBoxIndex = this._stairsStepAmountInputBoxes.indexOf(<any> event.target);
		const stairsStepAmountSliderIndex = this._stairsStepAmountSliders.indexOf(<any> event.target);
		if (stairsStepAmountInputBoxIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		if (stairsStepAmountSliderIndex != -1) {
			if (this._lastChange != null) {
				this._doc.record(this._lastChange);
				this._lastChange = null;
			}
		}
		const envelopeDelayInputBoxIndex = this._envelopeDelayInputBoxes.indexOf(<any> event.target);
		const envelopeDelaySliderIndex = this._envelopeDelaySliders.indexOf(<any> event.target);
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
		const startInputBoxIndex = this._pitchStartInputBoxes.indexOf(<any>event.target);
		const endInputBoxIndex = this._pitchEndInputBoxes.indexOf(<any>event.target);
		const startSliderIndex = this._pitchStartSliders.indexOf(<any>event.target);
		const endSliderIndex = this._pitchEndSliders.indexOf(<any>event.target);
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
		const envelopePhaseInputBoxIndex = this._envelopePhaseInputBoxes.indexOf(<any> event.target);
		const envelopePhaseSliderIndex = this._envelopePhaseSliders.indexOf(<any> event.target);
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
	}

	private _changeTimeRange(envelopeIndex: number, oldValue: number, newValue: number): void {
        if (oldValue != newValue) {
            this._envelopePlotters[envelopeIndex].range = newValue;
			this._envelopeStartPlotterLines[envelopeIndex].timeRange = newValue;
            this._doc.notifier.changed();
        }
	}

	private _onClick = (event: MouseEvent): void => {
		const index: number = this._deleteButtons.indexOf(<any> event.target);
		if (index != -1) {
			this._doc.record(new ChangeRemoveEnvelope(this._doc, index));
		}
	}

	private _typingInInput = (event: KeyboardEvent): void => {
		const plotterTimeRangeInputBoxIndex: number = this._plotterTimeRangeInputBoxes.indexOf(<any> event.target);
		if (plotterTimeRangeInputBoxIndex != -1) {
			event.stopPropagation();
		}
		const perEnvelopeSpeedInputBoxIndex: number = this._perEnvelopeSpeedInputBoxes.indexOf(<any> event.target);
		if (perEnvelopeSpeedInputBoxIndex != -1) {
			event.stopPropagation();
		}
		const lowerBoundInputBoxIndex: number = this._lowerBoundInputBoxes.indexOf(<any> event.target);
		if (lowerBoundInputBoxIndex != -1) {
			event.stopPropagation();
		}
		const upperBoundInputBoxIndex: number = this._upperBoundInputBoxes.indexOf(<any> event.target);
		if (upperBoundInputBoxIndex != -1) {
			event.stopPropagation();
		}
		const stairsStepAmountInputBoxIndex: number = this._stairsStepAmountInputBoxes.indexOf(<any> event.target);
		if (stairsStepAmountInputBoxIndex != -1) {
			event.stopPropagation();
		}
		const envelopeDelayInputBoxIndex: number = this._envelopeDelayInputBoxes.indexOf(<any> event.target);
		if (envelopeDelayInputBoxIndex != -1) {
			event.stopPropagation();
		}
		const startInputBoxIndex: number = this._pitchStartInputBoxes.indexOf(<any>event.target);
		if (startInputBoxIndex != -1) {
			event.stopPropagation();
		}
		const endInputBoxIndex: number = this._pitchEndInputBoxes.indexOf(<any>event.target);
		if (endInputBoxIndex != -1) {
			event.stopPropagation();
		}
		const envelopePhaseInputBoxIndex: number = this._envelopePhaseInputBoxes.indexOf(<any>event.target);
		if (envelopePhaseInputBoxIndex != -1) {
			event.stopPropagation();
		}
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

	private _pitchToNote(value: number): string {
		let text = "";
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
			const envelopePlotter: EnvelopeLineGraph = new EnvelopeLineGraph(canvas({ width: 180, height: 80, style: `border: 2px solid ${ColorConfig.uiWidgetBackground}; width: 140px; height: 60px; margin-left: 24px;`, id: "EnvelopeLineGraph" }), this._doc, envelopeIndex);
			const envelopeStartPlotLine: EnvelopeStartLine = new EnvelopeStartLine(canvas({ width: 180, height: 90, style: `width: 142px; height: 70px; top: -6px; right: -1px; position: relative; margin-left: 24px;`, id: "EnvelopeStartPlotLine" }), this._doc, envelopeIndex);
			const envelopePlotterRow: HTMLElement = div({class: "selectRow dropFader", style: "margin-top: 18px; margin-bottom: 25px;"}, envelopePlotter.canvas, envelopeStartPlotLine.canvas);
			const plotterTimeRangeInputBox: HTMLInputElement = input({style: "width: 13.1em; font-size: 80%; margin-left: 0px; vertical-align: middle;", id: "timeRangeInputBox", type: "number", step: "0.1", min: "0.1", max: "200", value: "4"});
			const plotterTimeRangeRow: HTMLElement = div({ class: "selectRow dropFader", style: "margin-left: 25px; margin-bottom: 20px;" }, div({},
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
			const stairsStepAmountSlider: HTMLInputElement = input({style: "margin: 0;", type: "range", min: 1, max: Config.stairsStepAmountMax, value: "4", step: "1"});
			const stairsStepAmountInputBox: HTMLInputElement = input({style: "width: 4em; font-size: 80%; ", id: "stairsStepAmountInputBox", type: "number", step: "1", min: 1, max: Config.stairsStepAmountMax, value: "4"});
			const stairsStepAmountRow: HTMLElement = div({class: "selectRow dropFader"}, div({},
				span({class: "tip", style: "height: 1em; font-size: 12px;", onclick: () => this._openPrompt("stepAmount")}, span(_.stairsStepAmountLabel)),
				div({style: `color: ${ColorConfig.secondaryText}; margin-top: -3px;`}, stairsStepAmountInputBox),
			), stairsStepAmountSlider);
			const envelopeDelaySlider: HTMLInputElement = input({style: "margin: 0;", type: "range", min: 0, max: Config.envelopeDelayMax, value: "0", step: "0.5"});
			const envelopeDelayInputBox: HTMLInputElement = input({style: "width: 4em; font-size: 80%; ", id: "envelopeDelayInputBox", type: "number", step: "0.01", min: 0, max: Config.envelopeDelayMax, value: "0"});
			const envelopeDelayRow: HTMLElement = div({class: "selectRow dropFader"}, div({},
				span({class: "tip", style: "height: 1em; font-size: 12px;", onclick: () => this._openPrompt("envelopeDelay")}, span(_.envelopeDelayLabel)),
				div({style: `color: ${ColorConfig.secondaryText}; margin-top: -3px;`}, envelopeDelayInputBox),
			), envelopeDelaySlider);
			const pitchStartSlider: HTMLInputElement = input({style: "margin: 0;", type: "range", min: drumPitchEnvBoolean ? 1 : 0, max: drumPitchEnvBoolean ? Config.drumCount : Config.maxPitch, value: "0", step: "1"});
			const pitchStartInputBox: HTMLInputElement = input({style: "width: 4em; font-size: 80%; ", id: "pitchStartInputBox", type: "number", step: "1", min: drumPitchEnvBoolean ? 1 : 0, max: drumPitchEnvBoolean ? Config.drumCount : Config.maxPitch, value: "0"});
			const pitchStartNoteText: HTMLSpanElement = span({class: "tip", style: "height: 1em; white-space: nowrap; font-size: smaller;", onclick: () => this._openPrompt("pitchEnvelope")}, span(_.pitchStartLabel + this._pitchToNote(parseInt(pitchStartInputBox.value)) + ":"));
			const pitchEndSlider: HTMLInputElement = input({style: "margin: 0;", type: "range", min: drumPitchEnvBoolean ? 1 : 0, max: drumPitchEnvBoolean ? Config.drumCount : Config.maxPitch, value: drumPitchEnvBoolean ? Config.drumCount : Config.maxPitch, step: "1"});
			const pitchEndInputBox: HTMLInputElement = input({style: "width: 4em; font-size: 80%; ", id: "pitchEndInputBox", type: "number", step: "1", min: drumPitchEnvBoolean ? 1 : 0, max: drumPitchEnvBoolean ? Config.drumCount : Config.maxPitch, value: drumPitchEnvBoolean ? Config.drumCount : Config.maxPitch});
			const pitchEndNoteText: HTMLSpanElement = span({class: "tip", style: "height: 1em; white-space: nowrap; font-size: smaller;", onclick: () => this._openPrompt("pitchEnvelope")}, span(_.pitchEndLabel + this._pitchToNote(parseInt(pitchEndInputBox.value)) + ":"));
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
			const envelopeDropdownGroup: HTMLElement = div({class: "editor-controls", style: "display: none;"}, plotterTimeRangeRow, envelopePlotterRow, pitchStartGroup, pitchEndGroup, extraPitchSettingRow, perEnvelopeSpeedRow, discreteEnvelopeRow, lowerBoundRow, upperBoundRow, stairsStepAmountRow, measurementTypeRow, envelopeDelayRow, envelopePhaseRow);
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
			
			const deleteButton: HTMLButtonElement = button({type: "button", class: "delete-envelope"});
			
			const row: HTMLDivElement = div(div({class: "envelope-row"},
				div({style: "width: 0; flex: 0.2; margin-top: 3px;"}, envelopeDropdown),
				div({class: "selectContainer", style: "width: 0; flex: 0.8;"}, targetSelect),
				div({class: "selectContainer", style: "width: 0; flex: 0.7;"}, envelopeSelect),
				deleteButton,
			), envelopeDropdownGroup);
			
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
			this._stairsStepAmountSliders[envelopeIndex] = stairsStepAmountSlider;
			this._stairsStepAmountInputBoxes[envelopeIndex] = stairsStepAmountInputBox;
			this._stairsStepAmountRows[envelopeIndex] = stairsStepAmountRow;
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
			this._stairsStepAmountSliders[envelopeIndex].value = String(clamp(1, Config.stairsStepAmountMax+1, instEnv.stepAmount));
			this._stairsStepAmountInputBoxes[envelopeIndex].value = String(clamp(1, Config.stairsStepAmountMax+1, instEnv.stepAmount));
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
			this._pitchStartNoteTexts[envelopeIndex].textContent = String(_.pitchStartLabel + this._pitchToNote(parseInt(this._pitchStartInputBoxes[envelopeIndex].value)) + ":");
			this._pitchEndSliders[envelopeIndex].value = String(clamp(drumPitchEnvBoolean ? 1 : 0, (drumPitchEnvBoolean ? Config.drumCount+1 : Config.maxPitch+1), instEnv.pitchEnd));
			this._pitchEndInputBoxes[envelopeIndex].value = String(clamp(drumPitchEnvBoolean ? 1 : 0, (drumPitchEnvBoolean ? Config.drumCount+1 : Config.maxPitch+1), instEnv.pitchEnd));
			this._pitchEndNoteTexts[envelopeIndex].textContent = String(_.pitchEndLabel + this._pitchToNote(parseInt(this._pitchEndInputBoxes[envelopeIndex].value)) + ":");
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
			this._targetSelects[envelopeIndex].value = String(instrument.envelopes[envelopeIndex].target + instrument.envelopes[envelopeIndex].index * Config.instrumentAutomationTargets.length);
			this._envelopeSelects[envelopeIndex].selectedIndex = instrument.envelopes[envelopeIndex].envelope;
			
			if ( // Special case on envelope plotters
				instrument.envelopes[envelopeIndex].envelope == Config.envelopes.dictionary["none"].index ||
				instrument.envelopes[envelopeIndex].envelope == Config.envelopes.dictionary["note size"].index ||
				instrument.envelopes[envelopeIndex].envelope == Config.envelopes.dictionary["pitch"].index
			) {
				this._envelopePlotterRows[envelopeIndex].style.display = "none";
				this._plotterTimeRangeRows[envelopeIndex].style.display = "none";
			} else {
				this._envelopePlotterRows[envelopeIndex].style.display = "";
				this._plotterTimeRangeRows[envelopeIndex].style.display = "";
			}

			if ( // Special case on IES
				instrument.envelopes[envelopeIndex].envelope == Config.envelopes.dictionary["none"].index ||
				instrument.envelopes[envelopeIndex].envelope == Config.envelopes.dictionary["note size"].index ||
				instrument.envelopes[envelopeIndex].envelope == Config.envelopes.dictionary["pitch"].index
			) {
				this._perEnvelopeSpeedRows[envelopeIndex].style.display = "none";
			} else {
				this._perEnvelopeSpeedRows[envelopeIndex].style.display = "";
			}

			// Special case on discrete toggles.
			if (
				instrument.envelopes[envelopeIndex].envelope == Config.envelopes.dictionary["none"].index ||
				instrument.envelopes[envelopeIndex].envelope == Config.envelopes.dictionary["pitch"].index
			) {
				this._discreteEnvelopeRows[envelopeIndex].style.display = "none";
			} else { 
				this._discreteEnvelopeRows[envelopeIndex].style.display = "";
			}

			if ( // Special case on lower/upper boundaries.
				instrument.envelopes[envelopeIndex].envelope == Config.envelopes.dictionary["none"].index
			) {
				this._lowerBoundRows[envelopeIndex].style.display = "none";
				this._upperBoundRows[envelopeIndex].style.display = "none";
			} else {
				this._lowerBoundRows[envelopeIndex].style.display = "";
				this._upperBoundRows[envelopeIndex].style.display = "";
			}

			if ( // Special case on step amount.
				instrument.envelopes[envelopeIndex].envelope == Config.envelopes.dictionary["stairs"].index ||
				instrument.envelopes[envelopeIndex].envelope == Config.envelopes.dictionary["looped stairs"].index 
			) {
				this._stairsStepAmountRows[envelopeIndex].style.display = "";
			} else {
				this._stairsStepAmountRows[envelopeIndex].style.display = "none";
			}

			if ( // Special case on delay and phase.
				instrument.envelopes[envelopeIndex].envelope == Config.envelopes.dictionary["none"].index ||
				instrument.envelopes[envelopeIndex].envelope == Config.envelopes.dictionary["note size"].index ||
				instrument.envelopes[envelopeIndex].envelope == Config.envelopes.dictionary["pitch"].index
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
				instrument.envelopes[envelopeIndex].envelope == Config.envelopes.dictionary["pitch"].index
			) {
				this._pitchStartGroups[envelopeIndex].style.display = "";
				this._pitchEndGroups[envelopeIndex].style.display = "";
				this._extraPitchSettingRows[envelopeIndex].style.display = "";
			} else {
				this._pitchStartGroups[envelopeIndex].style.display = "none";
				this._pitchEndGroups[envelopeIndex].style.display = "none";
				this._extraPitchSettingRows[envelopeIndex].style.display = "none";
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
		this._doc.record(new ChangeMeasurementType(this._doc, index, measurementType, type))
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
        }
        else {
            for (let i: number = 0; i < group.children.length; i++) {
                (group.children[i] as HTMLElement).style.animationDelay = '0s';
                (group.children[i] as HTMLElement).style.opacity = '0';
            }
            target.textContent = "▼";
            group.style.display = "none";
        }
    }
}
