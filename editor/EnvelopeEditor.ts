// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import {InstrumentType, Config, DropdownID, Envelope} from "../synth/SynthConfig";
import {Instrument, EnvelopeSettings} from "../synth/synth";
import {ColorConfig} from "./ColorConfig";
import {SongDocument} from "./SongDocument";
import {ChangeSetEnvelopeTarget, ChangeSetEnvelopeType, ChangeRemoveEnvelope, ChangePerEnvelopeSpeed, ChangeDiscreteEnvelope, ChangeLowerBound, ChangeUpperBound, ChangeStairsStepAmount, ChangeEnvelopeDelay} from "./changes";
import {HTML} from "imperative-html/dist/esm/elements-strict";
import {Localization as _} from "./Localization";
import {clamp} from "./UsefulCodingStuff";
import {envelopeLineGraph} from "../global/EnvelopePlotter";
import {events} from "../global/Events";
import {EnvelopeComputer} from "../synth/synth";

export class EnvelopeEditor {
	public readonly container: HTMLElement = HTML.div({class: "envelopeEditor"});
	
	// Everything must be declared as arrays for each envelope
	// Properly given styles and what not in render()
	private readonly _rows: HTMLDivElement[] = [];
	private readonly _envelopePlotters: envelopeLineGraph[] = [];
	private readonly _envelopePlotterRows: HTMLElement[] = [];
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
	private readonly _envelopeDropdownGroups: HTMLElement[] = [];
	private readonly _envelopeDropdowns: HTMLButtonElement[] = [];
	private readonly _targetSelects: HTMLSelectElement[] = [];
	private readonly _envelopeSelects: HTMLSelectElement[] = [];
	private readonly _deleteButtons: HTMLButtonElement[] = [];
	private _renderedEnvelopeCount: number = 0;
	private _renderedEqFilterCount: number = -1;
	private _renderedNoteFilterCount: number = -1;
	private _renderedInstrumentType: InstrumentType;
	private _renderedEffects: number = 0;
	private _openPerEnvelopeDropdowns: boolean[] = [];
	private _values: number[] = [];
	private _computeEnvelope: Function = EnvelopeComputer.computeEnvelope;
	
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
			this._updateValues(this._envelopeSelects[envelopeSelectIndex].selectedIndex);
		}
	}
	
	private _onInput = (event: Event) => {
		const instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
		const perEnvelopeSpeedInputBoxIndex = this._perEnvelopeSpeedInputBoxes.indexOf(<any> event.target);
		const perEnvelopeSpeedSliderIndex = this._perEnvelopeSpeedSliders.indexOf(<any> event.target);
		if (perEnvelopeSpeedInputBoxIndex != -1) {
			this._doc.record(new ChangePerEnvelopeSpeed(this._doc, perEnvelopeSpeedInputBoxIndex, instrument.envelopes[perEnvelopeSpeedInputBoxIndex].envelopeSpeed, +(this._perEnvelopeSpeedInputBoxes[perEnvelopeSpeedInputBoxIndex].value)));
		}
		if (perEnvelopeSpeedSliderIndex != -1) {
			this._doc.record(new ChangePerEnvelopeSpeed(this._doc, perEnvelopeSpeedSliderIndex, instrument.envelopes[perEnvelopeSpeedSliderIndex].envelopeSpeed, +(this._perEnvelopeSpeedSliders[perEnvelopeSpeedSliderIndex].value)));
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
			this._doc.record(new ChangeLowerBound(this._doc, lowerBoundInputBoxIndex, instrument.envelopes[lowerBoundInputBoxIndex].lowerBound, +(this._lowerBoundInputBoxes[lowerBoundInputBoxIndex].value)));
		}
		if (lowerBoundSliderIndex != -1) {
			this._doc.record(new ChangeLowerBound(this._doc, lowerBoundSliderIndex, instrument.envelopes[lowerBoundSliderIndex].lowerBound, +(this._lowerBoundSliders[lowerBoundSliderIndex].value)));
		}
		if (upperBoundInputBoxIndex != -1) {
			this._doc.record(new ChangeUpperBound(this._doc, upperBoundInputBoxIndex, instrument.envelopes[upperBoundInputBoxIndex].upperBound, +(this._upperBoundInputBoxes[upperBoundInputBoxIndex].value)));
		}
		if (upperBoundSliderIndex != -1) {
			this._doc.record(new ChangeUpperBound(this._doc, upperBoundSliderIndex, instrument.envelopes[upperBoundSliderIndex].upperBound, +(this._upperBoundSliders[upperBoundSliderIndex].value)));
		}
		const stairsStepAmountInputBoxIndex = this._stairsStepAmountInputBoxes.indexOf(<any> event.target);
		const stairsStepAmountSliderIndex = this._stairsStepAmountSliders.indexOf(<any> event.target);
		if (stairsStepAmountInputBoxIndex != -1) {
			this._doc.record(new ChangeStairsStepAmount(this._doc, stairsStepAmountInputBoxIndex, instrument.envelopes[stairsStepAmountInputBoxIndex].stepAmount, +(this._stairsStepAmountInputBoxes[stairsStepAmountInputBoxIndex].value)));
		}
		if (stairsStepAmountSliderIndex != -1) {
			this._doc.record(new ChangeStairsStepAmount(this._doc, stairsStepAmountSliderIndex, instrument.envelopes[stairsStepAmountSliderIndex].stepAmount, +(this._stairsStepAmountSliders[stairsStepAmountSliderIndex].value)));
		}
		const envelopeDelayInputBoxIndex = this._envelopeDelayInputBoxes.indexOf(<any> event.target);
		const envelopeDelaySliderIndex = this._envelopeDelaySliders.indexOf(<any> event.target);
		if (envelopeDelayInputBoxIndex != -1) {
			this._doc.record(new ChangeEnvelopeDelay(this._doc, envelopeDelayInputBoxIndex, instrument.envelopes[envelopeDelayInputBoxIndex].stepAmount, +(this._envelopeDelayInputBoxes[envelopeDelayInputBoxIndex].value)));
		}
		if (envelopeDelaySliderIndex != -1) {
			this._doc.record(new ChangeEnvelopeDelay(this._doc, envelopeDelaySliderIndex, instrument.envelopes[envelopeDelaySliderIndex].stepAmount, +(this._envelopeDelaySliders[envelopeDelaySliderIndex].value)));
		}
	};

	private _onClick = (event: MouseEvent): void => {
		const index: number = this._deleteButtons.indexOf(<any> event.target);
		if (index != -1) {
			this._doc.record(new ChangeRemoveEnvelope(this._doc, index));
		}
	}

	private _typingInInput = (event: KeyboardEvent): void => {
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
		return HTML.option({value: target + index * Config.instrumentAutomationTargets.length}, displayName);
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
	
	private _updateValues(index: number): void {
		let steps: number = 300;
		let envelope: Envelope = Config.envelopes[/*How do i get the selected envelope's type*/];
		for (let i: number = 0; i < steps; i++) {
			// _computeEnvelope: Function = EnvelopeComputer.computeEnvelope; for function below
			const value = this._computeEnvelope(envelope);
			this._values.push(value);
			events.raise("updatePlot", this._values);
		}
	}

	public render(): void {
		const instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
		
		for (let envelopeIndex: number = this._rows.length; envelopeIndex < instrument.envelopeCount; envelopeIndex++) {
			const envelopePlotter: envelopeLineGraph = new envelopeLineGraph(HTML.canvas({ width: 144, height: 72, style: `border: 2px solid ${ColorConfig.uiWidgetBackground}; position: static;`, id: "envelopeLineGraph" }), 1);
			const envelopePlotterRow: HTMLElement = HTML.div({class: "selectRow dropFader"}, envelopePlotter.canvas);
			const perEnvelopeSpeedSlider: HTMLInputElement = HTML.input({style: "margin: 0;", type: "range", min: Config.perEnvelopeSpeedMin, max: Config.perEnvelopeSpeedMax, value: "1", step: "0.25"});
			const perEnvelopeSpeedInputBox: HTMLInputElement = HTML.input({style: "width: 4em; font-size: 80%; ", id: "perEnvelopeSpeedInputBox", type: "number", step: "0.001", min: Config.perEnvelopeSpeedMin, max: Config.perEnvelopeSpeedMax, value: "1"});
			const perEnvelopeSpeedRow: HTMLElement = HTML.div({class: "selectRow dropFader"}, HTML.div({},
				HTML.span({class: "tip", style: "height: 1em; font-size: 12px;", onclick: () => this._openPrompt("perEnvelopeSpeed")}, HTML.span(_.perEnvelopeSpeedLabel)),
				HTML.div({style: `color: ${ColorConfig.secondaryText}; margin-top: -3px;`}, perEnvelopeSpeedInputBox),
			), perEnvelopeSpeedSlider);
			const discreteEnvelopeToggle: HTMLInputElement = HTML.input({style: "width: 3em; padding: 0; margin-right: 3em;", type: "checkbox"});
			const discreteEnvelopeRow: HTMLElement = HTML.div({class: "selectRow dropFader"}, HTML.div({},
				HTML.span({class: "tip", style: "height: 1em; font-size: 12px;", onclick: () => this._openPrompt("discreteEnvelope")}, HTML.span(_.discreteEnvelopeLabel)),
			), discreteEnvelopeToggle);
			const lowerBoundSlider: HTMLInputElement = HTML.input({style: "margin: 0;", type: "range", min: Config.lowerBoundMin, max: Config.lowerBoundMax, value: "0", step: "0.20"});
			const upperBoundSlider: HTMLInputElement = HTML.input({style: "margin: 0;", type: "range", min: Config.upperBoundMin, max: Config.upperBoundMax, value: "1", step: "0.20"});
			const lowerBoundInputBox: HTMLInputElement = HTML.input({style: "width: 4em; font-size: 80%; ", id: "lowerBoundInputBox", type: "number", step: "0.001", min: Config.lowerBoundMin, max: Config.lowerBoundMax, value: "0"});
			const upperBoundInputBox: HTMLInputElement = HTML.input({style: "width: 4em; font-size: 80%; ", id: "upperBoundInputBox", type: "number", step: "0.001", min: Config.upperBoundMin, max: Config.upperBoundMax, value: "1"});
			const lowerBoundRow: HTMLElement = HTML.div({class: "selectRow dropFader"}, HTML.div({},
				HTML.span({class: "tip", style: "height: 1em; font-size: 12px;", onclick: () => this._openPrompt("envelopeBounds")}, HTML.span(_.lowerBoundLabel)),
				HTML.div({style: `color: ${ColorConfig.secondaryText}; margin-top: -3px;`}, lowerBoundInputBox),
			), lowerBoundSlider);
			const upperBoundRow: HTMLElement = HTML.div({class: "selectRow dropFader"}, HTML.div({},
				HTML.span({class: "tip", style: "height: 1em; font-size: 12px;", onclick: () => this._openPrompt("envelopeBounds")}, HTML.span(_.upperBoundLabel)),
				HTML.div({style: `color: ${ColorConfig.secondaryText}; margin-top: -3px;`}, upperBoundInputBox),
			), upperBoundSlider);
			const stairsStepAmountSlider: HTMLInputElement = HTML.input({style: "margin: 0;", type: "range", min: 1, max: Config.stairsStepAmountMax, value: "4", step: "1"});
			const stairsStepAmountInputBox: HTMLInputElement = HTML.input({style: "width: 4em; font-size: 80%; ", id: "stairsStepAmountInputBox", type: "number", step: "1", min: 1, max: Config.stairsStepAmountMax, value: "4"});
			const stairsStepAmountRow: HTMLElement = HTML.div({class: "selectRow dropFader"}, HTML.div({},
				HTML.span({class: "tip", style: "height: 1em; font-size: 12px;", onclick: () => this._openPrompt("stepAmount")}, HTML.span(_.stairsStepAmountLabel)),
				HTML.div({style: `color: ${ColorConfig.secondaryText}; margin-top: -3px;`}, stairsStepAmountInputBox),
			), stairsStepAmountSlider);
			const envelopeDelaySlider: HTMLInputElement = HTML.input({style: "margin: 0;", type: "range", min: 0, max: Config.envelopeDelayMax, value: "0", step: "0.5"});
			const envelopeDelayInputBox: HTMLInputElement = HTML.input({style: "width: 4em; font-size: 80%; ", id: "envelopeDelayInputBox", type: "number", step: "0.01", min: 0, max: Config.envelopeDelayMax, value: "0"});
			const envelopeDelayRow: HTMLElement = HTML.div({class: "selectRow dropFader"}, HTML.div({},
				HTML.span({class: "tip", style: "height: 1em; font-size: 12px;", onclick: () => this._openPrompt("envelopeDelay")}, HTML.span(_.envelopeDelayLabel)),
				HTML.div({style: `color: ${ColorConfig.secondaryText}; margin-top: -3px;`}, envelopeDelayInputBox),
			), envelopeDelaySlider);
			const envelopeDropdownGroup: HTMLElement = HTML.div({class: "editor-controls", style: "display: none;"}, perEnvelopeSpeedRow, discreteEnvelopeRow, lowerBoundRow, upperBoundRow, stairsStepAmountRow, envelopeDelayRow);
			const envelopeDropdown: HTMLButtonElement = HTML.button({style: "margin-left: 0.6em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;", onclick: () => this._toggleDropdownMenu(DropdownID.PerEnvelope, envelopeIndex)}, "▼");

			const targetSelect: HTMLSelectElement = HTML.select();
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
			
			const envelopeSelect: HTMLSelectElement = HTML.select();
			for (let envelope: number = 0; envelope < Config.envelopes.length; envelope++) {
				envelopeSelect.appendChild(HTML.option({value: envelope}, Config.envelopes[envelope].name));
			} 
			
			const deleteButton: HTMLButtonElement = HTML.button({type: "button", class: "delete-envelope"});
			
			const row: HTMLDivElement = HTML.div(HTML.div({class: "envelope-row"},
				HTML.div({style: "width: 0; flex: 0.2; margin-top: 3px;"}, envelopeDropdown),
				HTML.div({class: "selectContainer", style: "width: 0; flex: 0.8;"}, targetSelect),
				HTML.div({class: "selectContainer", style: "width: 0; flex: 0.7;"}, envelopeSelect),
				deleteButton,
			), envelopeDropdownGroup);
			
			this.container.appendChild(row);
			this._rows[envelopeIndex] = row;
			this._envelopePlotters[envelopeIndex] = envelopePlotter;
			this._envelopePlotterRows[envelopeIndex] = envelopePlotterRow;
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
			this._perEnvelopeSpeedSliders[envelopeIndex].value = String(clamp(Config.perEnvelopeSpeedMin, Config.perEnvelopeSpeedMax+1, instrument.envelopes[envelopeIndex].envelopeSpeed));
			this._perEnvelopeSpeedInputBoxes[envelopeIndex].value = String(clamp(Config.perEnvelopeSpeedMin, Config.perEnvelopeSpeedMax+1, instrument.envelopes[envelopeIndex].envelopeSpeed));
			this._discreteEnvelopeToggles[envelopeIndex].checked = instrument.envelopes[envelopeIndex].discrete ? true : false;
			this._lowerBoundSliders[envelopeIndex].value = String(clamp(Config.lowerBoundMin, Config.lowerBoundMax+1, instrument.envelopes[envelopeIndex].lowerBound));
			this._upperBoundSliders[envelopeIndex].value = String(clamp(Config.upperBoundMin, Config.upperBoundMax+1, instrument.envelopes[envelopeIndex].upperBound));
			this._lowerBoundInputBoxes[envelopeIndex].value = String(clamp(Config.lowerBoundMin, Config.lowerBoundMax+1, instrument.envelopes[envelopeIndex].lowerBound));
			this._upperBoundInputBoxes[envelopeIndex].value = String(clamp(Config.upperBoundMin, Config.upperBoundMax+1, instrument.envelopes[envelopeIndex].upperBound));
			this._stairsStepAmountSliders[envelopeIndex].value = String(clamp(1, Config.stairsStepAmountMax+1, instrument.envelopes[envelopeIndex].stepAmount));
			this._stairsStepAmountInputBoxes[envelopeIndex].value = String(clamp(1, Config.stairsStepAmountMax+1, instrument.envelopes[envelopeIndex].stepAmount));
			this._envelopeDelaySliders[envelopeIndex].value = String(clamp(0, Config.envelopeDelayMax+1, instrument.envelopes[envelopeIndex].delay));
			this._envelopeDelayInputBoxes[envelopeIndex].value = String(clamp(0, Config.envelopeDelayMax+1, instrument.envelopes[envelopeIndex].delay));
			this._targetSelects[envelopeIndex].value = String(instrument.envelopes[envelopeIndex].target + instrument.envelopes[envelopeIndex].index * Config.instrumentAutomationTargets.length);
			this._envelopeSelects[envelopeIndex].selectedIndex = instrument.envelopes[envelopeIndex].envelope;
			
			if ( // Special case on IES
				instrument.envelopes[envelopeIndex].envelope == Config.envelopes.dictionary["none"].index ||
				instrument.envelopes[envelopeIndex].envelope == Config.envelopes.dictionary["note size"].index 
			) {
				this._perEnvelopeSpeedRows[envelopeIndex].style.display = "none";
			} else {
				this._perEnvelopeSpeedRows[envelopeIndex].style.display = "";
			}

			// Special case on discrete toggles.
			if (instrument.envelopes[envelopeIndex].envelope == Config.envelopes.dictionary["none"].index) this._discreteEnvelopeRows[envelopeIndex].style.display = "none";
			else this._discreteEnvelopeRows[envelopeIndex].style.display = "";

			if ( // Special case on lower/upper boundaries.
				instrument.envelopes[envelopeIndex].envelope == Config.envelopes.dictionary["none"].index ||
				instrument.envelopes[envelopeIndex].envelope == Config.envelopes.dictionary["note size"].index 
			) {
				this._lowerBoundRows[envelopeIndex].style.display = "none";
				this._upperBoundRows[envelopeIndex].style.display = "none";
			} else {
				this._lowerBoundRows[envelopeIndex].style.display = "";
				this._upperBoundRows[envelopeIndex].style.display = "";
			}

			if ( // Special case on step amount.
				instrument.envelopes[envelopeIndex].envelope == Config.envelopes.dictionary["stairs 0"].index ||
				instrument.envelopes[envelopeIndex].envelope == Config.envelopes.dictionary["stairs 1"].index ||
				instrument.envelopes[envelopeIndex].envelope == Config.envelopes.dictionary["stairs 2"].index ||
				instrument.envelopes[envelopeIndex].envelope == Config.envelopes.dictionary["stairs 3"].index ||
				instrument.envelopes[envelopeIndex].envelope == Config.envelopes.dictionary["stairs 4"].index ||
				instrument.envelopes[envelopeIndex].envelope == Config.envelopes.dictionary["looped stairs 0"].index ||
				instrument.envelopes[envelopeIndex].envelope == Config.envelopes.dictionary["looped stairs 1"].index ||
				instrument.envelopes[envelopeIndex].envelope == Config.envelopes.dictionary["looped stairs 2"].index ||
				instrument.envelopes[envelopeIndex].envelope == Config.envelopes.dictionary["looped stairs 3"].index ||
				instrument.envelopes[envelopeIndex].envelope == Config.envelopes.dictionary["looped stairs 4"].index 
			) {
				this._stairsStepAmountRows[envelopeIndex].style.display = "";
			} else {
				this._stairsStepAmountRows[envelopeIndex].style.display = "none";
			}

			if ( // Special case on delay.
				instrument.envelopes[envelopeIndex].envelope == Config.envelopes.dictionary["none"].index ||
				instrument.envelopes[envelopeIndex].envelope == Config.envelopes.dictionary["note size"].index 
			) {
				this._envelopeDelayRows[envelopeIndex].style.display = "none";
			} else {
				this._envelopeDelayRows[envelopeIndex].style.display = "";
			}
		}
		
		this._renderedEnvelopeCount = instrument.envelopeCount;
		this._renderedEqFilterCount = instrument.eqFilter.controlPointCount;
		this._renderedNoteFilterCount = useControlPointCount;
		this._renderedInstrumentType = instrument.type;
		this._renderedEffects = instrument.effects;
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
