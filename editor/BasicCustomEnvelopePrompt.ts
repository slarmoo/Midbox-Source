// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";
import { Prompt } from "./Prompt";
import { Config } from "../synth/SynthConfig";
import { Instrument, EnvelopeSettings, DrumsetEnvelopeSettings } from "../synth/synth";
import { ColorConfig } from "./ColorConfig";
import { SongDocument } from "./SongDocument";
//import { EnvelopeLineGraph } from "./EnvelopeEditor";
import { Localization as _ } from "./Localization";

const { button, div, h2, canvas } = HTML;

class BasicCustomGridCanvas {
	constructor(public readonly canvas: HTMLCanvasElement, private readonly _doc: SongDocument, private _index: number) {
		this.render();
    }

	private _drawCanvas(graphX: number, graphY: number, graphWidth: number, graphHeight: number): void {
        let instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];
		let instEnv: EnvelopeSettings = instrument.envelopes[this._index];
        let drumEnv: DrumsetEnvelopeSettings = instrument.drumsetEnvelopes[this._index];
		instEnv;
        drumEnv;

		const pointIndexWidth: number = graphWidth / Config.customEnvGridMaxWidth;
		const pointIndexHeight: number = graphHeight / Config.customEnvGridHeight;
		let x: number = graphX;
		let y: number = graphHeight;

		var ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
		ctx.clearRect(0, 0, graphWidth, graphHeight);

		// Draw background.
        ctx.fillRect(0, 0, graphX, graphY);

		ctx.strokeStyle = ColorConfig.getComputed("--ui-widget-background");
		ctx.fillStyle = ColorConfig.getComputed("--playhead");

		// Draw many lines to resemble a grid.
		ctx.beginPath();
		ctx.lineWidth = 2;
		// Start with vertical lines spanning the canvas width.
		ctx.moveTo(x, y);
		for (let i = 0; i < Config.customEnvGridMaxWidth-1; i++) {
			x = x + pointIndexWidth;
			ctx.moveTo(x, y);
			ctx.lineTo(x, 0);
		}
		// Then draw horizontal lines spanning the canvas height.
		x = 0;
		for (let i = 0; i < Config.customEnvGridHeight-1; i++) {
			y = y - pointIndexHeight;
			ctx.moveTo(0, y);
			ctx.lineTo(graphWidth, y);
		}
		ctx.stroke();
		ctx.closePath();
		// Now we'll move down and draw a line seperating the point canvas and the area where the
		// connections buttons go.
		ctx.strokeStyle = ColorConfig.getComputed("--ui-widget-focus");
		ctx.beginPath();
		y = graphHeight;
		ctx.moveTo(0, y);
		ctx.lineTo(graphWidth, y);
		ctx.stroke();
	}

	public render() {
		this._drawCanvas(0, 0, this.canvas.width, this.canvas.height);
	}
}

export class BasicCustomEnvelopePrompt implements Prompt {
    public readonly basicCustomEnvelopeGrid: BasicCustomGridCanvas = new BasicCustomGridCanvas(canvas({ width: 450, height: 200, style: `border: 2px solid ${ColorConfig.uiWidgetFocus}; position: initial; width: 100%; height: 200px;`, id: "BasicCustomGrid" }), this._doc, this.index);
	private readonly _connectionButtonRow: HTMLDivElement = div({style: "display: flex; flex-direction: row; gap: 4px; height: 2.5em; width: 100%; margin-top: -2px; border: 2px solid var(--ui-widget-focus);"});
	private readonly _basicCustomGridRow: HTMLDivElement = div({style: "width: 550px;"}, this.basicCustomEnvelopeGrid.canvas, this._connectionButtonRow);
    //private readonly _envelopePlotter: EnvelopeLineGraph = new EnvelopeLineGraph(canvas({ width: 180, height: 80, style: `border: 2px solid ${ColorConfig.uiWidgetBackground}; width: 155px; height: 68px; margin-left: 15px;`, id: "EnvelopeLineGraph" }), this._doc, this.index, false);
    //private readonly _envelopePlotterRow: HTMLElement = div({style: "margin-top: 22px; margin-bottom: 29px;"}, this._envelopePlotter.canvas);

    private readonly _cancelButton: HTMLButtonElement = button({ class: "cancelButton" });
	private readonly _okayButton: HTMLButtonElement = button({ class: "okayButton", style: "width: 32%; font-size: 15px; margin-bottom: 0;" }, _.confirmLabel);

    public readonly container: HTMLDivElement = div({ class: "prompt noSelection", style: "width: 600px;" },
		h2("Edit Basic Custom Envelope"),
        div({ style: "align-self: center;" },
            this._basicCustomGridRow, //this._envelopePlotterRow
        ),
		div({ style: "display: flex; flex-direction: row-reverse; justify-content: space-between;" },
			this._okayButton,
		),
		this._cancelButton,
    );

    constructor(private _doc: SongDocument, public index: number) {
        for (let i = 0; i < Config.customEnvGridMaxWidth; i++) {
            let connectionButton: HTMLButtonElement = button({style: "border-radius: 0px 0px 0px 0px; height: 100%; flex: 1;", title: "Linear"},
                // Rising line icon:
                SVG.svg({ style: "pointer-events: none; width: 100%; height: 100%;", preserveAspectRatio: "none", viewBox: "0 0 10 10" }, [
                    SVG.path({ d: "M1 10 10 1 9 0 0 9 1 10 z", fill: "currentColor" }),
                ]),
            ); 
            this._connectionButtonRow.appendChild(connectionButton);
        }

        this._okayButton.addEventListener("click", this._saveChanges);
		this._cancelButton.addEventListener("click", this._close);

        this.basicCustomEnvelopeGrid.render();
        //this._envelopePlotter.render();
    }

    private _close = (): void => { 
		this._doc.undo();
	}
		
	public cleanUp = (): void => { 
		this._okayButton.removeEventListener("click", this._saveChanges);
		this._cancelButton.removeEventListener("click", this._close);
	}
		
	private _saveChanges = (): void => {
		this._doc.prompt = null;
	}
}