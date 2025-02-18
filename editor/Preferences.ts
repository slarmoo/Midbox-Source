// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import {Scale, Config} from "../synth/SynthConfig";

export class Preferences {
	public static readonly defaultVisibleOctaves: number = 3;
	
	public autoPlay: boolean;
	public autoFollow: boolean;
	public enableNotePreview: boolean;
	public showFifth: boolean;
	public notesOutsideScale: boolean;
	public defaultScale: number;
	public showLetters: boolean;
	public showChannels: boolean;
	public showScrollBar: boolean;
	public alwaysFineNoteVol: boolean;
	public displayVolumeBar: boolean;
	public instrumentCopyPaste: boolean;
	public enableChannelMuting: boolean;
	public colorTheme: string;
	public layout: string;
	public displayBrowserUrl: boolean;
	public volume: number = 75;
	public oscilloscopeScale: number = 1;
	public visibleOctaves: number = Preferences.defaultVisibleOctaves;
	public pressControlForShortcuts: boolean;
	public keyboardLayout: string;
	public bassOffset: number;
	public enableMidi: boolean;
	public showRecordButton: boolean;
	public snapRecordedNotesToRhythm: boolean;
	public ignorePerformedNotesNotInScale: boolean;
	public metronomeCountIn: boolean;
	public metronomeWhileRecording: boolean;
	public showOscilloscope: boolean;
	public showEnvReorderButtons: boolean;

	// Random Generation Setup
		public chipWaveOnRandomization: boolean;
		public PWMOnRandomization: boolean;
		public supersawOnRandomization: boolean;
		public harmonicsOnRandomization: boolean;
		public pickedStringOnRandomization: boolean;
		public spectrumOnRandomization: boolean;
		public FMOnRandomization: boolean;
		public ADVFMOnRandomization: boolean;
		public customChipOnRandomization: boolean;
		public noiseOnRandomization: boolean;
		public wavetableOnRandomization: boolean;

		public drumSpectrumOnRandomization: boolean;
		public drumNoiseOnRandomization: boolean;
		public drumsetOnRandomization: boolean;

		public volumeOnRandomization: boolean;
		public panningOnRandomization: boolean;
		public panDelayOnRandomization: boolean;
		public fadeOnRandomization: boolean;
		public unisonOnRandomization: boolean;

		public EQFilterOnRandomization: boolean;
		public noteFilterOnRandomization: boolean;

		public customChipGenerationType: string;
		public wavetableCustomChipGenerationType: string;
		public wavetableSpeedOnRandomization: boolean;
		public wavetableWavesInCycleOnRandomization: boolean;
		public wavetableInterpolationOnRandomization: boolean;
		public wavetableCycleType: string;

	// Keybind Setup
		public deactivateCapsLock: boolean;
		public CTRLrEvent: string;
		public deactivateBKeybind: boolean;
	
	constructor() {
		this.reload();
	}
	
