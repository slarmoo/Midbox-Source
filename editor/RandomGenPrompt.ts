import { Prompt } from "./Prompt";
import { HTML } from "imperative-html/dist/esm/elements-strict";
import { SongDocument } from "./SongDocument";

const {div, h2, h4, input, label, button, p} = HTML;

export class RandomGenPrompt implements Prompt {
    private readonly _chipWaveBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _PWMBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _supersawBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _harmonicsBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _pickedStringBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _spectrumBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _FMBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _ADVFMBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _customChipBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _noiseBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _wavetableBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _drumSpectrumBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _drumNoiseBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _drumsetBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});

    private readonly _cancelButton: HTMLButtonElement = button({class: "cancelButton"});
	private readonly _okayButton: HTMLButtonElement = button({class: "okayButton", style: "width:45%;"}, "Confirm");

public readonly container: HTMLDivElement = div({class: "prompt noSelection", style: "width: 285px; text-align: center; max-height: 30%; overflow-y: auto;"},
    h2({style: "text-align: center;"},
        "Random Generation Settings"),
    div({style: "display: flex; overflow-y: auto; overflow-x: hidden; flex-shrink: 1;"},
		p('"Random Generation" refers to what happens when you randomly generate an instrument using "Shift + R" or selecting the option dedicated to it in the instrument preset select. All options in this prompt shape the way how this process works. This allows for customizing how you want your instrument to be randomized. Usually, you\'ll be able to change whether or not a setting gets randomized, or how it gets randomized.'),
        ),
    h4({style: "display: flex; flex-direction: row; text-align: center; align-items: center; height: 0.5em; justify-content: flex-end;"},
        "Instrument Types",
    ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
		"Chip Wave:",
		this._chipWaveBox,
    ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
        "Pulse Width:",
        this._PWMBox,
    ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
		"Supersaw:",
		this._supersawBox,
    ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
		"Harmonics:",
		this._harmonicsBox,
    ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
		"Picked String:",
		this._pickedStringBox,
    ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
		"Spectrum:",
		this._spectrumBox,
    ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
		"FM:",
		this._FMBox,
    ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
        "ADVFM:",
        this._ADVFMBox,
    ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
		"Custom Chip:",
		this._customChipBox,
    ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
        "Noise:",
        this._noiseBox,
    ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
        "Wavetable:",
        this._wavetableBox,
    ),
    h4({style: "display: flex; flex-direction: row; text-align: center; align-items: center; height: 0.5em; justify-content: flex-end;"},
        "Drum Types",
    ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
		"Drum Spectrum:",
		this._drumSpectrumBox,
    ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
		"Drum Noise:",
		this._drumNoiseBox,
    ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
		"Drumset:",
		this._drumsetBox,
    ),
    // Issue#30 - Add a section here for randomizing through preset categories.
    label({style: "display: flex; flex-direction: row-reverse; justify-content: space-between;"},
		this._okayButton,
	),
	this._cancelButton,
);

constructor(private _doc: SongDocument) {
    this._chipWaveBox.checked = this._doc.prefs.chipWaveOnRandomization;
    this._PWMBox.checked = this._doc.prefs.PWMOnRandomization;
    this._supersawBox.checked = this._doc.prefs.supersawOnRandomization;
    this._harmonicsBox.checked = this._doc.prefs.harmonicsOnRandomization;
    this._pickedStringBox.checked = this._doc.prefs.pickedStringOnRandomization;
    this._spectrumBox.checked = this._doc.prefs.spectrumOnRandomization;
    this._FMBox.checked = this._doc.prefs.FMOnRandomization;
    this._ADVFMBox.checked = this._doc.prefs.ADVFMOnRandomization;
    this._customChipBox.checked = this._doc.prefs.customChipOnRandomization;
    this._noiseBox.checked = this._doc.prefs.noiseOnRandomization;
    this._wavetableBox.checked = this._doc.prefs.wavetableOnRandomization;
    this._drumSpectrumBox.checked = this._doc.prefs.drumSpectrumOnRandomization;
    this._drumNoiseBox.checked = this._doc.prefs.drumNoiseOnRandomization;
    this._drumsetBox.checked = this._doc.prefs.drumsetOnRandomization;

    this._okayButton.addEventListener("click", this._confirm);
	this._cancelButton.addEventListener("click", this._close);
}

private _close = (): void => { 
    this._doc.undo();
}

private _confirm = (): void => { 
    this._doc.prefs.chipWaveOnRandomization = this._chipWaveBox.checked;
    this._doc.prefs.PWMOnRandomization = this._PWMBox.checked;
    this._doc.prefs.supersawOnRandomization = this._supersawBox.checked;
    this._doc.prefs.harmonicsOnRandomization = this._harmonicsBox.checked;
    this._doc.prefs.pickedStringOnRandomization = this._pickedStringBox.checked;
    this._doc.prefs.spectrumOnRandomization = this._spectrumBox.checked;
    this._doc.prefs.FMOnRandomization = this._FMBox.checked;
    this._doc.prefs.ADVFMOnRandomization = this._ADVFMBox.checked;
    this._doc.prefs.customChipOnRandomization = this._customChipBox.checked;
    this._doc.prefs.noiseOnRandomization = this._noiseBox.checked;
    this._doc.prefs.wavetableOnRandomization = this._wavetableBox.checked;
    this._doc.prefs.drumSpectrumOnRandomization = this._drumSpectrumBox.checked;
    this._doc.prefs.drumNoiseOnRandomization = this._drumNoiseBox.checked;
    this._doc.prefs.drumsetOnRandomization = this._drumsetBox.checked;

    this._doc.prefs.save();
	this._close();
}

public cleanUp = (): void => { 
        this._okayButton.removeEventListener("click", this._confirm);
        this._cancelButton.removeEventListener("click", this._close);
    }
}