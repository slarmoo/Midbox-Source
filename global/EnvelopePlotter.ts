import { ColorConfig } from "../editor/ColorConfig";
//import { Config } from "../synth/SynthConfig";
import { events } from "./Events";

export class envelopeLineGraph {
    public functionThing: Function;

    constructor(public readonly canvas: HTMLCanvasElement, readonly scale: number = 1) {
        this.functionThing = function(envelopeGraph: Float32Array) {
            var ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

            ctx.fillStyle = ColorConfig.getComputed("--editor-background");
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = ColorConfig.getComputed("--oscilloscope-line-L") !== "" ? ColorConfig.getComputed("--oscilloscope-line-L") : ColorConfig.getComputed("--primary-text");
            for (let i: number = envelopeGraph.length - 1; i >= envelopeGraph.length - 1 - (canvas.width/scale); i--) {
                let x = i - (envelopeGraph.length - 1) + (canvas.width/scale);
                let yl = (envelopeGraph[i] * (canvas.height/scale / 2) + (canvas.height/scale / 2));

                ctx.fillRect((x - 1)*scale, (yl - 1)*scale, 1*scale, 1.5*scale);
                if (x == 0) break;
            }
        }
        events.listen("updatePlot", this.functionThing);
    }
}