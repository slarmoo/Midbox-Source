import { HTML } from "imperative-html/dist/esm/elements-strict";
import { Prompt } from "./Prompt";
import { SongDocument } from "./SongDocument";
import { Localization as _ } from "./Localization";

const {button, input, select, option, div, h2, label, p} = HTML;

export class KeybindSetupPrompt implements Prompt {
    private readonly _deactivateCapsLockBox: HTMLInputElement = input({style: "width: 3em; margin-left: 1em;", type: "checkbox"});
    private readonly _CTRLAndROptions: HTMLSelectElement = select({style: "width: 70%; margin-left: 1em;"},
    option({value: "ctrlRtoRandomGenPrompt"}, "Open Random Gen Settings"),
    option({value: "ctrlRtoPageReload"}, "Reload Page"),
    option({value: "ctrlRDeactivated"}, "Deactivate"),
    );

    private readonly _cancelButton: HTMLButtonElement = button({class: "cancelButton"});
	private readonly _okayButton: HTMLButtonElement = button({class: "okayButton", style: "width:45%;"}, _.confirmLabel);

public readonly container: HTMLDivElement = div({class: "prompt noSelection", style: "width: 350px; text-align: center; max-height: 80%; overflow-y: auto;"},
    h2({style: "text-align: center;"},
        "Keybind Setup"),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 5em; justify-content: flex-end;"},
			"Caps Lock:",
            p({style: "margin-left: 2em;"},
                "Caps lock makes it where each key you press on your keyboard will be played out loud."),
			this._deactivateCapsLockBox,
        ),
    label({style: "display: flex; flex-direction: row; align-items: center; height: 5em; justify-content: flex-end;"},
			"CTRL + R:",
            p({style: "margin-left: 2em;"},
                "Ctrl+r will, in most cases, refresh the page. In Midbox, it instead brings you to the random generation settings prompt."),
			this._CTRLAndROptions,
        ),
    label({style: "display: flex; flex-direction: row-reverse; justify-content: space-between;"},
			this._okayButton,
		),
		this._cancelButton,
);

constructor(private _doc: SongDocument) {
    this._deactivateCapsLockBox.checked = this._doc.prefs.deactivateCapsLock;
    this._CTRLAndROptions.value = this._doc.prefs.CTRLrEvent;

    this._okayButton.addEventListener("click", this._confirm);
	this._cancelButton.addEventListener("click", this._close);

}

private _close = (): void => { 
    this._doc.undo();
}

private _confirm = (): void => { 
    this._doc.prefs.deactivateCapsLock = this._deactivateCapsLockBox.checked;
    this._doc.prefs.CTRLrEvent = this._CTRLAndROptions.value;

    this._doc.prefs.save();
	this._close();
}

public cleanUp = (): void => { 
    this._okayButton.removeEventListener("click", this._confirm);
    this._cancelButton.removeEventListener("click", this._close);
    }
}