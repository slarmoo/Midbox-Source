// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import {Config} from "../synth/SynthConfig";
import {EditorConfig} from "./EditorConfig";
import {SongDocument} from "./SongDocument";
import {Prompt} from "./Prompt";
import {HTML} from "imperative-html/dist/esm/elements-strict";
import {ColorConfig} from "./ColorConfig";
import {KeyboardLayout} from "./KeyboardLayout";
import {Piano} from "./Piano";
import { Localization as _ } from "./Localization";

const {button, label, div, p, a, h2, input, select, option} = HTML;

export class RecordingSetupPrompt implements Prompt {
	private readonly _keyboardMode: HTMLSelectElement = select({style: "width: 100%;"},
		option({value: "useCapsLockForNotes"}, _.noteRecordingPrompt1Label),
		option({value: "pressControlForShortcuts"}, _.noteRecordingPrompt2Label + EditorConfig.ctrlName + _.noteRecordingPrompt3Label),
	);
	private readonly _keyboardLayout: HTMLSelectElement = select({style: "width: 100%;"},
		option({value: "wickiHayden"}, _.noteRecordingPrompt4Label),
		option({value: "songScale"}, _.noteRecordingPrompt5Label),
		option({value: "pianoAtC"}, _.noteRecordingPrompt6Label),
		option({value: "pianoAtA"}, _.noteRecordingPrompt7Label),
		option({value: "pianoTransposingC"}, _.noteRecordingPrompt8Label),
		option({value: "pianoTransposingA"}, _.noteRecordingPrompt9Label),
	);
	private readonly _keyboardLayoutPreview: HTMLDivElement = div({style: "display: grid; row-gap: 4px; margin: 4px auto; font-size: 10px;"});
	private readonly _enableMidi: HTMLInputElement = input({style: "width: 2em; margin-left: 1em;", type: "checkbox"});
	private readonly _showRecordButton: HTMLInputElement = input({style: "width: 2em; margin-left: 1em;", type: "checkbox"});
	private readonly _snapRecordedNotesToRhythm: HTMLInputElement = input({style: "width: 2em; margin-left: 1em;", type: "checkbox"});
	private readonly _ignorePerformedNotesNotInScale: HTMLInputElement = input({style: "width: 2em; margin-left: 1em;", type: "checkbox"});
	private readonly _metronomeCountIn: HTMLInputElement = input({style: "width: 2em; margin-left: 1em;", type: "checkbox"});
	private readonly _metronomeWhileRecording: HTMLInputElement = input({style: "width: 2em; margin-left: 1em;", type: "checkbox"});
	
