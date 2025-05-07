import {Change} from "./Change";
import {ColorConfig} from "./ColorConfig";
import {HTML, SVG} from "imperative-html/dist/esm/elements-strict";
import {SongDocument} from "./SongDocument";
import {clamp, remap} from "./UsefulCodingStuff";

const {div} = HTML;
const {path, g, svg} = SVG;

export class Knob {
    // The container is a div element encompassing an area.
    public container: HTMLDivElement;

    // Other variables.
    private _change: Change | null = null;
    private _oldValue: number; // For changes.
    private _dragValue: number; // Starting value when dragging.
    public value: number; // Decoy value that the variable above exchanges value with.
    private _sensitivity: number;
    private _baseComponent: SVGPathElement;
    private _tickComponent: SVGPathElement;
    private _barComponent: SVGPathElement;
    private _filledBarComponent: SVGPathElement;
    private _extraTickComponents: SVGPathElement[];
    private _extraTickGroup: SVGGElement;
    private _componentGroup: SVGElement;

    // For finding the coordinates of the mouse in regards to where it's at within the container.
    private _mouseDown: boolean; // detecting if the mouse is down
    private _clickX: number; // the initial position of the click
    private _mouseX: number; // the moving location of the click

    constructor(public knobMinValue: number, public knobMaxValue: number, public knobStepSize: number, public extraTicks: number[], public knobSize: number, private readonly _doc: SongDocument, private _getChange: ((oldValue: number, newValue: number) => Change) | null) {
        /* Variable explanation:
        knobMinValue and knobMaxValue are for the minimum and maximum value parameters that the knob can hold.
        knobStepSize is the size of value incrementation when scrolling through them on the knob.
        extraTicks places smaller markers on the knob to mark certain value's positions if needed. An empty array means no markers.
        knobSize is an extra variable for changing the scale of the knob if needed.
        */
        this._dragValue = 0;
        this.value = 0;
        this._sensitivity = ((this.knobMaxValue - this.knobMinValue + this.knobStepSize) / this.knobStepSize * 0.2) / 80;
        // Draw components once.
        this._baseComponent = path({
            stroke: ColorConfig.getComputed("--ui-widget-background"), 
            fill: ColorConfig.getComputed("--ui-widget-background"), 
            d: `
                M 13,88 
                A 1 1 0 0 0 113,38 
                A 1 1 0 0 0 13,88
        `});
        this._tickComponent = path({
            "transform-origin": "63 62.9",
            stroke: "currentColor", 
            fill: "currentColor", 
            d: `
                M 17.5,65.76 
                L 43,65.76 
                A 1 1 0 0 0 43,60 
                L 17.5,60 
                A 1.44 1.44 90 0 0 17.5,65.76
        `});
        this._barComponent = path({
            style: "stroke-width: 4px;",
            stroke: ColorConfig.getComputed("--ui-widget-background"),
            fill: "none", 
            d: makeArcPath(1, 63, 63, 61),
        });
        this._filledBarComponent = path({
            style: "stroke-width: 4px;",
            stroke: "currentColor",
            fill: "none", 
            d: makeArcPath(remap(this._dragValue, this.knobMinValue, this.knobMaxValue, 0, 1), 63, 63, 61),
        });
        this._extraTickComponents = [];
        this._extraTickGroup = g();
        for (let i = 0; i < this.extraTicks.length; i++) {
            this._extraTickComponents[i] = path({
                "transform-origin": "63 62.5",
                stroke: ColorConfig.getComputed("--ui-widget-focus"),
                fill: ColorConfig.getComputed("--ui-widget-focus"),
                d: `
                M 10.5,64 
                L 42,64 
                L 42,61 
                L 10.5,61 
                Q 6.8,62.5 10.5,64
            `});
            this._extraTickComponents[i].setAttribute("transform", `rotate(${remap(this.extraTicks[i], this.knobMinValue, this.knobMaxValue, 0, 360)})`);
            this._extraTickGroup.appendChild(this._extraTickComponents[i]);
        }
        // Compile all components into the main knob visual.
        this._componentGroup = svg({
            tabindex: "0",
            style: `outline: none; width: 30px; height: 30px; cursor: ew-resize; pointer-events: auto;`,
            viewBox: "0 0 126 126",
        },
            this._baseComponent,
            this._extraTickGroup,
            this._tickComponent,
            this._barComponent,
            this._filledBarComponent
        );

        this._mouseDown = false;
        this._clickX = 0;
        this._mouseX = 0;

        this.container = div(div({style: "width: 30px; height: 30px; align-content: center;"}, this._componentGroup));

        this._componentGroup.addEventListener("mousedown", this);
        document.addEventListener("mousemove", this);
        document.addEventListener("mouseup", this);
        this._componentGroup.addEventListener("touchstart", this);
        document.addEventListener("touchmove", this);
        document.addEventListener("touchend", this);
        this._componentGroup.addEventListener("wheel", this);
        this._componentGroup.addEventListener("blur", this);

        this.render(this._dragValue);
    }

