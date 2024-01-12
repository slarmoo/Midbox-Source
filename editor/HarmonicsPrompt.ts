// Copyright (C) 2020 John Nesky, distributed under the MIT license.

/*import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";
import { HarmonicsEditor } from "./HarmonicsEditor";
import { Prompt } from "./Prompt";
import { SongDocument } from "./SongDocument";

//namespace beepbox {
//const {} = HTML;

export class HarmonicsPromptCanvas {
	private readonly _doc: SongDocument;
	private readonly _editorWidth: number = 768; // 64*12
	private readonly _editorHeight: number = 294; // 49*6
	private readonly _octaves: SVGSVGElement = SVG.svg({"pointer-events": "none"});
	private readonly _fifths: SVGSVGElement = SVG.svg({"pointer-events": "none"});
	private readonly _curve: SVGPathElement = SVG.path({fill: "none", stroke: "currentColor", "stroke-width": 2, "pointer-events": "none"});
	//private readonly _lastControlPoints: SVGRectElement[] = [];
	private readonly _lastControlPointContainer: SVGSVGElement = SVG.svg({"pointer-events": "none"});
	private readonly _svg: SVGSVGElement = SVG.svg({ style: "background-color: ${ColorConfig.editorBackground}; touch-action: none; cursor: crosshair;", width: "100%", height: "100%", viewBox: "0 0 " + this._editorWidth + " " + this._editorHeight, preserveAspectRatio: "none" },
		this._octaves,
		this._fifths,
		this._curve,
		this._lastControlPointContainer,
	);

	public readonly container: HTMLElement = HTML.div({class: "harmonics", style: "height: 100%;"}, this._svg);
}

export class HarmonicsPrompt {

	public harmonicsCanvas: HarmonicsPromptCanvas = new HarmonicsPromptCanvas(this._doc, this._songEditor._wavetableIndex);
}*/
// No clue what to do here. Too confusing to me.