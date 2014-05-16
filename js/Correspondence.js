
import {Gradient} from '../st-api/Util/Gradient';
import {Raster} from './Util';
import {StripeScan} from './StripeScan';

/* Computes a projector-camera correspondence and can paint it on a canvas */
export class Correspondence {
    constructor() {
        this.stripeScan = new StripeScan();
        this.dataSize = 128;
        this.flatData = new Raster(this.dataSize, this.dataSize, {x:0, y:0});
        this.moundData = new Raster(this.dataSize, this.dataSize, {x:0, y:0});
        this.diffData = new Raster(this.dataSize, this.dataSize, {x:0, y:0});
    }

    /* Perform a "before" scan */
    flatScan(screenCanvas, callback) {
        this.doScan(screenCanvas, this.flatData.data, callback);
    }

    /* Perform an "after" scan -- after say, the sand has changed, or a new
       object has been introduced into the projected frame. */
    moundScan(screenCanvas, callback) {
        this.doScan(screenCanvas, this.moundData.data, () => {
            this.doDiff();
            this.paintDiff(screenCanvas);
        });
    }

    /* Compute the before/after differences. */
    doDiff() {
        for (var x = 0; x < this.dataSize; ++x) {
            for (var y = 0; y < this.dataSize; ++y) {
                this.diffData.data[x][y].x = this.moundData.data[x][y].x - this.flatData.data[x][y].x;
                this.diffData.data[x][y].y = this.moundData.data[x][y].y - this.flatData.data[x][y].y;
            }
        }
    }

    /* Paint the differences onto a canvas. */
    paintDiff(canvas) {
        var colors = Gradient.gradient('#000', '#fff', 100);
        var ctx = canvas.getContext('2d');

        var patchWidth = canvas.width / this.dataSize;
        var patchHeight = canvas.height / this.dataSize;

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (var x = 0; x < this.dataSize; ++x) {
            for (var y = 0; y < this.dataSize; ++y) {
                var patch = this.diffData.data[x][y];
                var idx = Math.abs(patch.x)+Math.abs(patch.y);

                if (idx >= colors.length)
                    idx = colors.length-1;

                ctx.fillStyle = colors[idx];
                ctx.fillRect(
                    x * patchWidth,
                    y * patchHeight,
                    x * patchWidth + patchWidth,
                    y * patchHeight + patchHeight
                );
            }
        }
    }

    /* Invokes a scan. The stripe frames will be painted in screenCanvas,
       and 'raster' will be populated with {x,y} values, where x is the
       camera x for that raster cell, and y is its camera y. */
    doScan(screenCanvas, raster, callback) {
        this.stripeScan.scan(screenCanvas, (canvas) => {
            var ctx = canvas.getContext('2d'),
                pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

            for (var i = 0; i < canvas.width; ++i) {
                for (var j = 0; j < canvas.height; ++j) {
                    var idx = (j * canvas.width + i) * 4;

                    /* If opacity is negative, ignore this pixel. */
                    if (pixels[idx+3]) {
                        /* projector x-value is in the red channel */
                        var x = pixels[idx];
                        /* projector y-value is in the blue channel */
                        var y = pixels[idx+2];
                        /* store the camera pixel (x,y) in the raster cell. This
                           is super dumb right now. There will be many cam pixels
                           with the same projector (x,y). Currently, the last
                           pixel in the iteration wins.

                           TODO: We need to do something much smarter here. */
                        raster[x][y] = {x:i, y:j};
                    }
                }
            }
            if (typeof callback === 'function') {
                callback();
            }
        });
    }
}
