
import {Gradient} from '../st-api/Util/Gradient';
import {Raster} from './Util';
import {StripeScan} from './StripeScan';

/* Computes a projector-camera correspondence and can paint it on a canvas */
export class Correspondence {
    constructor() {
        this.stripeScan = new StripeScan();
        /* All the data will be 128x128 in size. This is in tight inter-dependence
           with the fact that StripeScan will project 7 frames (meaning 128 stripes)
           on the last frame.

           TODO: The dependency between raster size and the number of frames
           projected by StripeScan needs to be made explicit. */
        this.numFrames = 7;
        this.dataSize = Math.pow(2, this.numFrames);
        this.flatData = new Raster(this.dataSize, this.dataSize, {x:0, y:0});
        this.moundData = new Raster(this.dataSize, this.dataSize, {x:0, y:0});
        this.diffData = new Raster(this.dataSize, this.dataSize, {x:0, y:0});
    }

    /* Perform a "before" scan */
    flatScan(screenCanvas, callback, errorCallback) {
        this.doScan(screenCanvas, this.flatData.data, callback, errorCallback);
    }

    /* Perform an "after" scan -- after say, the sand has changed, or a new
       object has been introduced into the projected frame. */
    moundScan(screenCanvas, callback, errorCallback) {
        this.doScan(screenCanvas, this.moundData.data, () => {

            /* Just paint and show the canvas for now.
               TODO: invoke callback instead. */
            this.doDiff();
            this.removeOutlierCells();
            this.paintDiff(screenCanvas);

            var patchWidth = screenCanvas.width / this.dataSize;
            var patchHeight = screenCanvas.height / this.dataSize;

            // TODO: temporary poor-man "patch inspector"
            $(screenCanvas).on('click', (e) => {
                var x = Math.floor(e.clientX / patchWidth);
                var y = Math.floor(e.clientY / patchHeight);
                console.log('flat', this.flatData.data[x][y].x, this.flatData.data[x][y].y);
                console.log('mound', this.moundData.data[x][y].x, this.moundData.data[x][y].y);
                console.log('diff', this.diffData.data[x][y].x, this.diffData.data[x][y].y);
            });
            //callback();
        },
        errorCallback);
    }

    /* Compute the before/after differences. Subtracts flatData from moundData
       pointwise and stores the results in this.diffData */
    doDiff() {
        for (var x = 0; x < this.dataSize; ++x) {
            for (var y = 0; y < this.dataSize; ++y) {
                var moundData = this.moundData.data[x][y],
                    flatData = this.flatData.data[x][y],
                    diffData = this.diffData.data[x][y];

                /* straightforward pointwise diff */
                var diffX = moundData.x - flatData.x;
                var diffY = moundData.y - flatData.y;

                /* if we recorded no moundData pixels (x == 0 and y == 0 is
                   taken to mean "no mound data", set the diff to 0. This avoids
                   strange high values of diff data in the shadows of objects, for example.

                   TODO: use another marker (instead of x=0,y=0) to represent
                   "no mound data" */
                if (moundData.x === 0 && moundData.y === 0) {
                    diffX = 0;
                    diffY = 0;
                }

                diffData.x = diffX;
                diffData.y = diffY;
            }
        }
    }

    /* Finds cells that are surrounded mostly by cells with significantly
       different values. These are bound to be errors. It's highly that
       a single cell would record a huge difference with no change in the
       cells around it. This would be the equivalent of a pin,
       or a very thin object, gaining height in the scene. */
    removeOutlierCells() {
        for (var x = 0; x < this.dataSize; ++x) {
            for (var y = 0; y < this.dataSize; ++y) {
                var diffData = this.diffData.data[x][y],
                    neighbors = this.diffData.neighbors(x,y),
                    sumX = 0, sumY = 0, n = 0,
                    diffWeight = Math.abs(diffData.x) + Math.abs(diffData.y);

                _.each(neighbors, (neighbor) => {
                    /* TODO: I'm not sure why neighbor.x and neighbor.y
                       can show up NaN here. */
                    var nx = neighbor.x || 0;
                    var ny = neighbor.y || 0;

                    /* We define "value" or "weight" of a cell by its
                       absolute diff sum. We only care about the amplitude
                       of its displacement, not the direction. */
                    var neighborWeight = Math.abs(nx) + Math.abs(ny);

                    /* We define "significantly different" as being 1.5 times bigger in amplitude/weight. */
                    if (neighborWeight > (1.5 * diffWeight) || neighborWeight < (1/1.5 * diffWeight)) {
                        sumX += nx;
                        sumY += ny;
                        n++;
                    }
                });

                /* If more than 3/4 of the neighbors are significantly different, we set this cell
                   to the average of the neighbors' values. */
                if (n > neighbors.length * 3/4) {
                    diffData.x = Math.floor(sumX/n);
                    diffData.y = Math.floor(sumY/n);
                }
            }
        }
    }

    /* Paint the differences onto a canvas. */
    paintDiff(canvas) {
        var colors = Gradient.gradient('#3d5a99', '#b03333', 100);
        var ctx = canvas.getContext('2d');

        var patchWidth = canvas.width / this.dataSize;
        var patchHeight = canvas.height / this.dataSize;

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (var x = 0; x < this.dataSize; ++x) {
            for (var y = 0; y < this.dataSize; ++y) {
                var patch = this.diffData.data[x][y];

                /* For now we just add together the x- and y-differences */
                var idx = Math.abs(patch.x)+Math.abs(patch.y);

                if (idx >= colors.length)
                    idx = colors.length-1;

                ctx.fillStyle = colors[idx];
                ctx.fillRect(
                    x * patchWidth,
                    y * patchHeight,
                    patchWidth + 1,
                    patchHeight + 1
                );
            }
        }
    }

    /* Invokes a scan. The stripe frames will be painted in screenCanvas,
       and 'raster' will be populated with {x,y} values, where x is the
       camera x for that raster cell, and y is its camera y. */
    doScan(screenCanvas, raster, callback, errorCallback) {
        var scanCallback = (outputRaster) => {
            var canvas = document.createElement('canvas');
            outputRaster.renderInCanvas(canvas);

            var sctx = screenCanvas.getContext('2d');
            sctx.drawImage(canvas, 0, 0);

            for (var i = 0; i < outputRaster.width; ++i) {
                for (var j = 0; j < outputRaster.height; ++j) {
                    var pixel = outputRaster.data[i][j];

                    /* If opacity is negative, ignore this pixel. */
                    if (pixel.enabled) {
                        /* projector x-value is in the red channel */
                        var x = pixel.x;
                        /* projector y-value is in the blue channel */
                        var y = pixel.y;
                        /* Store the camera pixel (x,y) in the raster cell. This
                           is super dumb right now. There will be many cam pixels
                           with the same projector (x,y). Currently, the last
                           pixel in the iteration wins.

                           TODO: We should do something much smarter here. */
                        raster[x][y] = {x:i, y:j};
                    }
                }
            }

            if (typeof callback === 'function') {
                callback();
            }
        };
        this.stripeScan.scan(this.numFrames, screenCanvas, scanCallback, errorCallback);
    }
}