    // Where events are handled in the knob.
    handleEvent(event: Event): void {
        switch (event.type) {
            case "mousedown": {
                // Detected click, regester clickX and render the knob focused.
                event.preventDefault();
                event.stopPropagation();
                this._componentGroup.focus();
                const mouseEvent: MouseEvent = event as MouseEvent;
                this._mouseDown = true;
                const bounds: DOMRect = this._componentGroup.getBoundingClientRect();
                this._clickX = mouseEvent.clientX - bounds.left;

                const continuingProspectiveChange: boolean = this._doc.lastChangeWas(this._change)
                if (!continuingProspectiveChange) this._oldValue = this.value;
		        if (this._getChange != null) {
			        this._change = this._getChange(this._oldValue, this.value);
			        this._doc.setProspectiveChange(this._change);
		        }

                this.render(this._dragValue);
            } break;
            case "mousemove": {
                // Mouse is moving.
		        if (this.container.offsetParent == null) return;
                const mouseEvent: MouseEvent = event as MouseEvent;
                const bounds: DOMRect = this._componentGroup.getBoundingClientRect();
                this._mouseX = mouseEvent.clientX - bounds.left;
                const xDifference: number = this._mouseX - this._clickX;

                // Only change the knob if being drag clicked.
                if (this._mouseDown) {
                    const continuingProspectiveChange: boolean = this._doc.lastChangeWas(this._change);
                    // Calculate value based on mouse position and clamp.
                    this.value = clamp(this.knobMinValue, this.knobMaxValue+1, this.knobMinValue + Math.floor(((this._dragValue - this.knobMinValue) + (xDifference * this._sensitivity)) / this.knobStepSize) * this.knobStepSize);
                    if (!continuingProspectiveChange) this._oldValue = this.value;
		            if (this._getChange != null) {
			            this._change = this._getChange(this._oldValue, this.value);
			            this._doc.setProspectiveChange(this._change);
		            }

                    this.render(this.value);
                }
            } break;
            case "mouseup": {
                // Drag click has ended, set knobValue to temporary value.
                if (this._mouseDown) {
                    if (this.container.offsetParent == null) return;
                    event.preventDefault();
                    event.stopPropagation();

                    this._dragValue = this.value;
                    this.value = this._dragValue;
                    if (this._getChange != null) {
                        this._doc.record(this._change!);
                        this._change = null;
                    }

                    this.render(this._dragValue);
                }
                this._mouseDown = false;
            } break;
            case "touchstart": {
                // Detected the start of a drag, regester clickX and render the knob focused.
                event.preventDefault();
                event.stopPropagation();
                this._componentGroup.focus();
                const touchEvent: TouchEvent = event as TouchEvent;
                this._mouseDown = true;
                const bounds: DOMRect = this._componentGroup.getBoundingClientRect();
                this._clickX = touchEvent.touches[0].clientX - bounds.left;

                const continuingProspectiveChange: boolean = this._doc.lastChangeWas(this._change)
                if (!continuingProspectiveChange) this._oldValue = this.value;
		        if (this._getChange != null) {
			        this._change = this._getChange(this._oldValue, this.value);
			        this._doc.setProspectiveChange(this._change);
		        }

                this.render(this._dragValue);
            } break;
            case "touchmove": {
                // Finger is moving.
		        if (this.container.offsetParent == null) return;
                const touchEvent: TouchEvent = event as TouchEvent;
                const bounds: DOMRect = this._componentGroup.getBoundingClientRect();
                this._mouseX = touchEvent.touches[0].clientX - bounds.left;
                const xDifference: number = this._mouseX - this._clickX;

                // Only change the knob if being drag clicked.
                if (this._mouseDown) {
                    const continuingProspectiveChange: boolean = this._doc.lastChangeWas(this._change);
                    // Calculate value based on mouse position and clamp.
                    this.value = clamp(this.knobMinValue, this.knobMaxValue+1, this.knobMinValue + Math.floor(((this._dragValue - this.knobMinValue) + (xDifference * this._sensitivity)) / this.knobStepSize) * this.knobStepSize);
                    if (!continuingProspectiveChange) this._oldValue = this.value;
		            if (this._getChange != null) {
			            this._change = this._getChange(this._oldValue, this.value);
			            this._doc.setProspectiveChange(this._change);
		            }

                    this.render(this.value);
                }
            } break;
            case "touchend": {
                // Drag tap has ended, set knobValue to temporary value.
                if (this._mouseDown) {
                    if (this.container.offsetParent == null) return;
                    event.preventDefault();
                    event.stopPropagation();

                    this._dragValue = this.value;
                    this.value = this._dragValue;
                    if (this._getChange != null) {
                        this._doc.record(this._change!);
                        this._change = null;
                    }

                    this.render(this._dragValue);
                }
                this._mouseDown = false;
            } break;
            case "wheel": {
                // Mouse scrollwheel support for knobs. 
                const wheelEvent: WheelEvent = event as WheelEvent;
                const wheelDirection: number = -Math.sign(wheelEvent.deltaY);

                // Only detect when focused. Prevents page scrolling from being interrupted by knobs.
                if (this._componentGroup == document.activeElement) {
                    event.preventDefault();
                    event.stopPropagation();
                    this.value = clamp(this.knobMinValue, this.knobMaxValue+1, this.knobMinValue + Math.floor(((this._dragValue - this.knobMinValue) + (wheelDirection * this.knobStepSize)) / this.knobStepSize) * this.knobStepSize);
		            if (this._getChange != null) {
			            this._change = this._getChange(this._oldValue, this.value);
                        this._doc.record(this._change);
                        this._doc.notifier.notifyWatchers();
		            }

                    this._dragValue = this.value;
                    this.value = this._dragValue;
                    
                    this.render(this.value);
                }
            } break;
            case "blur": {
                // One last render to disactivate focus colors.
                this.render(this._dragValue);
            } break;
        }
    }

