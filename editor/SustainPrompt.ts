// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import {Config} from "../synth/SynthConfig";
import {Instrument} from "../synth/synth";
import {HTML} from "imperative-html/dist/esm/elements-strict";
import {SongDocument} from "./SongDocument";
import {Prompt} from "./Prompt";
import {ChangeGroup} from "./Change";
import {ChangeStringSustainType} from "./changes";
import {Localization as _} from "./Localization";

const {button, div, h2, p, select, option} = HTML;

export class SustainPrompt implements Prompt {
	private readonly _typeSelect: HTMLSelectElement = select({style: "width: 100%;"},
		option({value: "acoustic"}, _.sustainTypePrompt1Label),
		option({value: "bright"}, _.sustainTypePrompt2Label),
	);
	private readonly _cancelButton: HTMLButtonElement = button({class: "cancelButton"});
	private readonly _okayButton: HTMLButtonElement = button({class: "okayButton", style: "width:45%;"}, _.confirmLabel);

	public readonly container: HTMLDivElement = div({class: "prompt", style: "width: 300px;"},
		div(
			h2(_.sustainTypePrompt3Label),
			p(_.sustainTypePromptLargeText1Label),
			p(_.sustainTypePromptLargeText2Label),
		),
		div({style: {display: Config.enableAcousticSustain ? undefined : "none", "margin-top": "5px"}},
		    this._typeSelect,
			p(_.sustainTypePromptLargeText3Label),
		),
		div({style: {display: Config.enableAcousticSustain ? "flex" : "none", "flex-direction": "row-reverse", "justify-content": "space-between"}},
			this._okayButton,
		),
		this._cancelButton,
	);

	constructor(private _doc: SongDocument) {
		const instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
		this._typeSelect.value = Config.sustainTypeNames[instrument.stringSustainType];

		setTimeout(()=>this._cancelButton.focus());

		this._okayButton.addEventListener("click", this._saveChanges);
		this._cancelButton.addEventListener("click", this._close);
		this.container.addEventListener("keydown", this._whenKeyPressed);
	}

	private _close = (): void => { 
		this._doc.undo();
	}

	public cleanUp = (): void => { 
		this._okayButton.removeEventListener("click", this._saveChanges);
		this._cancelButton.removeEventListener("click", this._close);
		this.container.removeEventListener("keydown", this._whenKeyPressed);
	}

	private _whenKeyPressed = (event: KeyboardEvent): void => {
		if ((<Element> event.target).tagName != "BUTTON" && event.keyCode == 13) { // Enter key
			this._saveChanges();
		}
	}

	private _saveChanges = (): void => {
		if (Config.enableAcousticSustain) {
			const group: ChangeGroup = new ChangeGroup();
			group.append(new ChangeStringSustainType(this._doc, <any> Config.sustainTypeNames.indexOf(this._typeSelect.value)));
			this._doc.prompt = null;
			this._doc.record(group, true);
		} else {
			this._close();
		}
	}
}