import { HTML } from "imperative-html/dist/esm/elements-strict";
import { Prompt } from "./Prompt";
import { SongDocument } from "./SongDocument";
import { Localization as _ } from "./Localization";

const { button, div, h2, select, option, p } = HTML;

export class LanguagePrompt implements Prompt {
	private readonly _languageSelect: HTMLSelectElement = select({ style: "width: 100%;" },
			option({ value: "english" }, (_.englishDefaultLanguageLabel)),
			option({ value: "spanish" }, "Español / Spanish"),
	);
	private readonly _cancelButton: HTMLButtonElement = button({ class: "cancelButton" });
	private readonly _okayButton: HTMLButtonElement = button({ class: "okayButton", style: "width:100%;" }, (_.confirmLabel));

	public readonly container: HTMLDivElement = div({ class: "prompt noSelection", style: "width: 220px;" },
		h2((_.languagePromptLabel)),
		div({ style: "display: flex; flex-direction: row; align-items: center; height: 2em; justify-content: flex-end;" },
			div({ class: "selectContainer", style: "width: 100%;" }, this._languageSelect),
		),
		p(_.previewLanguageTextLabel),
		div({ style: "display: flex; flex-direction: row-reverse; justify-content: space-between;" }, this._okayButton),
		this._cancelButton,
	);
	private readonly lastLanguage: string | null = window.localStorage.getItem("language");

	constructor(private _doc: SongDocument) {
		if (this.lastLanguage != null) this._languageSelect.value = this.lastLanguage;
		this._okayButton.addEventListener("click", this._saveChanges);
		this._cancelButton.addEventListener("click", this._close);
		this.container.addEventListener("keydown", this._whenKeyPressed);
		this._languageSelect.addEventListener("change", this._previewLanguage);
	}

	private _close = (): void => {
		if (this.lastLanguage != null) {
			window.localStorage.setItem("language", this.lastLanguage);
		} else {
			window.localStorage.setItem("language", "english");
		}
		this._doc.undo();
		setTimeout(() => { location.reload() }, 50);
	}

	public cleanUp = (): void => {
		this._okayButton.removeEventListener("click", this._saveChanges);
		this._cancelButton.removeEventListener("click", this._close);
		this.container.removeEventListener("keydown", this._whenKeyPressed);
	}

	private _whenKeyPressed = (event: KeyboardEvent): void => {
		if ((<Element>event.target).tagName != "BUTTON" && event.keyCode == 13) this._saveChanges();
	}

	private _saveChanges = (): void => {
		window.localStorage.setItem("language", this._languageSelect.value);
		this._doc.prompt = null;
		this._doc.undo();
		setTimeout(() => { location.reload() }, 50);
	}

	private _previewLanguage = (): void => {
		window.localStorage.setItem("language", this._languageSelect.value);
	}
}