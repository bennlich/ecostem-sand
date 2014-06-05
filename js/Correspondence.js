
import {Raster} from './Util';
import {DiffRaster} from './DiffRaster';
import {StripeScan} from './StripeScan';

/* Computes a projector-camera correspondence and can paint it on a canvas */
export class Correspondence {
    constructor() {
        this.stripeScan = new StripeScan();

        /* All the data will be 2^vertFrames x 2^horizFrames in size. This is in tight
           inter-dependence with the fact that StripeScan will project vertFrames
           vertical-striped frames and horizFrames horizontal-striped frames. */
        this.vertFrames = 7;
        this.horizFrames = 7;

        this.dataWidth = Math.pow(2, this.vertFrames);
        this.dataHeight = Math.pow(2, this.horizFrames);

        this.flatData = new Raster(this.dataWidth, this.dataHeight, {x:0, y:0});
        this.moundData = new Raster(this.dataWidth, this.dataHeight, {x:0, y:0});
        this.diffData = new DiffRaster(this.dataWidth, this.dataHeight, {x:0, y:0});
    }

    /* Perform a "before" scan */
    flatScan(screenCanvas, callback, errorCallback) {
        this.flatData.reset();
        this.doScan(screenCanvas, this.flatData.data, callback, errorCallback);
    }

    lineIntersection(p1,p2,p3,p4) {
        var d12x = p1.x - p2.x,
            d34x = p3.x - p4.x,
            d12y = p1.y - p2.y,
            d34y = p3.y - p4.y,
            a = d12x * d34y - d12y * d34x,
            b = p1.x * p2.y - p1.y * p2.x,
            c = p3.x * p4.y - p3.y * p4.x;

        var rx = (d34x * b - d12x * c) / a,
            ry = (d34y * b - d12y * c) / a;

        if (isNaN(rx) || isNaN(ry)) {
            console.log('nan', p1, p2, p3, p4);
        }

        return {
            x : Math.floor(rx),
            y : Math.floor(ry)
        };
    }

    paintLines(canvas) {
        canvas.width = 5000;
        canvas.height = 4000;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, 5000, 4000);
        ctx.strokeStyle = 'rgba(255,127,0,0.5)';
        ctx.lineWidth=1;
        for (var i = 0; i < this.dataWidth; ++i) {
            for (var j = 0; j < this.dataHeight; ++j) {
                var flat = this.flatData.data[i][j];
                var mound = this.moundData.data[i][j];
                if (Math.abs(mound.x-flat.x) + Math.abs(mound.y-flat.y) < 6) {
                    continue;
                }
                if (flat.x === 0 && flat.y === 0)
                    continue;
                if (mound.x === 0 && mound.y === 0)
                    continue;
                ctx.fillStyle='blue';
                ctx.fillRect(2000 + 2*flat.x-1, 2000 + 2*flat.y-1, 2, 2);
                ctx.fillStyle='red';
                ctx.fillRect(2000 + 2*mound.x-1, 2000 + 2*mound.y-1, 2, 2);
                ctx.beginPath();
                ctx.moveTo(2000 + 2*flat.x, 2000 + 2*flat.y);
                ctx.lineTo(2000 + 2*mound.x, 2000 + 2*mound.y);
                ctx.stroke();
            }
        }
        var numSegments = 2000;
        var xAvg = 0, yAvg = 0, avgNum = 0;
        ctx.fillStyle = 'yellow';
        while (numSegments > 0) {
            var x1 = Math.floor(Math.random() * this.dataWidth);
            var y1 = Math.floor(Math.random() * this.dataHeight);
            var x2 = Math.floor(Math.random() * this.dataWidth);
            var y2 = Math.floor(Math.random() * this.dataHeight);

            if (Math.abs(x2-x1) + Math.abs(y2-y1) < 6) {
                continue;
            }

            numSegments--;

            var flat1 = this.flatData.data[x1][y1];
            var mound1 = this.moundData.data[x1][y1];
            var flat2 = this.flatData.data[x2][y2];
            var mound2 = this.moundData.data[x2][y2];

            var intersect = this.lineIntersection(flat1, mound1, flat2, mound2);
            if (isFinite(intersect.x) && isFinite(intersect.y)) {
                xAvg += intersect.x;
                yAvg += intersect.y;
                avgNum++;
            }

            ctx.fillRect(2000 + 2*intersect.x-1, 2000 + 2*intersect.y-1, 2, 2);
        }
        console.log(xAvg, yAvg);
        var avgX = Math.floor(xAvg/avgNum);
        var avgY = Math.floor(yAvg/avgNum);
        ctx.fillRect(2000 + 2*avgX, 2000 + 2*avgY, 10, 10);
        console.log(avgX, avgY);
    }

    /* Perform an "after" scan -- after say, the sand has changed, or a new
       object has been introduced into the projected frame. */
    moundScan(screenCanvas, callback, errorCallback) {
        this.moundData.reset();
        this.doScan(screenCanvas, this.moundData.data, () => {
            /* Just paint and show the canvas for now.
               TODO: invoke callback instead. */
            this.diffData.doDiff(this.flatData, this.moundData);
            console.log('done diff');
            this.diffData.removeOutlierCells();
            console.log('done outlier');
            //if (typeof callback === 'function') {
            //    callback(this.diffData);
            //}
            //return;

            //this.diffData.paintDiff(screenCanvas);
            this.paintLines(screenCanvas);
            console.log('done painting');

            var patchWidth = screenCanvas.width / this.dataWidth;
            var patchHeight = screenCanvas.height / this.dataHeight;

            /* This is a temporary poor-man "patch inspector"
               Lets you click on a diff patch/cell and see its corresponding data
               in the console.
               TODO: disable this eventually. */
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
                        if (!raster[x][y].list)
                            raster[x][y].list = [];

                        raster[x][y].list.push({x:i, y:j});
                    }
                }
            }

            for (var i = 0; i < this.dataWidth; ++i) {
                for (var j = 0; j < this.dataHeight; ++j) {
                    var r = raster[i][j];
                    if (!r.list)
                        continue;
                    r.x = r.list[0].x;
                    r.y = r.list[0].y;
                    /*
                    r.list.sort((p1,p2) => Math.abs(p1.x - p2.x));
                    r.x = r.list[Math.floor(r.list.length/2)].x;
                    r.list.sort((p1,p2) => Math.abs(p1.y - p2.y));
                    r.y = r.list[Math.floor(r.list.length/2)].y;
                    */
                    delete r.list;
                }
            }

            if (typeof callback === 'function') {
                callback();
            }
        };
        this.stripeScan.scan(this.vertFrames, this.horizFrames, screenCanvas, scanCallback, errorCallback);
    }
}
