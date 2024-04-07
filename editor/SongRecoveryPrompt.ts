// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { SongDocument } from "./SongDocument";
import { RecoveredSong, RecoveredVersion, SongRecovery, versionToKey } from "./SongRecovery";
import { Prompt } from "./Prompt";
import { HTML } from "imperative-html/dist/esm/elements-strict";
import { Localization as _ } from "./Localization";

	const {button, div, h2, p, select, option, iframe} = HTML;

export class SongRecoveryPrompt implements Prompt {
	private readonly _songContainer: HTMLDivElement = div();
		private readonly _cancelButton: HTMLButtonElement = button({class: "cancelButton"});
		
		public readonly container: HTMLDivElement = div({class: "prompt", style: "width: 300px;"},
		h2(_.songRecoveryPromptLabel),
			div({style: "max-height: 385px; overflow-y: auto;"},
			p(_.songRecoveryPromptLargeText1Label),
			this._songContainer,
			p(_.songRecoveryPromptLargeText2Label),
		),
		this._cancelButton,
	);
		
	constructor(private _doc: SongDocument) {
		this._cancelButton.addEventListener("click", this._close);
			
		const songs: RecoveredSong[] = SongRecovery.getAllRecoveredSongs();
			
		if (songs.length == 0) {
			this._songContainer.appendChild(p(_.songRecoveryPromptLargeText3Label));
		}
			
		for (const song of songs) {
				const versionMenu: HTMLSelectElement = select({style: "width: 100%;"});
				
			for (const version of song.versions) {
				versionMenu.appendChild(option({ value: version.time }, version.name + ": " + new Date(version.time).toLocaleString()));
			}
				
				const player: HTMLIFrameElement = iframe({style: "width: 100%; height: 60px; border: none; display: block;"});
			player.src = "recovery_player/#song=" + window.localStorage.getItem(versionToKey(song.versions[0]));
				const container: HTMLDivElement = div({style: "margin: 4px 0;"}, div({class: "selectContainer", style: "width: 100%; margin: 2px 0;"}, versionMenu), player);
			this._songContainer.appendChild(container);
				
			versionMenu.addEventListener("change", () => {
				const version: RecoveredVersion = song.versions[versionMenu.selectedIndex];
				player.contentWindow!.location.replace("recovery_player/#song=" + window.localStorage.getItem(versionToKey(version)));
				player.contentWindow!.dispatchEvent(new Event("hashchange"));
			});
		}
	}
		
		private _close = (): void => { 
		this._doc.undo();
	}
		
		public cleanUp = (): void => { 
		this._cancelButton.removeEventListener("click", this._close);
	}
}