	private readonly _okayButton: HTMLButtonElement = button({class: "okayButton", style: "width:100%;"}, (_.confirmLabel));
	private readonly _cancelButton: HTMLButtonElement = button({class: "cancelButton"});
	public readonly container: HTMLDivElement = div({class: "prompt noSelection recordingSetupPrompt", style: "width: 333px; text-align: right; max-height: 90%;"},
		h2({style: "text-align: center;"},
			_.noteRecordingPrompt10Label),
		div({style: "display: grid; overflow-y: auto; overflow-x: hidden; flex-shrink: 1;"},
			p(_.noteRecordingPromptLargeText1Part1Label + EditorConfig.ctrlSymbol + _.noteRecordingPromptLargeText1Part2Label),
			label({style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;"},
				_.noteRecordingPrompt11Label,
				this._showRecordButton,
			),
			label({style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;"},
				_.noteRecordingPrompt12Label,
				this._snapRecordedNotesToRhythm,
			),
			label({style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;"},
				_.noteRecordingPrompt13Label,
				this._ignorePerformedNotesNotInScale,
			),
			p(_.noteRecordingPromptLargeText2Label),
			label({style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;"},
				_.noteRecordingPrompt14Label,
				div({class: "selectContainer", style: "width: 65%; margin-left: 1em;"}, this._keyboardLayout),
			),
			this._keyboardLayoutPreview,
			p(_.noteRecordingPromptLargeText3Label),
			label({style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;"},
				div({class: "selectContainer", style: "width: 100%;"}, this._keyboardMode),
			),
			p(_.noteRecordingPromptLargeText4Label),
			label({style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;"},
				_.noteRecordingPrompt15Label,
				this._metronomeWhileRecording,
			),
			label({style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;"},
				_.noteRecordingPrompt16Label,
				this._metronomeCountIn,
			),
			p(_.noteRecordingPromptLargeText5Part1Label, a({href: "https://caniuse.com/midi", target: "_blank"}, _.noteRecordingPromptLargeText5Part2Label), _.noteRecordingPromptLargeText5Part3Label),
			label({style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;"},
				_.noteRecordingPrompt17Label,
				this._enableMidi,
			),
			p(_.noteRecordingPromptLargeText6Label),
			div({style: `width: 100%; height: 80px; background: linear-gradient(rgba(0,0,0,0), ${ColorConfig.editorBackground}); position: sticky; bottom: 0; pointer-events: none;`}),
		),
		label({style: "display: flex; flex-direction: row-reverse; justify-content: space-between;"},
			this._okayButton,
		),
		this._cancelButton,
	);
	
	constructor(private _doc: SongDocument) {
		this._keyboardMode.value = this._doc.prefs.pressControlForShortcuts ? "pressControlForShortcuts" : "useCapsLockForNotes";
		this._keyboardLayout.value = this._doc.prefs.keyboardLayout;
		this._enableMidi.checked = this._doc.prefs.enableMidi;
		this._showRecordButton.checked = this._doc.prefs.showRecordButton;
		this._snapRecordedNotesToRhythm.checked = this._doc.prefs.snapRecordedNotesToRhythm;
		this._ignorePerformedNotesNotInScale.checked = this._doc.prefs.ignorePerformedNotesNotInScale;
		this._metronomeCountIn.checked = this._doc.prefs.metronomeCountIn;
		this._metronomeWhileRecording.checked = this._doc.prefs.metronomeWhileRecording;
		
		setTimeout(()=>this._showRecordButton.focus());
		
		this._okayButton.addEventListener("click", this._confirm);
		this._cancelButton.addEventListener("click", this._close);
		this.container.addEventListener("keydown", this._whenKeyPressed);
		
		this._renderKeyboardLayoutPreview();
		this._keyboardLayout.addEventListener("change", this._renderKeyboardLayoutPreview);
	}
	
	private _close = (): void => { 
		this._doc.undo();
	}
	
	public cleanUp = (): void => { 
		this._okayButton.removeEventListener("click", this._confirm);
		this._cancelButton.removeEventListener("click", this._close);
		this.container.removeEventListener("keydown", this._whenKeyPressed);
	}
	
	private _whenKeyPressed = (event: KeyboardEvent): void => {
		if ((<Element> event.target).tagName != "BUTTON" && event.keyCode == 13) { // Enter key
			this._confirm();
		}
	}
	
	private _confirm = (): void => { 
		this._doc.prefs.pressControlForShortcuts = (this._keyboardMode.value == "pressControlForShortcuts");
		this._doc.prefs.keyboardLayout = this._keyboardLayout.value;
		this._doc.prefs.enableMidi = this._enableMidi.checked;
		this._doc.prefs.showRecordButton = this._showRecordButton.checked;
		this._doc.prefs.snapRecordedNotesToRhythm = this._snapRecordedNotesToRhythm.checked;
		this._doc.prefs.ignorePerformedNotesNotInScale = this._ignorePerformedNotesNotInScale.checked;
		this._doc.prefs.metronomeCountIn = this._metronomeCountIn.checked;
		this._doc.prefs.metronomeWhileRecording = this._metronomeWhileRecording.checked;
		this._doc.prefs.save();
		this._close();
	}
	
	private _renderKeyboardLayoutPreview = (): void => {
		while (this._keyboardLayoutPreview.firstChild) {
			this._keyboardLayoutPreview.removeChild(this._keyboardLayoutPreview.firstChild);
		}
		const rowLengths: number[] = [12, 12, 11, 10];
		const scale: ReadonlyArray<boolean> = Config.scales[this._doc.song.scale].flags;
		for (let rowIndex: number = 0; rowIndex < 4; rowIndex++) {
			const row: HTMLDivElement = div({style: "display: flex;"});
			this._keyboardLayoutPreview.appendChild(row);
			const spacer: HTMLDivElement = div({style: "width: " + (rowIndex * 12) + "px; height: 20px; flex-shrink: 0;"});
			row.appendChild(spacer);
			for (let colIndex: number = 0; colIndex < rowLengths[rowIndex]; colIndex++) {
				const key: HTMLDivElement = div({style: `width: 20px; height: 20px; margin: 0 2px; box-sizing: border-box; flex-shrink: 0; display: flex; justify-content: center; align-items: center;`});
				row.appendChild(key);
				const pitch: number | null = KeyboardLayout.keyPosToPitch(this._doc, colIndex, 3 - rowIndex, this._keyboardLayout.value);
				if (pitch != null) {
					const scalePitch: number = pitch % 12;
					if (scale[scalePitch]) {
						if (scalePitch == 0) {
							key.style.background = ColorConfig.tonic;
						} else if (scalePitch == 7 && this._doc.prefs.showFifth) {
							key.style.background = ColorConfig.fifthNote;
						} else {
							key.style.background = ColorConfig.pitchBackground;
						}
					} else {
						key.style.border = "2px solid " + ColorConfig.pitchBackground;
					}
					
					const pitchNameIndex: number = (scalePitch + Config.keys[this._doc.song.key].basePitch) % Config.pitchesPerOctave;
					key.textContent = Piano.getPitchName(pitchNameIndex, scalePitch, Math.floor(pitch / 12));
				}
			}
		}
	}
}
