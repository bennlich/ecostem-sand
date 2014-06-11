
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
        this.epinodeEstimate = new EpinodeEstimate();

        this.dataWidth = Math.pow(2, Config.vertFrames);
        this.dataHeight = Math.pow(2, Config.horizFrames);

        this.flatRaster = null;
        this.moundRaster = null;
        this.diffRaster = new DiffRaster(this.dataWidth, this.dataHeight);
    }

    calibrationFlatScan(screenCanvas, callback, errorCallback) {
        var cb = (outputRaster) => {
            this.flatRaster = outputRaster;
            if (typeof callback === 'function') {
                callback();
            }
        };
        this.doScan(screenCanvas, cb, errorCallback);
    }

    calibrationMoundScan(screenCanvas, sx0, sy0, sx1, sy1, callback, errorCallback) {
        var cb = (moundRaster) => {
            this.diffRaster.doDiff(this.flatRaster, moundRaster);
            this.diffRaster.pruneOutliers(2,5);

            var screenWidth = screenCanvas.width,
                screenHeight = screenCanvas.height,
                widthRatio = this.diffRaster.width / screenWidth,
                heightRatio = this.diffRaster.height / screenHeight,
                x0 = Math.floor(sx0 * widthRatio),
                y0 = Math.floor(sy0 * heightRatio),
                x1 = Math.floor(sx1 * widthRatio),
                y1 = Math.floor(sy1 * heightRatio);

            console.log('diff raster box', x0, y0, x1, y1);

            this.epinodeEstimate.estimateEpinodeDirection(this.diffRaster, x0, y0, x1, y1);
            this.epinodeEstimate.writeNormalizedHeightsInto(this.diffRaster);

            this.diffRaster.blur(2);

            var biggerDiff = this.diffRaster.upsample(screenCanvas.width/3, screenCanvas.height/3);
            biggerDiff.paintDiff(screenCanvas);

            if (typeof callback === 'function') {
                callback();
            }
        };

        this.doScan(screenCanvas, cb, errorCallback);
    }

    moundScan(screenCanvas, callback, errorCallback) {
        var cb = (moundRaster) => {
            this.diffRaster.doDiff(this.flatRaster, moundRaster);
            this.diffRaster.pruneOutliers(2,5);
            this.epinodeEstimate.writeNormalizedHeightsInto(this.diffRaster);
            this.diffRaster.blur(2);

            var biggerDiff = this.diffRaster.upsample(screenCanvas.width/3, screenCanvas.height/3);
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
