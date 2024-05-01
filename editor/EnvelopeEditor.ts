// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import {InstrumentType, Config, DropdownID} from "../synth/SynthConfig";
import {Instrument} from "../synth/synth";
import {Slider} from "./HTMLWrapper";
import {ColorConfig} from "./ColorConfig";
import {SongDocument} from "./SongDocument";
import {ChangeSetEnvelopeTarget, ChangeSetEnvelopeType, ChangeRemoveEnvelope, ChangePerEnvelopeSpeed} from "./changes";
import {HTML} from "imperative-html/dist/esm/elements-strict";
import {Localization as _} from "./Localization";

export class EnvelopeEditor {
	public readonly container: HTMLElement = HTML.div({class: "envelopeEditor"});
	
	// Everything must be declared as arrays for each envelope
	// Properly given styles and what not in render()
	private readonly _rows: HTMLDivElement[] = [];
	private readonly _perEnvelopeSpeedSliders: Slider[] = [];
	private readonly _perEnvelopeSpeedInputBoxes: HTMLInputElement[] = [];
	private readonly _perEnvelopeSpeedRows: HTMLElement[] = [];
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
	
	constructor(private _doc: SongDocument) {
		this.container.addEventListener("change", this._onChange);
		this.container.addEventListener("click", this._onClick);
		this.container.addEventListener("keypress", this._typingInInput);

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
		}
	}
	
	private _onClick = (event: MouseEvent): void => {
		const index: number = this._deleteButtons.indexOf(<any> event.target);
		if (index != -1) {
			this._doc.record(new ChangeRemoveEnvelope(this._doc, index));
		}
	}

	private _typingInInput = (event: KeyboardEvent): void => {
		const perEnvelopeSpeedInputBoxIndex: number = this._perEnvelopeSpeedInputBoxes.indexOf(<any> event.target);
		if (perEnvelopeSpeedInputBoxIndex != -1) {
			switch (event.keyCode) {
				case 8: // backspace/delete
				case 13: // enter/return
				case 38: // up
				case 40: // down
				case 37: // left
				case 39: // right
				case 48: // 0
				case 49: // 1
				case 50: // 2
				case 51: // 3
				case 52: // 4
				case 53: // 5
				case 54: // 6
				case 55: // 7
				case 56: // 8
				case 57: // 9
					event.stopPropagation();
					break;
			}
		}
		const instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
		this._doc.record(new ChangePerEnvelopeSpeed(this._doc, perEnvelopeSpeedInputBoxIndex, instrument.envelopes[perEnvelopeSpeedInputBoxIndex].envelopeSpeed, parseInt(this._perEnvelopeSpeedInputBoxes[perEnvelopeSpeedInputBoxIndex].value)));
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
	
	public render(): void {
		const instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
		
		for (let envelopeIndex: number = this._rows.length; envelopeIndex < instrument.envelopeCount; envelopeIndex++) {
			const perEnvelopeSpeedSlider: Slider = new Slider(HTML.input({style: "margin: 0;", type: "range", min: "0", max: "32", value: "1", step: "0.25"}), this._doc, (oldValue: number, newValue: number) => new ChangePerEnvelopeSpeed(this._doc, envelopeIndex, oldValue, newValue), false);
			const perEnvelopeSpeedInputBox: HTMLInputElement = HTML.input({style: "width: 4em; font-size: 80%; ", id: "perEnvelopeSpeedInputBox", type: "number", step: "0.001", min: "0", max: "32", value: "1"});
			const perEnvelopeSpeedRow: HTMLElement = HTML.div({class: "selectRow dropFader"}, HTML.div({},
				HTML.span({class: "tip", style: "height: 1em; font-size: 12px;", /*onclick: () => this._openPrompt("perEnvelopeSpeed")*/}, HTML.span(_.perEnvelopeSpeedLabel)),
				HTML.div({style: `color: ${ColorConfig.secondaryText}; margin-top: -3px;`}, perEnvelopeSpeedInputBox),
			), perEnvelopeSpeedSlider.container);
			const envelopeDropdownGroup: HTMLElement = HTML.div({class: "editor-controls", style: "display: none;"}, perEnvelopeSpeedRow);
			const envelopeDropdown: HTMLButtonElement = HTML.button({style: "margin-left: 0.7em; height:1.5em; width: 10px; padding: 0px; font-size: 8px;", onclick: () => this._toggleDropdownMenu(DropdownID.PerEnvelope, envelopeIndex)}, "▼");

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
				HTML.div({style: "width: 0; flex: 0.2;"}, envelopeDropdown),
				HTML.div({class: "selectContainer", style: "width: 0; flex: 0.8;"}, targetSelect),
				HTML.div({class: "selectContainer", style: "width: 0; flex: 0.7;"}, envelopeSelect),
				deleteButton,
			), envelopeDropdownGroup);
			
			this.container.appendChild(row);
			this._rows[envelopeIndex] = row;
			this._perEnvelopeSpeedSliders[envelopeIndex] = perEnvelopeSpeedSlider;
			this._perEnvelopeSpeedInputBoxes[envelopeIndex] = perEnvelopeSpeedInputBox;
			this._perEnvelopeSpeedRows[envelopeIndex] = perEnvelopeSpeedRow;
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
		if (instrument.noteFilterType)
			useControlPointCount = 1;
		
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
			this._targetSelects[envelopeIndex].value = String(instrument.envelopes[envelopeIndex].target + instrument.envelopes[envelopeIndex].index * Config.instrumentAutomationTargets.length);
			this._envelopeSelects[envelopeIndex].selectedIndex = instrument.envelopes[envelopeIndex].envelope;
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