	public reload(): void {
		this.autoPlay = window.localStorage.getItem("autoPlay") == "true";
		this.autoFollow = window.localStorage.getItem("autoFollow") == "true";
		this.enableNotePreview = window.localStorage.getItem("enableNotePreview") != "false";
		this.showFifth = window.localStorage.getItem("showFifth") == "true";
		this.notesOutsideScale = window.localStorage.getItem("notesOutsideScale") == "true";
		this.showLetters = window.localStorage.getItem("showLetters") != "false";
		this.showChannels = window.localStorage.getItem("showChannels") == "true";
		this.showScrollBar = window.localStorage.getItem("showScrollBar") != "false";
		this.alwaysFineNoteVol = window.localStorage.getItem("alwaysFineNoteVol") == "true";
		this.displayVolumeBar = window.localStorage.getItem("displayVolumeBar") != "false";
		this.instrumentCopyPaste = window.localStorage.getItem("instrumentCopyPaste") != "false";
		this.enableChannelMuting = window.localStorage.getItem("enableChannelMuting") != "false";
		this.displayBrowserUrl = window.localStorage.getItem("displayBrowserUrl") != "false";
		this.pressControlForShortcuts = window.localStorage.getItem("pressControlForShortcuts") == "true";
		this.enableMidi = window.localStorage.getItem("enableMidi") != "false";
		this.showRecordButton = window.localStorage.getItem("showRecordButton") == "true";
		this.snapRecordedNotesToRhythm = window.localStorage.getItem("snapRecordedNotesToRhythm") == "true";
		this.ignorePerformedNotesNotInScale = window.localStorage.getItem("ignorePerformedNotesNotInScale") == "true";
		this.metronomeCountIn = window.localStorage.getItem("metronomeCountIn") != "false";
		this.metronomeWhileRecording = window.localStorage.getItem("metronomeWhileRecording") != "false";
		this.showOscilloscope = window.localStorage.getItem("showOscilloscope") != "false";
		this.showEnvReorderButtons = window.localStorage.getItem("showEnvReorderButtons") != "false";
		this.keyboardLayout = window.localStorage.getItem("keyboardLayout") || "wickiHayden";
		this.bassOffset = (+(<any>window.localStorage.getItem("bassOffset"))) || 0;
		this.layout = window.localStorage.getItem("layout") || "small";
		this.colorTheme = window.localStorage.getItem("colorTheme") || "midbox";
		this.visibleOctaves = ((<any>window.localStorage.getItem("visibleOctaves")) >>> 0) || Preferences.defaultVisibleOctaves;

		// Random Generation Setup
		this.chipWaveOnRandomization = window.localStorage.getItem("chipWaveOnRandomization") != "false";
		this.PWMOnRandomization = window.localStorage.getItem("PWMOnRandomization") != "false";
		this.supersawOnRandomization = window.localStorage.getItem("supersawOnRandomization") != "false";
		this.harmonicsOnRandomization = window.localStorage.getItem("harmonicsOnRandomization") != "false";
		this.pickedStringOnRandomization = window.localStorage.getItem("pickedStringOnRandomization") != "false";
		this.spectrumOnRandomization = window.localStorage.getItem("spectrumOnRandomization") != "false";
		this.FMOnRandomization = window.localStorage.getItem("FMOnRandomization") != "false";
		this.ADVFMOnRandomization = window.localStorage.getItem("ADVFMOnRandomization") != "false";
		this.customChipOnRandomization = window.localStorage.getItem("customChipOnRandomization") != "false";
		this.noiseOnRandomization = window.localStorage.getItem("noiseOnRandomization") != "false";
		this.wavetableOnRandomization = window.localStorage.getItem("wavetableOnRandomization") != "false";

		this.drumSpectrumOnRandomization = window.localStorage.getItem("drumSpectrumOnRandomization") != "false";
		this.drumNoiseOnRandomization = window.localStorage.getItem("drumNoiseOnRandomization") != "false";
		this.drumsetOnRandomization = window.localStorage.getItem("drumsetOnRandomization") != "false";

		this.volumeOnRandomization = window.localStorage.getItem("volumeOnRandomization") == "true";
		this.panningOnRandomization = window.localStorage.getItem("panningOnRandomization") == "true";
		this.panDelayOnRandomization = window.localStorage.getItem("panDelayOnRandomization") == "true";
		this.fadeOnRandomization = window.localStorage.getItem("fadeOnRandomization") != "false";
		this.unisonOnRandomization = window.localStorage.getItem("unisonOnRandomization") != "false";

		this.EQFilterOnRandomization = window.localStorage.getItem("EQFilterOnRandomization") != "false";
		this.noteFilterOnRandomization = window.localStorage.getItem("noteFilterOnRandomization") != "false";

		this.customChipGenerationType = window.localStorage.getItem("customChipGenerationType") || "customChipGenerateAlgorithm";
		this.wavetableCustomChipGenerationType = window.localStorage.getItem("wavetableCustomChipGenerationType") || "wavetableCustomChipGenerateAlgorithm";
		this.wavetableSpeedOnRandomization = window.localStorage.getItem("wavetableSpeedOnRandomization") != "false";
		this.wavetableWavesInCycleOnRandomization = window.localStorage.getItem("wavetableWavesInCycleOnRandomization") == "true";
		this.wavetableInterpolationOnRandomization = window.localStorage.getItem("wavetableInterpolationOnRandomization") != "false";
		this.wavetableCycleType = window.localStorage.getItem("wavetableCycleType") || "wavetableCycleTypePerNoteAndOneShot";
		
		// Keybind Setup
		this.deactivateCapsLock = window.localStorage.getItem("deactivateCapsLock") != "false";
		this.CTRLrEvent = window.localStorage.getItem("CTRLrEvent") || "ctrlRtoRandomGenPrompt";
		this.deactivateBKeybind = window.localStorage.getItem("deactivateBKeybind") != "false";
		

		const defaultScale: Scale | undefined = Config.scales.dictionary[window.localStorage.getItem("defaultScale")!];
		this.defaultScale = (defaultScale != undefined) ? defaultScale.index : 0;
		
		if (window.localStorage.getItem("volume") != null) {
			this.volume = Math.min(<any>window.localStorage.getItem("volume") >>> 0, 75);
		}

		if (window.localStorage.getItem("oscilloscopeScale") != null) {
			this.oscilloscopeScale = Math.min(Number(<any>window.localStorage.getItem("oscilloscopeScale")), 5);
		}
		
		if (window.localStorage.getItem("fullScreen") != null) {
			if (window.localStorage.getItem("fullScreen") == "true") this.layout = "long";
			window.localStorage.removeItem("fullScreen");
		}
	}
	
