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

	public unisonOnRandomization: boolean;
	public chipWaveOnRandomization: boolean;
	public PWMOnRandomization: boolean;
	public supersawOnRandomization: boolean;
	public harmonicsOnRandomization: boolean;
	public pickedStringOnRandomization: boolean;
	public spectrumOnRandomization: boolean;
	public FMOnRandomization: boolean;
	public customChipOnRandomization: boolean;
	public noiseOnRandomization: boolean;
	public drumSpectrumOnRandomization: boolean;
	public drumNoiseOnRandomization: boolean;
	public drumsetOnRandomization: boolean;
	public fadeOnRandomization: boolean;
	public EQFilterOnRandomization: boolean;
	public noteFilterOnRandomization: boolean;

	public deactivateCapsLock: boolean;
	public CTRLrEvent: string;
	
	constructor() {
		this.reload();
	}
	
	public reload(): void {
		this.autoPlay = window.localStorage.getItem("autoPlay") == "true";
		this.autoFollow = window.localStorage.getItem("autoFollow") != "false";
		this.enableNotePreview = window.localStorage.getItem("enableNotePreview") != "false";
		this.showFifth = window.localStorage.getItem("showFifth") == "true";
		this.notesOutsideScale = window.localStorage.getItem("notesOutsideScale") == "true";
		this.showLetters = window.localStorage.getItem("showLetters") == "true";
		this.showChannels = window.localStorage.getItem("showChannels") == "true";
		this.showScrollBar = window.localStorage.getItem("showScrollBar") == "true";
		this.alwaysFineNoteVol = window.localStorage.getItem("alwaysFineNoteVol") == "true";
		this.displayVolumeBar = window.localStorage.getItem("displayVolumeBar") == "true";
		this.instrumentCopyPaste = window.localStorage.getItem("instrumentCopyPaste") == "true";
		this.enableChannelMuting = window.localStorage.getItem("enableChannelMuting") == "true";
		this.displayBrowserUrl = window.localStorage.getItem("displayBrowserUrl") != "false";
		this.pressControlForShortcuts = window.localStorage.getItem("pressControlForShortcuts") == "true";
		this.enableMidi = window.localStorage.getItem("enableMidi") != "false";
		this.showRecordButton = window.localStorage.getItem("showRecordButton") == "true";
		this.snapRecordedNotesToRhythm = window.localStorage.getItem("snapRecordedNotesToRhythm") == "true";
		this.ignorePerformedNotesNotInScale = window.localStorage.getItem("ignorePerformedNotesNotInScale") == "true";
		this.metronomeCountIn = window.localStorage.getItem("metronomeCountIn") != "false";
		this.metronomeWhileRecording = window.localStorage.getItem("metronomeWhileRecording") != "false";
		this.showOscilloscope = window.localStorage.getItem("showOscilloscope") != "false";
		this.keyboardLayout = window.localStorage.getItem("keyboardLayout") || "wickiHayden";
		this.bassOffset = (+(<any>window.localStorage.getItem("bassOffset"))) || 0;
		this.layout = window.localStorage.getItem("layout") || "small";
		this.colorTheme = window.localStorage.getItem("colorTheme") || "midbox";
		this.visibleOctaves = ((<any>window.localStorage.getItem("visibleOctaves")) >>> 0) || Preferences.defaultVisibleOctaves;

		this.unisonOnRandomization = window.localStorage.getItem("unisonOnRandomization") != "false";
		this.chipWaveOnRandomization = window.localStorage.getItem("chipWaveOnRandomization") != "false";
		this.PWMOnRandomization = window.localStorage.getItem("PWMOnRandomization") != "false";
		this.supersawOnRandomization = window.localStorage.getItem("supersawOnRandomization") != "false";
		this.harmonicsOnRandomization = window.localStorage.getItem("harmonicsOnRandomization") != "false";
		this.pickedStringOnRandomization = window.localStorage.getItem("pickedStringOnRandomization") != "false";
		this.spectrumOnRandomization = window.localStorage.getItem("spectrumOnRandomization") != "false";
		this.FMOnRandomization = window.localStorage.getItem("FMOnRandomization") != "false";
		this.customChipOnRandomization = window.localStorage.getItem("customChipOnRandomization") != "false";
		this.noiseOnRandomization = window.localStorage.getItem("noiseOnRandomization") != "false";
		this.drumSpectrumOnRandomization = window.localStorage.getItem("drumSpectrumOnRandomization") != "false";
		this.drumNoiseOnRandomization = window.localStorage.getItem("drumNoiseOnRandomization") != "false";
		this.drumsetOnRandomization = window.localStorage.getItem("drumsetOnRandomization") == "true";
		this.fadeOnRandomization = window.localStorage.getItem("fadeOnRandomization") != "false";
		this.EQFilterOnRandomization = window.localStorage.getItem("EQFilterOnRandomization") != "false";
		this.noteFilterOnRandomization = window.localStorage.getItem("noteFilterOnRandomization") != "false";
		
		this.deactivateCapsLock = window.localStorage.getItem("deactivateCapsLock") != "false";
		this.CTRLrEvent = window.localStorage.getItem("CTRLrEvent") || "ctrlRtoRandomGenPrompt";

		const defaultScale: Scale | undefined = Config.scales.dictionary[window.localStorage.getItem("defaultScale")!];
		this.defaultScale = (defaultScale != undefined) ? defaultScale.index : 0;
		
		if (window.localStorage.getItem("volume") != null) {
			this.volume = Math.min(<any>window.localStorage.getItem("volume") >>> 0, 75);
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
		window.localStorage.setItem("keyboardLayout", this.keyboardLayout);
		window.localStorage.setItem("bassOffset", String(this.bassOffset));
		window.localStorage.setItem("layout", this.layout);
		window.localStorage.setItem("colorTheme", this.colorTheme);
		window.localStorage.setItem("volume", String(this.volume));
		window.localStorage.setItem("visibleOctaves", String(this.visibleOctaves));

		window.localStorage.setItem("unisonOnRandomization", this.unisonOnRandomization ? "true" : "false");
		window.localStorage.setItem("chipWaveOnRandomization", this.chipWaveOnRandomization ? "true" : "false");
		window.localStorage.setItem("PWMOnRandomization", this.PWMOnRandomization ? "true" : "false");
		window.localStorage.setItem("supersawOnRandomization", this.supersawOnRandomization ? "true" : "false");
		window.localStorage.setItem("harmonicsOnRandomization", this.harmonicsOnRandomization ? "true" : "false");
		window.localStorage.setItem("pickedStringOnRandomization", this.pickedStringOnRandomization ? "true" : "false");
		window.localStorage.setItem("spectrumOnRandomization", this.spectrumOnRandomization ? "true" : "false");
		window.localStorage.setItem("FMOnRandomization", this.FMOnRandomization ? "true" : "false");
		window.localStorage.setItem("customChipOnRandomization", this.customChipOnRandomization ? "true" : "false");
		window.localStorage.setItem("noiseOnRandomization", this.noiseOnRandomization ? "true" : "false");
		window.localStorage.setItem("drumSpectrumOnRandomization", this.drumSpectrumOnRandomization ? "true" : "false");
		window.localStorage.setItem("drumNoiseOnRandomization", this.drumNoiseOnRandomization ? "true" : "false");
		window.localStorage.setItem("drumsetOnRandomization", this.drumsetOnRandomization ? "true" : "false");
		window.localStorage.setItem("fadeOnRandomization", this.fadeOnRandomization ? "true" : "false");
		window.localStorage.setItem("EQFilterOnRandomization", this.EQFilterOnRandomization ? "true" : "false");
		window.localStorage.setItem("noteFilterOnRandomization", this.noteFilterOnRandomization ? "true" : "false");

		window.localStorage.setItem("deactivateCapsLock", this.deactivateCapsLock ? "true" : "false");
		window.localStorage.setItem("CTRLrEvent", this.CTRLrEvent);
	}
}
