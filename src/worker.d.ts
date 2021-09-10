declare module "*.worker.ts" {
    class WebpackWorker extends Worker {
        constructor();
    }
    export = WebpackWorker;
}

declare module "*.png" {
    const PngFile: string;
    export = PngFile;
}