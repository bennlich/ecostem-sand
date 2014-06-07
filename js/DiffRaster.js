import {Raster} from './Raster';
import {Gradient} from '../st-api/Util/Gradient';

export class DiffRaster extends Raster {
    constructor(width, height) {
        super(width, height, {});
    }

    /* flatRaster and moundRaster are *camera-space* rasters, so they differ
       in dimensions from DiffRaster */
    doDiff(flatRaster, moundRaster) {
        if (flatRaster.width !== moundRaster.width || flatRaster.height !== moundRaster.height) {
            console.error('flatRaster and moundRaster dimensions differ.');
            return;
        }

        this.reset();

        var width = flatRaster.width,
            height = flatRaster.height;

        /* first, populate the projector raster with a list of "opinions" from
           camera space. Each camera pixel has an opinion about where a projector
           cell "moved", because each camera pixel has a before and after. It
           sees one projector cell in the before, and possibly another cell in the after. */
        for (var i = 0; i < width; ++i) {
            for (var j = 0; j < height; ++j) {
                var flatPixel = flatRaster.data[i][j],
                    moundPixel = moundRaster.data[i][j];

                if (!flatPixel.enabled || !moundPixel.enabled) {
                    continue;
                }

                var projectorCell = this.data[moundPixel.x][moundPixel.y];

                if (! projectorCell.list) {
                    projectorCell.list = [];
                }

                /* only add it if it hasn't already been added */
                var alreadyExists = _.find(projectorCell.list, (obj) =>
                    flatPixel.x === obj.x && flatPixel.y === obj.y
                );

                /* don't care about mound (0,0) values. TODO: (0,0) signifies "no data"
                   and the (0,0) cell at the same time. */
                if (!alreadyExists && flatPixel.x !== 0 && flatPixel.y !== 0) {
                    projectorCell.list.push({
                        x: flatPixel.x,
                        y: flatPixel.y
                    });
                }
            }
        }

        /* we then sort the opinions by distance from the original point and pick
           the shortest distance to be our "diff value" */
        for (var x = 0; x < this.width; ++x) {
            for (var y = 0; y < this.height; ++y) {
                var diffData = this.data[x][y];

                /* we straight-up disable the edges of the projection, where there are
                   usually many errors */
                if (x === 0 || y === 0 || x === this.width-1 || y === this.height-1) {
                    diffData.diffValue = 0;
                    delete diffData.list;
                    continue;
                }

                if (diffData.list && diffData.list.length > 0) {
                    diffData.list = _.sortBy(diffData.list, (obj) =>
                        Math.abs(obj.x - x) + Math.abs(obj.y - y)
                    );

                    var choice = diffData.list[0];

                    diffData.diffValue = Math.abs(choice.x - x) + Math.abs(choice.y - y);
                } else {
                    diffData.diffValue = 0;
                }
            }
        }
    }

    /* blurs lone cells that are significantly higher or lower than their neighbors */
    pruneOutliers(n) {
        if (typeof n !== 'number' || n <= 0) n = 1;
        while (n--) this._pruneOutliers();
    }
    _pruneOutliers() {
        for (var x = 0; x < this.width; ++x) {
            for (var y = 0; y < this.height; ++y) {
                var diffData = this.data[x][y];
                var n = this.neighbors(x,y);

                var biggerN = [],    /* significantly bigger neighbors */
                    smallerN = [];   /* significantly smaller neighbors */

                for (var i = 0; i < n.length; ++i) {
                    /* significantly different ==> 5 times smaller or bigger */
                    if (n[i].diffValue > 5 * diffData.diffValue) {
                        biggerN.push(n[i].diffValue);
                    } else if (n[i].diffValue * 5 < diffData.diffValue) {
                        smallerN.push(n[i].diffValue);
                    }
                }

                var arr = biggerN.length > smallerN.length ? biggerN : smallerN;

                /* we only blur if at least 70% of the neighbors are significantly different */
                if (arr.length/n.length > 0.7) {
                    diffData.diffValue = _.reduce(arr, (a,b) => a+b, 0) / arr.length;
                }
            }
        }
    }

    /* simple blur algorithm. sets each cell to the avg of the neighbors */
    blur(n) {
        if (typeof n !== 'number' || n <= 0) n = 1;
        while (n--) this._blur();
    }
    _blur() {
        for (var x = 0; x < this.width; ++x) {
            for (var y = 0; y < this.height; ++y) {
                var diffData = this.data[x][y];
                var n = this.neighbors(x,y);
                diffData.diffValue = _.reduce(n, (a,b) => a + b.diffValue, 0) / n.length;
            }
        }
    }

    /* Creates a new DiffRaster with the new dimensions and uses bilinear
       interpolation to fill the upsample this raster into the new, bigger one */
    upsample(newWidth, newHeight) {
        newWidth = Math.floor(newWidth);
        newHeight = Math.floor(newHeight);

        if (newWidth <= this.width || newHeight <= this.height) {
            console.error("Won't upsample to lower res.");
            return;
        }

        var newRaster = new DiffRaster(newWidth, newHeight);

        var widthRatio = this.width / newWidth,
            heightRatio = this.height / newHeight;

        for (var i = 0; i < newWidth; ++i) {
            for (var j = 0; j < newHeight; ++j) {
                newRaster.data[i][j].diffValue = this.bilinear(i * widthRatio, j * heightRatio, 'diffValue');
            }
        }

        return newRaster;
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
                diffValue = patch.diffValue;

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
                diffValue = patch.diffValue;

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
