import { BaseMapType } from "src/@types";
import { Shape } from "./shape";

export class DrawingController {
    getSelectedVertex() {
        const vertexes = Object.values(this.shapes)
            .flat()
            .map((shape) => shape.vertexes)
            .flat();
        console.log(...vertexes.map((v) => v.selected));

        return vertexes.find((v) => v.selected);
    }
    removeShape(shape: Shape<L.Path>) {
        this.shapes[shape.type] = this.shapes[shape.type].filter(
            (s) => s != shape
        );
        shape.remove();
    }
    isDrawing: boolean = false;
    isDeleting: boolean = false;
    shape: Shape<L.Path>;
    shapes: Record<string, Shape<L.Path>[]> = {
        rectangle: [],
        polyline: [],
        polygon: []
    };

    get flatShapes() {
        return Object.values(this.shapes).flat();
    }

    get vertexes() {
        return this.flatShapes.map((shape) => shape.vertexes).flat();
    }

    constructor(public map: BaseMapType) {}

    hideVertexes() {
        this.flatShapes.forEach((shape) => shape.hideVertexes());
    }
    showVertexes() {
        this.flatShapes.forEach((shape) => shape.showVertexes());
    }

    newShape(shape?: Shape<L.Path>) {
        const newShape = shape ?? this.shape.newInstance();
        if (this.shape) this.saveShape();
        this.shape = newShape;
        this.startDrawing();
    }
    saveShape() {
        if (this.shape) {
            this.shape.stopDrawing();
            if (this.shape.canSave) {
                this.shapes[this.shape.type].push(this.shape);
                this.shape.registerDeleteEvent();
            }
        }
        this.stopDrawing();
    }
    startDrawing() {
        this.isDrawing = true;
        this.registerDrawing();
    }
    stopDrawing() {
        this.isDrawing = false;
        if (this.shape) {
            this.shape.stopDrawing();
            this.unregisterDrawing();
            this.shape = null;
        }
    }
    private registerDrawing() {
        this.map.registerScope();
        this.map.contentEl.addClass("drawing");
        this.map.leafletInstance.on(
            "mousemove touchmove",
            this.shape.onMousemove,
            this.shape
        );
        this.map.leafletInstance.on("click", this.shape.onClick, this.shape);
    }
    private unregisterDrawing() {
        this.map.unregisterScope();
        this.map.contentEl.removeClass("drawing");
        this.map.leafletInstance.off(
            "mousemove touchmove",
            this.shape.onMousemove,
            this.shape
        );
        this.map.leafletInstance.off("click", this.shape.onClick, this.shape);
    }
}
