import { Prompt } from "./Prompt";
import { HTML } from "imperative-html/dist/esm/elements-strict";
import { SongDocument } from "./SongDocument";


    const {div, h2, h4, input, label, button, p, option, select} = HTML;

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

    private readonly _fadeBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _unisonBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _volumeBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _panBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _panDelayBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});

    private readonly _EQFilterBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _EQFilterCutBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _EQFilterPeakBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _EQFilterTypeBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _EQFilterMorphsBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _noteFilterBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _noteFilterCutBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _noteFilterPeakBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _noteFilterTypeBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _noteFilterMorphsBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});

    private readonly _chipwaveBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _pulseWidthBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _dynamismBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _spreadBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _shapeBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _supersawPWMBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _harmonicsEditorBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _sustainBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _sustainTypeBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _spectrumEditorBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _customChipGenerationType: HTMLSelectElement = select({style: "width: 70%; margin-left: 1em;"},
    option({value: "customChipGenerateNone"}, "Do Not Randomize"),
    option({value: "customChipGeneratePreset"}, "Random Waveform Preset"),
    option({value: "customChipGenerateAlgorithm"}, "Algorithmic Generation"),
    option({value: "customChipGenerateFully"}, "Fully Random"),
    );
    private readonly _noiseTypeBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _drumsetSpectrumBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _drumsetEnvelopeBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _wavetableSpeedBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _wavetableCustomChipGenerationType: HTMLSelectElement = select({style: "width: 70%; margin-left: 1em;"},
    option({value: "wavetableCustomChipGenerateNone"}, "Do Not Randomize"),
    option({value: "wavetableCustomChipGeneratePreset"}, "Random Waveform Preset"),
    option({value: "wavetableCustomChipGenerateAlgorithm"}, "Algorithmic Generation"),
    option({value: "wavetableCustomChipGenerateFully"}, "Fully Random"),
    );
    private readonly _wavetableWavesInCycleBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _wavetableInterpolationBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _wavetableCycleType: HTMLSelectElement = select({style: "width: 70%; margin-left: 1em;"},
    option({value: "wavetableCycleTypeNone"}, "Do Not Randomize"),
    option({value: "wavetableCycleTypePerNote"}, "Possibly 'Per Note' Cycling"),
    option({value: "wavetableCycleTypePerNoteAndOneShot"}, "'Per Note' Cycling and One Shot Cycling"),
    );

    private readonly _FMAlgorithmBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _FMOpFrequencyBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _FMOpVolumeBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _FMOpWaveformBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _FMFeedbackBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _FMFeedbackVolumeBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});

    private readonly _transitionTypeBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _slideSpeedBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _clicklessBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _continueThruPatternBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _chordTypeBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _strumSpeedBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _arpeggioSpeedBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _arpeggioFastTwoNoteBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _arpeggioPatternBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _pitchShiftBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _detuneBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _vibratoBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _vibratoDepthBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _vibratoSpeedBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _vibratoDelayBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _vibratoTypeBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _distortionBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _aliasingBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _bitCrushBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _freqCrushBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _chorusBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _echoSustainBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _echoDelayBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _reverbBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _keyAffectedBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _SDAffectedBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _SOAffectedBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});

    private readonly _envelopeBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _envelopeSpeedBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _discreteEnvelopeBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});

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
			"EQ Filter Morphs:",
			this._EQFilterMorphsBox,
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
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"EQ Filter Morphs:",
			this._noteFilterMorphsBox,
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
            "Picked String Sustain Type:",
            this._sustainTypeBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Spectrum (Shape):",
			this._spectrumEditorBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Custom Chip Generation Type:",
			this._customChipGenerationType,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Noise Type:",
			this._noiseTypeBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Drumset Spectrums:",
			this._drumsetSpectrumBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Drumset Envelopes:",
			this._drumsetEnvelopeBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Wavetable Custom Chip's Gen Type:",
			this._wavetableCustomChipGenerationType,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Wavetable Speed:",
			this._wavetableSpeedBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Wavetable Cycle's Waves:",
			this._wavetableWavesInCycleBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Wavetable Interpolation:",
			this._wavetableInterpolationBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Wavetable Cycle Type:",
			this._wavetableCycleType,
        ),
    h4({style: "display: flex; flex-direction: row; text-align: center; align-items: center; height: 0.5em; justify-content: flex-end;"},
        "FM-Centric",
    ),    
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"FM Algorithm:",
			this._FMAlgorithmBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
            "FM Operator Frequency:",
            this._FMOpFrequencyBox,
    ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"FM Operator Volume:",
			this._FMOpVolumeBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"FM Operator Waveform:",
			this._FMOpWaveformBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"FM Feedback:",
			this._FMFeedbackBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"FM Feedback Volume:",
			this._FMFeedbackVolumeBox,
        ),
    h4({style: "display: flex; flex-direction: row; text-align: center; align-items: center; height: 0.5em; justify-content: flex-end;"},
        "Effects",
    ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Transition Type:",
			this._transitionTypeBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Slide Speed:",
			this._slideSpeedBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Clickless Transition:",
			this._clicklessBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Continue Through Pattern:",
			this._continueThruPatternBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Chord Type:",
			this._chordTypeBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Strum Speed:",
			this._strumSpeedBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Arpeggio Speed:",
			this._arpeggioSpeedBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Fast Two-Note Arpeggio:",
			this._arpeggioFastTwoNoteBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Arpeggio Pattern:",
			this._arpeggioPatternBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Pitch Shift:",
			this._pitchShiftBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Detune:",
			this._detuneBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Vibrato:",
			this._vibratoBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Vibrato Depth:",
			this._vibratoDepthBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Vibrato Speed:",
			this._vibratoSpeedBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Vibrato Delay:",
			this._vibratoDelayBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Vibrato Type:",
			this._vibratoTypeBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Distortion:",
			this._distortionBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Aliasing:",
			this._aliasingBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Bit Crush:",
			this._bitCrushBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Freq Crush:",
			this._freqCrushBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Chorus:",
			this._chorusBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Echo Sustain:",
			this._echoSustainBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Echo Delay:",
			this._echoDelayBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Reverb:",
			this._reverbBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Song Key-Affected:",
			this._keyAffectedBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"SD-Affected:",
			this._SDAffectedBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"SO-Affected:",
			this._SOAffectedBox,
        ),
    h4({style: "display: flex; flex-direction: row; text-align: center; align-items: center; height: 0.5em; justify-content: flex-end;"},
        "Envelopes",
    ),  
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"All Envelopes:",
			this._envelopeBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Envelope Speed:",
			this._envelopeSpeedBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 1em; justify-content: flex-end;"},
			"Discrete Envelopes:",
			this._discreteEnvelopeBox,
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

    this._volumeBox.checked = this._doc.prefs.volumeOnRandomization;
    this._panBox.checked = this._doc.prefs.panningOnRandomization;
    this._panDelayBox.checked = this._doc.prefs.panDelayOnRandomization;
    this._fadeBox.checked = this._doc.prefs.fadeOnRandomization;
    this._unisonBox.checked = this._doc.prefs.unisonOnRandomization;

    this._EQFilterBox.checked = this._doc.prefs.EQFilterOnRandomization;
    this._EQFilterCutBox.checked = this._doc.EQFilterCutOnRandomization;
    this._EQFilterPeakBox.checked = this._doc.EQFilterPeakOnRandomization;
    this._EQFilterTypeBox.checked = this._doc.EQFilterTypeOnRandomization;
    this._EQFilterMorphsBox.checked = this._doc.EQFilterMorphsOnRandomization;
    this._noteFilterBox.checked = this._doc.prefs.noteFilterOnRandomization;
    this._noteFilterCutBox.checked = this._doc.noteFilterCutOnRandomization;
    this._noteFilterPeakBox.checked = this._doc.noteFilterPeakOnRandomization;
    this._noteFilterTypeBox.checked = this._doc.noteFilterTypeOnRandomization;
    this._noteFilterMorphsBox.checked = this._doc.noteFilterMorphsOnRandomization;

    this._chipwaveBox.checked = this._doc.chipWaveformOnRandomization;
    this._pulseWidthBox.checked = this._doc.PWMWidthOnRandomization;
    this._dynamismBox.checked = this._doc.supersawDynamismOnRandomization;
    this._spreadBox.checked = this._doc.supersawSpreadOnRandomization;
    this._shapeBox.checked = this._doc.supersawShapeOnRandomization;
    this._supersawPWMBox.checked = this._doc.supersawPulseWidthOnRandomization;
    this._harmonicsEditorBox.checked = this._doc.harmonicsShapeOnRandomization;
    this._sustainBox.checked = this._doc.sustainOnRandomization;
    this._sustainTypeBox.checked = this._doc.sustainTypeOnRandomization;
    this._spectrumEditorBox.checked = this._doc.spectrumEditorOnRandomization;
    this._customChipGenerationType.value = this._doc.prefs.customChipGenerationType;
    this._noiseTypeBox.checked = this._doc.noiseTypeOnRandomization;
    this._drumsetSpectrumBox.checked = this._doc.drumsetSpectrumOnRandomization;
    this._drumsetEnvelopeBox.checked = this._doc.drumsetEnvelopeOnRandomization;
    this._wavetableCustomChipGenerationType.value = this._doc.prefs.wavetableCustomChipGenerationType;
    this._wavetableSpeedBox.checked = this._doc.prefs.wavetableSpeedOnRandomization;
    this._wavetableWavesInCycleBox.checked = this._doc.prefs.wavetableWavesInCycleOnRandomization;
    this._wavetableInterpolationBox.checked = this._doc.prefs.wavetableInterpolationOnRandomization;
    this._wavetableCycleType.value = this._doc.prefs.wavetableCycleType;

    this._FMAlgorithmBox.checked = this._doc.FMAlgorithmOnRandomization;
    this._FMOpFrequencyBox.checked = this._doc.FMOpFrequencyOnRandomization;
    this._FMOpVolumeBox.checked = this._doc.FMOpVolumeOnRandomization;
    this._FMOpWaveformBox.checked = this._doc.FMOpWaveformOnRandomization;
    this._FMFeedbackBox.checked = this._doc.FMFeedbackOnRandomization;
    this._FMFeedbackVolumeBox.checked = this._doc.FMFeedbackVolumeOnRandomization;

    this._transitionTypeBox.checked = this._doc.transitionTypeOnRandomization;
    this._slideSpeedBox.checked = this._doc.slideSpeedOnRandomization;
    this._clicklessBox.checked = this._doc.clicklessTransitionOnRandomization;
    this._continueThruPatternBox.checked = this._doc.continueThruPatternOnRandomization;
    this._chordTypeBox.checked = this._doc.chordTypeOnRandomization;
    this._strumSpeedBox.checked = this._doc.strumSpeedOnRandomization;
    this._arpeggioSpeedBox.checked = this._doc.arpeggioSpeedOnRandomization;
    this._arpeggioFastTwoNoteBox.checked = this._doc.arpeggioFastTwoNoteOnRandomization;
    this._arpeggioPatternBox.checked = this._doc.arpeggioPatternOnRandomization;
    this._pitchShiftBox.checked = this._doc.pitchShiftOnRandomization;
    this._detuneBox.checked = this._doc.detuneOnRandomization;
    this._vibratoBox.checked = this._doc.vibratoOnRandomization;
    this._vibratoDepthBox.checked = this._doc.vibratoDepthOnRandomization;
    this._vibratoSpeedBox.checked = this._doc.vibratoSpeedOnRandomization;
    this._vibratoDelayBox.checked = this._doc.vibratoDelayOnRandomization;
    this._vibratoTypeBox.checked = this._doc.vibratoTypeOnRandomization;
    this._distortionBox.checked = this._doc.distortionOnRandomization;
    this._aliasingBox.checked = this._doc.aliasingOnRandomization;
    this._bitCrushBox.checked = this._doc.bitCrushOnRandomization;
    this._freqCrushBox.checked = this._doc.freqCrushOnRandomization;
    this._chorusBox.checked = this._doc.chorusOnRandomization;
    this._echoSustainBox.checked = this._doc.echoSustainOnRandomization;
    this._echoDelayBox.checked = this._doc.echoDelayOnRandomization;
    this._reverbBox.checked = this._doc.reverbOnRandomization;
    this._keyAffectedBox.checked = this._doc.keyAffectedOnRandomization;
    this._SDAffectedBox.checked = this._doc.SDAffectedOnRandomization;
    this._SOAffectedBox.checked = this._doc.SOAffectedOnRandomization;
    
    this._envelopeBox.checked = this._doc.envelopesOnRandomization;
    this._envelopeSpeedBox.checked = this._doc.envelopeSpeedOnRandomization;
    this._discreteEnvelopeBox.checked = this._doc.discreteEnvelopesOnRandomization;

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

    this._doc.prefs.volumeOnRandomization = this._volumeBox.checked;
    this._doc.prefs.panningOnRandomization = this._panBox.checked;
    this._doc.prefs.panDelayOnRandomization = this._panDelayBox.checked;
    this._doc.prefs.fadeOnRandomization = this._fadeBox.checked;
    this._doc.prefs.unisonOnRandomization = this._unisonBox.checked;

    this._doc.prefs.EQFilterOnRandomization = this._EQFilterBox.checked;
    this._doc.prefs.noteFilterOnRandomization = this._noteFilterBox.checked;

    this._doc.prefs.customChipGenerationType = this._customChipGenerationType.value;
    this._doc.prefs.wavetableCustomChipGenerationType = this._wavetableCustomChipGenerationType.value;
    this._doc.prefs.wavetableSpeedOnRandomization = this._wavetableSpeedBox.checked;
    this._doc.prefs.wavetableWavesInCycleOnRandomization = this._wavetableWavesInCycleBox.checked;
    this._doc.prefs.wavetableInterpolationOnRandomization = this._wavetableInterpolationBox.checked;
    this._doc.prefs.wavetableCycleType = this._wavetableCycleType.value;

    this._doc.prefs.save();
	this._close();
}

public cleanUp = (): void => { 
    this._okayButton.removeEventListener("click", this._confirm);
    this._cancelButton.removeEventListener("click", this._close);
    }
}