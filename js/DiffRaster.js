import {Raster} from './Util';
import {Gradient} from '../st-api/Util/Gradient';

export class DiffRaster extends Raster {
    constructor(width, height, initValue) {
        super(width, height, initValue);
    }

    /* Compute the before/after differences. Subtracts flatData from moundData
       pointwise and stores the results in this.diffData */
    doDiff(flatRaster, moundRaster) {
        this.reset();

        if (this.width !== flatRaster.width || this.width !== moundRaster.width
            || this.height !== flatRaster.height || this.height !== moundRaster.height)
        {
            console.error('Raster dimensions differ.');
            return;
        }

        for (var x = 0; x < this.width; ++x) {
            for (var y = 0; y < this.height; ++y) {
                var moundData = moundRaster.data[x][y],
                    flatData = flatRaster.data[x][y],
                    diffData = this.data[x][y];

                /* straightforward pointwise diff */
                var diffX = moundData.x - flatData.x;
                var diffY = moundData.y - flatData.y;

                /* if we recorded no moundData pixels (x == 0 and y == 0 is
                   taken to mean "no mound data") set the diff to 0. This avoids
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
       different values. These are bound to be errors. It's highly unlikely that
       a single cell would record a huge difference with no change in the
       cells around it. This would be the equivalent of a pin,
       or a very thin object, gaining height in the scene. */
    removeOutlierCells() {
        for (var x = 0; x < this.width; ++x) {
            for (var y = 0; y < this.height; ++y) {
                var diffData = this.data[x][y],
                    neighbors = this.neighbors(x,y),
                    smallerSumX = 0, smallerSumY = 0,
                    biggerSumX = 0, biggerSumY = 0,
                    smallerN = 0, biggerN = 0,
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

                    /* We define "significantly different" as being 2 times bigger in amplitude/weight. */
                    if (neighborWeight > (2 * diffWeight)) {
                        biggerSumX += nx;
                        biggerSumY += ny;
                        biggerN++;
                    } else if (diffWeight > (2 * neighborWeight)){
                        smallerSumX += nx;
                        smallerSumY += ny;
                        smallerN++;
                    }
                });

                /* If more than 5/8 of the neighbors are significantly different, we set this cell
                   to the average of the neighbors' values. */
                if (smallerN >= neighbors.length * 5/8) {
                    diffData.x = Math.floor(smallerSumX/smallerN);
                    diffData.y = Math.floor(smallerSumY/smallerN);
                } else if (biggerN >= neighbors.length * 5/8) {
                    diffData.x = Math.floor(biggerSumX/biggerN);
                    diffData.y = Math.floor(biggerSumY/biggerN);
                }
            }
        }
    }

    /* Paint the differences onto a canvas. */
    paintDiff(canvas) {
        var ctx = canvas.getContext('2d');

        var patchWidth = canvas.width / this.width;
        var patchHeight = canvas.height / this.height;

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        var x,y,patch,
            min = 1000000,
            max = -1000000,
            diffValue;

        /* compute the min and max, so we can map it to 0-1 values in the
           hsv color space */
        for (x = 0; x < this.width; ++x) {
            for (y = 0; y < this.height; ++y) {
                patch = this.data[x][y];
                diffValue = Math.abs(patch.x)+Math.abs(patch.y);

                if (diffValue > max) {
                    max = diffValue;
                }

                if (diffValue < min) {
                    min = diffValue;
                }
            }
        }

        var variance = max - min;

        for (x = 0; x < this.width; ++x) {
            for (y = 0; y < this.height; ++y) {
                patch = this.data[x][y];

                /* For now we just add together the x- and y-differences */
                diffValue = Math.abs(patch.x)+Math.abs(patch.y);

                ctx.fillStyle = Gradient.hsvToRgb((1-diffValue/variance)*0.8, 1, 1);
                ctx.fillRect(
                    x * patchWidth,
                    y * patchHeight,
                    patchWidth + 1,
                    patchHeight + 1
                );
            }
        }
    }
}