    // For updating the knob when its setting is changed elsewhere.
    public updateValue(value: number): void {
        // To prevent sliding, do not proceed with this function if the knob itself is being used.
        if (this._mouseDown) return;
        this.value = value;
		this._dragValue = value;
        this.render(this._dragValue);
	}

    // For modulator recording.
    public getValueBeforeProspectiveChange(): number {
		return this._oldValue;
	}

    // Redraw elements that need their visuals updated.
    render(value: number): void {
        this._tickComponent.setAttribute("transform", `rotate(${remap(value, this.knobMinValue, this.knobMaxValue, 0, 360)})`);
        this._barComponent.setAttribute("stroke", ColorConfig.getComputed("--ui-widget-background")); // Mainly for swapping themes.
        this._filledBarComponent.setAttribute("d", 
            makeArcPath(remap(value, this.knobMinValue, this.knobMaxValue, 0, 1), 63, 63, 61)
        );
        if (this._componentGroup == document.activeElement) {
            this._baseComponent.setAttribute("stroke", ColorConfig.getComputed("--ui-widget-focus"));
            this._baseComponent.setAttribute("fill", ColorConfig.getComputed("--ui-widget-focus"));
            for (let i = 0; i < this.extraTicks.length; i++) {
                this._extraTickComponents[i].setAttribute("stroke", ColorConfig.getComputed("--ui-widget-background"));
                this._extraTickComponents[i].setAttribute("fill", ColorConfig.getComputed("--ui-widget-background"));
            }
        } else {
            this._baseComponent.setAttribute("stroke", ColorConfig.getComputed("--ui-widget-background"));
            this._baseComponent.setAttribute("fill", ColorConfig.getComputed("--ui-widget-background"));
            for (let i = 0; i < this.extraTicks.length; i++) {
                this._extraTickComponents[i].setAttribute("stroke", ColorConfig.getComputed("--ui-widget-focus"));
                this._extraTickComponents[i].setAttribute("fill", ColorConfig.getComputed("--ui-widget-focus"));
            }
        }
    }

    // Clean up; remove event listeners that are not being used.
    cleanUp(): void {
        this._componentGroup.removeEventListener("mousedown", this);
        document.removeEventListener("mousemove", this);
        document.removeEventListener("mouseup", this);
        this._componentGroup.removeEventListener("touchstart", this);
        document.removeEventListener("touchmove", this);
        document.removeEventListener("touchend", this);
        this._componentGroup.removeEventListener("wheel", this);
        this._componentGroup.removeEventListener("blur", this);
    }
}

// Creates an arc path based on percentage, used for the bar.
function makeArcPath(
    percentage: number,
    centerX: number,
    centerY: number,
    radius: number
): string {
    const startAngle: number = (Math.PI * 2.0 * 0.0) % (Math.PI * 2.0);
    const startX: number = centerX + Math.cos(startAngle - Math.PI) * radius;
    const startY: number = centerY + Math.sin(startAngle - Math.PI) * radius;
    let endAngle: number = (Math.PI * 2.0 * percentage) % (Math.PI * 2.0);
    if (percentage > 0 && endAngle === startAngle) endAngle = Math.PI * 1.999999; // Silly.
    const isLargeArc: number = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
    const endX: number = centerX + Math.cos(endAngle - Math.PI) * radius;
    const endY: number = centerY + Math.sin(endAngle - Math.PI) * radius;
    const isClockWise: number = endAngle - startAngle > 0 ? 1 : 0;
    return `M ${startX} ${startY} A ${radius} ${radius} 0 ${isLargeArc} ${isClockWise} ${endX} ${endY}`;
}