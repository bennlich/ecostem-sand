
import {DiffRaster} from './DiffRaster';
import {StripeScan} from './StripeScan';
import {Config} from './Config';
import {EpinodeEstimate} from './EpinodeEstimate';
import {Viz} from './Viz';

/* Computes a projector-camera correspondence and can paint it on a canvas */
export class Correspondence {
    constructor() {
        window.correspondence = this;

        this.stripeScan = new StripeScan();

        this.dataWidth = Math.pow(2, Config.vertFrames);
        this.dataHeight = Math.pow(2, Config.horizFrames);

        this.diffData = new DiffRaster(this.dataWidth, this.dataHeight);
    }

    flatScan(screenCanvas, callback, errorCallback) {
        var cb = (outputRaster) => {
            this.flatRaster = outputRaster;
            if (typeof callback === 'function') {
                callback();
            }
        };
        this.doScan(screenCanvas, cb, errorCallback);
    }

    moundScan(screenCanvas, callback, errorCallback) {
        var cb = (outputRaster) => {
            this.moundRaster = outputRaster;
            this.diffData.doDiff(this.flatRaster, this.moundRaster);

            this.diffData.pruneOutliers(2,5);

            var est = new EpinodeEstimate(this.diffData);
            est.estimateEpinodeDirection(this.diffData, 31, 64, 40, 71);
            est.writeNormalizedHeightsInto(this.diffData);

            this.diffData.blur(2);

//            this.diffData.paintDiff(screenCanvas);

            var biggerDiff = this.diffData.upsample(screenCanvas.width/3, screenCanvas.height/3);
            biggerDiff.paintDiff(screenCanvas);
        };
        this.doScan(screenCanvas, cb, errorCallback);
    }

    doScan(screenCanvas, callback, errorCallback) {
        var cb = (outputRaster) => {
            var canvas = document.createElement('canvas');
            outputRaster.renderInCanvas(canvas);

            var sctx = screenCanvas.getContext('2d');
            sctx.drawImage(canvas, 0, 0);

            if (typeof callback === 'function')
                callback(outputRaster);
        };
        this.stripeScan.scan(screenCanvas, cb, errorCallback);
    }
}