	public save(): void {
		window.localStorage.setItem("autoPlay", this.autoPlay ? "true" : "false");
		window.localStorage.setItem("autoFollow", this.autoFollow ? "true" : "false");
		window.localStorage.setItem("enableNotePreview", this.enableNotePreview ? "true" : "false");
		window.localStorage.setItem("showFifth", this.showFifth ? "true" : "false");
		window.localStorage.setItem("notesOutsideScale", this.notesOutsideScale ? "true" : "false");
		window.localStorage.setItem("defaultScale", Config.scales[this.defaultScale].name);
		window.localStorage.setItem("showLetters", this.showLetters ? "true" : "false");
		window.localStorage.setItem("showChannels", this.showChannels ? "true" : "false");
		window.localStorage.setItem("showScrollBar", this.showScrollBar ? "true" : "false");
		window.localStorage.setItem("alwaysFineNoteVol", this.alwaysFineNoteVol ? "true" : "false");
		window.localStorage.setItem("displayVolumeBar", this.displayVolumeBar ? "true" : "false");
		window.localStorage.setItem("enableChannelMuting", this.enableChannelMuting ? "true" : "false");
		window.localStorage.setItem("instrumentCopyPaste", this.instrumentCopyPaste ? "true" : "false");
		window.localStorage.setItem("displayBrowserUrl", this.displayBrowserUrl ? "true" : "false");
		window.localStorage.setItem("pressControlForShortcuts", this.pressControlForShortcuts ? "true" : "false");
		window.localStorage.setItem("enableMidi", this.enableMidi ? "true" : "false");
		window.localStorage.setItem("showRecordButton", this.showRecordButton ? "true" : "false");
		window.localStorage.setItem("snapRecordedNotesToRhythm", this.snapRecordedNotesToRhythm ? "true" : "false");
		window.localStorage.setItem("ignorePerformedNotesNotInScale", this.ignorePerformedNotesNotInScale ? "true" : "false");
		window.localStorage.setItem("metronomeCountIn", this.metronomeCountIn ? "true" : "false");
		window.localStorage.setItem("metronomeWhileRecording", this.metronomeWhileRecording ? "true" : "false");
		window.localStorage.setItem("showOscilloscope", this.showOscilloscope ? "true" : "false");
		window.localStorage.setItem("showEnvReorderButtons", this.showEnvReorderButtons ? "true" : "false");
		window.localStorage.setItem("keyboardLayout", this.keyboardLayout);
		window.localStorage.setItem("bassOffset", String(this.bassOffset));
		window.localStorage.setItem("layout", this.layout);
		window.localStorage.setItem("colorTheme", this.colorTheme);
		window.localStorage.setItem("volume", String(this.volume));
		window.localStorage.setItem("oscilloscopeScale", String(this.oscilloscopeScale));
		window.localStorage.setItem("visibleOctaves", String(this.visibleOctaves));

		// Random Generation Setup
		window.localStorage.setItem("chipWaveOnRandomization", this.chipWaveOnRandomization ? "true" : "false");
		window.localStorage.setItem("PWMOnRandomization", this.PWMOnRandomization ? "true" : "false");
		window.localStorage.setItem("supersawOnRandomization", this.supersawOnRandomization ? "true" : "false");
		window.localStorage.setItem("harmonicsOnRandomization", this.harmonicsOnRandomization ? "true" : "false");
		window.localStorage.setItem("pickedStringOnRandomization", this.pickedStringOnRandomization ? "true" : "false");
		window.localStorage.setItem("spectrumOnRandomization", this.spectrumOnRandomization ? "true" : "false");
		window.localStorage.setItem("FMOnRandomization", this.FMOnRandomization ? "true" : "false");
		window.localStorage.setItem("ADVFMOnRandomization", this.ADVFMOnRandomization ? "true" : "false");
		window.localStorage.setItem("customChipOnRandomization", this.customChipOnRandomization ? "true" : "false");
		window.localStorage.setItem("noiseOnRandomization", this.noiseOnRandomization ? "true" : "false");
		window.localStorage.setItem("wavetableOnRandomization", this.wavetableOnRandomization ? "true" : "false");

		window.localStorage.setItem("drumSpectrumOnRandomization", this.drumSpectrumOnRandomization ? "true" : "false");
		window.localStorage.setItem("drumNoiseOnRandomization", this.drumNoiseOnRandomization ? "true" : "false");
		window.localStorage.setItem("drumsetOnRandomization", this.drumsetOnRandomization ? "true" : "false");

		window.localStorage.setItem("volumeOnRandomization", this.volumeOnRandomization ? "true" : "false");
		window.localStorage.setItem("panningOnRandomization", this.panningOnRandomization ? "true" : "false");
		window.localStorage.setItem("panDelayOnRandomization", this.panDelayOnRandomization ? "true" : "false");
		window.localStorage.setItem("fadeOnRandomization", this.fadeOnRandomization ? "true" : "false");
		window.localStorage.setItem("unisonOnRandomization", this.unisonOnRandomization ? "true" : "false");

		window.localStorage.setItem("EQFilterOnRandomization", this.EQFilterOnRandomization ? "true" : "false");
		window.localStorage.setItem("noteFilterOnRandomization", this.noteFilterOnRandomization ? "true" : "false");

		window.localStorage.setItem("customChipGenerationType", this.customChipGenerationType);
		window.localStorage.setItem("wavetableCustomChipGenerationType", this.wavetableCustomChipGenerationType);
		window.localStorage.setItem("wavetableSpeedOnRandomization", this.wavetableSpeedOnRandomization ? "true" : "false");
		window.localStorage.setItem("wavetableWavesInCycleOnRandomization", this.wavetableWavesInCycleOnRandomization ? "true" : "false");
		window.localStorage.setItem("wavetableInterpolationOnRandomization", this.wavetableInterpolationOnRandomization ? "true" : "false");
		window.localStorage.setItem("wavetableCycleType", this.wavetableCycleType);

		// Keybind Setup
		window.localStorage.setItem("deactivateCapsLock", this.deactivateCapsLock ? "true" : "false");
		window.localStorage.setItem("CTRLrEvent", this.CTRLrEvent);
		window.localStorage.setItem("deactivateBKeybind", this.deactivateBKeybind ? "true" : "false");
	}
}
