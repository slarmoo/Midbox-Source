// Copyright (C) 2020 John Nesky, distributed under the MIT license.

import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";
import { Prompt } from "./Prompt";
import { SongDocument } from "./SongDocument";
import { ColorConfig } from "./ColorConfig";
import { ChangeHarmonics } from "./changes";
import { SongEditor } from "./SongEditor";

//namespace beepbox {
const { button, div, h2 } = HTML;

export class HarmonicsPromptCanvas {
	private readonly _doc: SongDocument;
	private _mouseX: number = 0;
	private _mouseY: number = 0;
	private _freqPrev: number = 0;
	private _ampPrev: number = 0;
	private _mouseDown: boolean = false;
	private _change: ChangeHarmonics | null = null;
	private _renderedPath: String = "";
	private _renderedFifths: boolean = true;
	private readonly _editorWidth: number = 768; // 64*12
	private readonly _editorHeight: number = 294; // 49*6
		private readonly _octaves: SVGSVGElement = SVG.svg({"pointer-events": "none"});
		private readonly _fifths: SVGSVGElement = SVG.svg({"pointer-events": "none"});
		private readonly _curve: SVGPathElement = SVG.path({fill: "none", stroke: "currentColor", "stroke-width": 2, "pointer-events": "none"});
	private readonly _lastControlPoints: SVGRectElement[] = [];
		private readonly _lastControlPointContainer: SVGSVGElement = SVG.svg({"pointer-events": "none"});
	private readonly _svg: SVGSVGElement = SVG.svg({ style: "background-color: ${ColorConfig.editorBackground}; touch-action: none; cursor: crosshair;", width: "100%", height: "100%", viewBox: "0 0 " + this._editorWidth + " " + this._editorHeight, preserveAspectRatio: "none" },
		this._octaves,
		this._fifths,
		this._curve,
		this._lastControlPointContainer,
	);

	public readonly container: HTMLElement = HTML.div({class: "harmonics", style: "height: 100%;"}, this._svg);


    
}