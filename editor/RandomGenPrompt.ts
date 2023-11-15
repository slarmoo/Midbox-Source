import { Prompt } from "./Prompt";
import { HTML } from "imperative-html/dist/esm/elements-strict";
import { SongDocument } from "./SongDocument";
import { Localization as _ } from "./Localization";

    const {div, h2, h4, input, label, button, p, option, select} = HTML;

export class RandomGenPrompt implements Prompt {
    private readonly _chipWaveBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _PWMBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _supersawBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _harmonicsBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _pickedStringBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _spectrumBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _FMBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _customChipBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});

    private readonly _drumSpectrumBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _noiseBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _drumsetBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});

    private readonly _fadeBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _unisonBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _volumeBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _panBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _panDelayBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});

    private readonly _EQFilterBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _EQFilterCutBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _EQFilterPeakBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _EQFilterTypeBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _noteFilterBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _noteFilterCutBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _noteFilterPeakBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _noteFilterTypeBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});

    private readonly _chipwaveBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _pulseWidthBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _dynamismBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _spreadBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _shapeBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _supersawPWMBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _harmonicsEditorBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _sustainBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _spectrumEditorBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _customChipWaveBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _customChipGenerationType: HTMLSelectElement = select({style: "width: 70%; margin-left: 1em;"},
    option({value: "customChipGeneratePreset"}, "Random Waveform Preset"),
    option({value: "customChipGenerateAlgorithm"}, "Algorithmic Generation"),
    option({value: "customChipGenerateFully"}, "Fully Random"),
    );


    private readonly _cancelButton: HTMLButtonElement = button({class: "cancelButton"});
	private readonly _okayButton: HTMLButtonElement = button({class: "okayButton", style: "width:45%;"}, _.confirmLabel);

public readonly container: HTMLDivElement = div({class: "prompt noSelection", style: "width: 285px; text-align: center; max-height: 60%; overflow-y: auto;"},
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
			"Custom Chip:",
			this._customChipBox,
        ),
    h4({style: "display: flex; flex-direction: row; text-align: center; align-items: center; height: 0.5em; justify-content: flex-end;"},
        "Drum Types",
    ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Drum Spectrum:",
			this._drumSpectrumBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Noise:",
			this._noiseBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Drumset:",
			this._drumsetBox,
        ),
    h4({style: "display: flex; flex-direction: row; text-align: center; align-items: center; height: 0.5em; justify-content: flex-end;"},
        "Base Options",
    ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Volume:",
			this._volumeBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Panning:",
			this._panBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Pan Delay:",
			this._panDelayBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Fade:",
			this._fadeBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Unison:",
			this._unisonBox,
        ),
    h4({style: "display: flex; flex-direction: row; text-align: center; align-items: center; height: 0.5em; justify-content: flex-end;"},
        "EQ/Note Filter",
    ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"EQ Filter:",
			this._EQFilterBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"EQ Filter Cut:",
			this._EQFilterCutBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"EQ Filter Peak:",
			this._EQFilterPeakBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"EQ Filter Type:",
			this._EQFilterTypeBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Note Filter:",
			this._noteFilterBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Note Filter Cut:",
			this._noteFilterCutBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Note Filter Peak:",
			this._noteFilterPeakBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Note Filter Type:",
			this._noteFilterTypeBox,
        ),
    h4({style: "display: flex; flex-direction: row; text-align: center; align-items: center; height: 0.5em; justify-content: flex-end;"},
        "Instrument Type-Specific",
    ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Chip Wave Waveform:",
			this._chipwaveBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"PWM Pulse Width:",
			this._pulseWidthBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Supersaw Dynamism:",
			this._dynamismBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Supersaw Spread:",
			this._spreadBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Supersaw Shape:",
			this._shapeBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Supersaw Pulse Width:",
			this._supersawPWMBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Harmonics (Shape):",
			this._harmonicsEditorBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Picked String Sustain:",
			this._sustainBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Spectrum (Shape):",
			this._spectrumEditorBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Custom Chip Waveform:",
			this._customChipWaveBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Custom Chip Waveform:",
			this._customChipGenerationType,
        ),
    label({style: "display: flex; flex-direction: row-reverse; justify-content: space-between;"},
			this._okayButton,
		),
		this._cancelButton,
);

constructor(private _doc: SongDocument) {
    this._chipWaveBox.checked = this._doc.chipWaveOnRandomization;
    this._PWMBox.checked = this._doc.PWMOnRandomization;
    this._supersawBox.checked = this._doc.supersawOnRandomization;
    this._harmonicsBox.checked = this._doc.harmonicsOnRandomization;
    this._pickedStringBox.checked = this._doc.pickedStringOnRandomization;
    this._spectrumBox.checked = this._doc.spectrumOnRandomization;
    this._FMBox.checked = this._doc.FMOnRandomization;
    this._customChipBox.checked = this._doc.customChipOnRandomization;
    this._drumSpectrumBox.checked = this._doc.drumSpectrumOnRandomization;
    this._noiseBox.checked = this._doc.noiseOnRandomization;
    this._drumsetBox.checked = this._doc.drumsetOnRandomization;
    this._volumeBox.checked = this._doc.volumeOnRandomization;
    this._panBox.checked = this._doc.panningOnRandomization;
    this._panDelayBox.checked = this._doc.panDelayOnRandomization;
    this._fadeBox.checked = this._doc.fadeOnRandomization;
    this._unisonBox.checked = this._doc.unisonOnRandomization;
    this._EQFilterBox.checked = this._doc.EQFilterOnRandomization;
    this._EQFilterCutBox.checked = this._doc.EQFilterCutOnRandomization;
    this._EQFilterPeakBox.checked = this._doc.EQFilterPeakOnRandomization;
    this._EQFilterTypeBox.checked = this._doc.EQFilterTypeOnRandomization;
    this._noteFilterBox.checked = this._doc.noteFilterOnRandomization;
    this._noteFilterCutBox.checked = this._doc.noteFilterCutOnRandomization;
    this._noteFilterPeakBox.checked = this._doc.noteFilterPeakOnRandomization;
    this._noteFilterTypeBox.checked = this._doc.noteFilterTypeOnRandomization;
    this._chipwaveBox.checked = this._doc.chipWaveformOnRandomization;
    this._pulseWidthBox.checked = this._doc.PWMWidthOnRandomization;
    this._dynamismBox.checked = this._doc.supersawDynamismOnRandomization;
    this._spreadBox.checked = this._doc.supersawSpreadOnRandomization;
    this._shapeBox.checked = this._doc.supersawShapeOnRandomization;
    this._supersawPWMBox.checked = this._doc.supersawPulseWidthOnRandomization;
    this._harmonicsEditorBox.checked = this._doc.harmonicsShapeOnRandomization;
    this._sustainBox.checked = this._doc.sustainOnRandomization;
    this._spectrumEditorBox.checked = this._doc.spectrumEditorOnRandomization;
    this._customChipWaveBox.checked = this._doc.customChipWaveOnRandomization;
    this._customChipGenerationType.value = this._doc.customChipGenerationType;

    this._okayButton.addEventListener("click", this._confirm);
	this._cancelButton.addEventListener("click", this._close);

}

private _close = (): void => { 
    this._doc.undo();
}

private _confirm = (): void => { 
    this._doc.prefs.save();
	this._close();
}
public cleanUp = (): void => { 
    this._okayButton.removeEventListener("click", this._confirm);
    this._cancelButton.removeEventListener("click", this._close);
    }
}