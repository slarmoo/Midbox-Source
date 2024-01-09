// Copyright (C) 2020 John Nesky, distributed under the MIT license.

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { Prompt } from "./Prompt";
import { SongDocument } from "./SongDocument";
import { ColorConfig } from "./ColorConfig";
import { Localization as _ } from "./Localization";

//namespace beepbox {
const { button, div, h2, select, option } = HTML;

export class ThemePrompt implements Prompt {
	private readonly _themeSelect: HTMLSelectElement = select({ style: "width: 100%;" },
		option({ value: "dark classic" }, (_.theme1Label)),
		option({ value: "light classic" }, (_.theme2Label)),
		option({ value: "dark competition" }, (_.theme3Label)),
		option({ value: "old jummbox classic" }, (_.theme25Label)),
		option({ value: "jummbox classic" }, (_.theme4Label)),
		// option({ value: "jummbox light" }, "JummBox Light"), // It's not ready to see the world yet...
		option({ value: "forest" }, (_.theme5Label)),
		option({ value: "canyon" }, (_.theme6Label)),
		option({ value: "midnight" }, (_.theme7Label)),
		option({ value: "beachcombing" }, (_.theme8Label)),
		option({ value: "violet verdant" }, (_.theme9Label)),
		option({ value: "sunset" }, (_.theme10Label)),
		option({ value: "autumn" }, (_.theme11Label)),
		option({ value: "fruit" }, (_.theme12Label)),
		option({ value: "toxic" }, (_.theme13Label)),
		option({ value: "roe" }, (_.theme14Label)),
		option({ value: "moonlight" }, (_.theme15Label)),
		option({ value: "portal" }, (_.theme16Label)),
		option({ value: "fusion" }, (_.theme17Label)),
		option({ value: "inverse" }, (_.theme18Label)),
		option({ value: "nebula" }, (_.theme19Label)),
		option({ value: "roe light" }, (_.theme20Label)),
		option({ value: "energized" }, (_.theme21Label)),
		option({ value: "neapolitan" }, (_.theme22Label)),
		option({ value: "mono" }, (_.theme26Label)),
		option({ value: "poly" }, (_.theme23Label)),
		option({ value: "blutonium" }, (_.theme27Label)),
		option({ value: "midbox" }, (_.theme24Label))
	);
	private readonly _cancelButton: HTMLButtonElement = button({ class: "cancelButton" });
	private readonly _okayButton: HTMLButtonElement = button({ class: "okayButton", style: "width:100%;" }, (_.confirmLabel));

	public readonly container: HTMLDivElement = div({ class: "prompt noSelection", style: "width: 220px;" },
		h2((_.themePromptLabel)),
		div({ style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;" },
			div({ class: "selectContainer", style: "width: 100%;" }, this._themeSelect),
		),
		div({ style: "display: flex; flex-direction: row-reverse; justify-content: space-between;" },
			this._okayButton,
		),
		this._cancelButton,
	);
	private readonly lastTheme: string | null = window.localStorage.getItem("colorTheme")

	constructor(private _doc: SongDocument) {
		if (this.lastTheme != null) {
			this._themeSelect.value = this.lastTheme;
		}
		this._okayButton.addEventListener("click", this._saveChanges);
		this._cancelButton.addEventListener("click", this._close);
		this.container.addEventListener("keydown", this._whenKeyPressed);
		this._themeSelect.addEventListener("change", this._previewTheme);
	}

	private _close = (): void => {
		if (this.lastTheme != null) {
			ColorConfig.setTheme(this.lastTheme);
		} else {
			ColorConfig.setTheme("jummbox classic");
		}
		this._doc.undo();
	}

	public cleanUp = (): void => {
		this._okayButton.removeEventListener("click", this._saveChanges);
		this._cancelButton.removeEventListener("click", this._close);
		this.container.removeEventListener("keydown", this._whenKeyPressed);
	}

	private _whenKeyPressed = (event: KeyboardEvent): void => {
		if ((<Element>event.target).tagName != "BUTTON" && event.keyCode == 13) { // Enter key
			this._saveChanges();
		}
	}

	private _saveChanges = (): void => {
		window.localStorage.setItem("colorTheme", this._themeSelect.value);
		this._doc.prompt = null;
		this._doc.prefs.colorTheme = this._themeSelect.value;
		this._doc.undo();
	}

	private _previewTheme = (): void => {
		ColorConfig.setTheme(this._themeSelect.value);
		this._doc.notifier.changed();
	}
}
//}
