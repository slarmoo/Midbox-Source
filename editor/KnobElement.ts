//import {Change} from "./Change";
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
    private value: number;
    private sensitivity: number;
    private uiWidgetColor;
    private uiFocusedColor;
    private mainColor;
    private baseComponent: SVGPathElement;
    private tickComponent: SVGPathElement;
    private barComponent: SVGPathElement;
    private filledBarComponent: SVGPathElement;
    private extraTickComponents: SVGPathElement[];
    private extraTickGroup: SVGGElement;
    private componentGroup: SVGElement;

    // For finding the coordinates of the mouse in regards to where it's at within the container.
    private mouseDown: boolean; // detecting if the mouse is down
    private clickX: number; // the initial position of the click
    private mouseX: number; // the moving location of the click

    constructor(public knobMinValue: number, public knobMaxValue: number, public knobValue: number, public knobStepSize: number, public extraTicks: number[], public knobSize: number, private readonly _doc: SongDocument, /*private _getChange: (oldValue: string, newValue: string) => Change*/) {
        /* Variable explanation:
        knobMinValue and knobMaxValue are for the minimum and maximum value parameters that the knob can hold.
        knobValue represents the main value of the knob being fed into its setting.
        knobStepSize is the size of value incrementation when scrolling through them on the knob.
        extraTicks places smaller markers on the knob to mark certain value's positions if needed. An empty array means no markers.
        knobSize is an extra variable for changing the scale of the knob if needed.
        */
        this.value = this.knobValue;
        this.sensitivity = 0.15; // TODO: Adjust based on amount of values available on the knob.
        this.uiWidgetColor = ColorConfig.getComputed("--ui-widget-background");
        this.uiFocusedColor = ColorConfig.getComputed("--ui-widget-focus");
        this.mainColor = ColorConfig.getComputedChannelColor(this._doc.song, this._doc.channel).primaryNote;

        // Draw components once.
        this.baseComponent = path({
            stroke: this.uiWidgetColor, 
            fill: this.uiWidgetColor, 
            d: `
                M 13,88 
                A 1 1 0 0 0 113,38 
                A 1 1 0 0 0 13,88
        `});
        this.tickComponent = path({
            "transform-origin": "63 62.9",
            stroke: this.mainColor, 
            fill: this.mainColor, 
            d: `
                M 11.5,65.76 
                L 57.18,65.76 
                A 1.44 1.44 90 0 0 68.7,60 
                L 68.7,65.76 
                A 1.44 1.44 90 0 0 57.18,60 
                L 11.5,60 
                A 1.44 1.44 90 0 0 11.5,65.76
        `});
        this.barComponent = path({
            style: "stroke-width: 4px;",
            stroke: this.uiWidgetColor,
            fill: "none", 
            d: makeArcPath(1, 63, 63, 61),
        });
        this.filledBarComponent = path({
            style: "stroke-width: 4px;",
            stroke: this.mainColor,
            fill: "none", 
            d: makeArcPath(remap(this.knobValue, this.knobMinValue, this.knobMaxValue, 0, 1), 63, 63, 61),
        });
        this.extraTickComponents = [];
        this.extraTickGroup = g();
        for (let i = 0; i < this.extraTicks.length; i++) {
            this.extraTickComponents[i] = path({
                "transform-origin": "63 62.5",
                stroke: this.uiFocusedColor,
                fill: this.uiFocusedColor,
                d: `
                M 21,64 
                L 63,64 
                L 63,61 
                L 21,61 
                Q 13,62.5 21,64
            `});
            this.extraTickComponents[i].setAttribute("transform", `rotate(${remap(this.extraTicks[i], this.knobMinValue, this.knobMaxValue, 0, 360)})`);
            this.extraTickGroup.appendChild(this.extraTickComponents[i]);
        }
        // Compile all components into the main knob visual.
        this.componentGroup = svg({tabindex: "0", style: `transform: scale(${this.knobSize / 4}); outline: none; width: 126px; height: 126px; margin-left: calc(126px / 3 * 2);`}, this.baseComponent, this.extraTickGroup, this.tickComponent, this.barComponent, this.filledBarComponent);

        this.mouseDown = false;
        this.clickX = 0;
        this.mouseX = 0;

        // I think this is mostly irrelevant to the knob.
        this.container = div(div({style: "width: 300px; height: 250px; align-content: center;"}, this.componentGroup));

        this.componentGroup.addEventListener("pointerdown", this);
        this.componentGroup.addEventListener("pointerup", this);
        this.componentGroup.addEventListener("pointermove", this);
        this.componentGroup.addEventListener("wheel", this);
        this.componentGroup.addEventListener("blur", this);

        this.render(this.knobValue);
    }

    // Where events are handled in the knob.
    handleEvent(event: Event): void {
        switch (event.type) {
            case "pointerdown": {
                // Detected click, regester clickX and render the knob focused.
                const pointerEvent: PointerEvent = event as PointerEvent;
                this.componentGroup.setPointerCapture(pointerEvent.pointerId);
                this.mouseDown = true;
                const bounds: DOMRect = this.componentGroup.getBoundingClientRect();
                this.clickX = pointerEvent.clientX - bounds.left;

                this.render(this.knobValue);
            } break;
            case "pointerup": {
                // Drag click has ended, set knobValue to temporary value.
                const pointerEvent: PointerEvent = event as PointerEvent;
                this.componentGroup.releasePointerCapture(pointerEvent.pointerId)
                this.mouseDown = false;

                this.knobValue = this.value;
                this.value = this.knobValue;

                this.render(this.knobValue);
            } break;
            case "pointermove": {
                // Pointer is moving.
                const pointerEvent: PointerEvent = event as PointerEvent;
                const bounds: DOMRect = this.componentGroup.getBoundingClientRect();
                this.mouseX = pointerEvent.clientX - bounds.left;
                const xDifference: number = this.mouseX - this.clickX;

                // Only change the knob if being drag clicked.
                if (this.mouseDown) {
                    // Calculate value based on mouse position and clamp.
                    // Floor value into step size when applicable.
                    this.value = (this.knobStepSize != 0) 
                    ? clamp(this.knobMinValue + Math.floor(((this.knobValue - this.knobMinValue) + (xDifference * this.sensitivity)) / this.knobStepSize) * this.knobStepSize, this.knobMinValue, this.knobMaxValue)
                    : clamp(this.knobValue + (xDifference * (this.sensitivity / 5)), this.knobMinValue, this.knobMaxValue);
                    
                    this.render(this.value);
                }
            } break;
            case "wheel": {
                // Mouse scrollwheel support for knobs. 
                const wheelEvent: WheelEvent = event as WheelEvent;
                const wheelDirection: number = -Math.sign(wheelEvent.deltaY);

                // Only detect when focused. Prevents page scrolling from being interrupted by knobs.
                if (this.componentGroup == document.activeElement) {
                    this.knobValue = (this.knobStepSize != 0) 
                    ? clamp(this.knobMinValue + Math.floor(((this.knobValue - this.knobMinValue) + (wheelDirection * this.knobStepSize)) / this.knobStepSize) * this.knobStepSize, this.knobMinValue, this.knobMaxValue)
                    : clamp(this.knobValue + (wheelDirection / 10), this.knobMinValue, this.knobMaxValue);
                }
                    
                this.render(this.knobValue);
            } break;
            case "blur": {
                // One last render to disactivate focus colors.
                this.render(this.knobValue);
            }
        }
    }

    // Redraw elements that need their visuals updated.
    render(value: number): void {
        this.tickComponent.setAttribute("transform", `rotate(${remap(value, this.knobMinValue, this.knobMaxValue, 0, 360)})`);
        this.filledBarComponent.setAttribute("d", 
            makeArcPath(remap(value, this.knobMinValue, this.knobMaxValue, 0, 1), 63, 63, 61)
        );
        if (this.componentGroup == document.activeElement) {
            this.baseComponent.setAttribute("stroke", this.uiFocusedColor);
            this.baseComponent.setAttribute("fill", this.uiFocusedColor);
            for (let i = 0; i < this.extraTicks.length; i++) {
                this.extraTickComponents[i].setAttribute("stroke", this.uiWidgetColor);
                this.extraTickComponents[i].setAttribute("fill", this.uiWidgetColor);
            }
        } else {
            this.baseComponent.setAttribute("stroke", this.uiWidgetColor);
            this.baseComponent.setAttribute("fill", this.uiWidgetColor);
            for (let i = 0; i < this.extraTicks.length; i++) {
                this.extraTickComponents[i].setAttribute("stroke", this.uiFocusedColor);
                this.extraTickComponents[i].setAttribute("fill", this.uiFocusedColor);
            }
        }
    }

    // Clean up; remove event listeners that are not being used.
    cleanUp(): void {
        this.componentGroup.removeEventListener("pointerdown", this);
        this.componentGroup.removeEventListener("pointerup", this);
        this.componentGroup.removeEventListener("pointermove", this);
        this.componentGroup.removeEventListener("wheel", this);
        this.componentGroup.addEventListener("blur", this);
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