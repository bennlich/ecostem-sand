
import {Evented} from "./Evented";

export class Animator extends Evented {
    constructor(modelSet) {
        super();
        this.modelPool = modelSet;
        this.reset();
    }

    start() {
        this.isRunning = true;
        this._run();
    }

    stop() {
        this.isRunning = false;
        if (this._raf) {
            window.cancelAnimationFrame(this._raf);
        }
    }

    reset() {
        if (this.isRunning)
            this.stop();

        var models = this.modelPool.getModels();

        for (var i = 0; i < models.length; ++i) {
            models[i].dataModel.reset();
        }

        this.hours = 0;
        this.minutes = 0;
        this._raf = null;
        this.isRunning = false;
    }

    step() {
        var models = this.modelPool.getModels();

        for (var i = 0; i < models.length; ++i) {
            var model = models[i].dataModel;

            if (! model.isAnimated)
                continue;

            if (this.minutes % model.timeStep === 0)
                model.step();
        }

        this.minutes++;

        if (this.minutes === 59) {
            this.minutes = 0;
            this.hours++;
        }

        this.fire('step');
    }

    _run() {
        if (this.isRunning) {
            this._raf = window.requestAnimationFrame(() => this._run());
            this.step();
        }
    }
}
