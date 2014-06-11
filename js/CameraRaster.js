import {Raster} from './Raster';

export class CameraRaster extends Raster {
    constructor(width, height) {
        var initValue = {
            x:0,
            y:0,
            min: 1000000,
            max: -1000000,
            variance: 0,
            enabled: true
        };
        super(width, height, initValue);
    }

    pixelRenderer(rasterCell) {
        /* We render the x,y values in the r/g/b channels like this. We assume
           we only use 12 bits of x and y. (This is only a limitation for this
           rendering-data-in-pixels scheme, not otherwise.) So:
             x = |0|x1|x2|x3|
             y = |0|y1|y2|y3|
           where each x1..3 and y1..3 denote a 4-bit part, and the most significant
           4 bits are not used, marked 0.

           Each pixel in a canvas is 32 bits, with 8 bits for each channel (red, green, blue, alpha).
           We encode x,y in r/g/b as follows:

           red:   |x1|x2|
           green: |x3|y1|
           blue:  |y2|y3|
           alpha: 0 if disabled, 255 (full opacity) otherwise */
        return {
            r: (rasterCell.x >> 4) & 0xff,
            g: ((rasterCell.x << 4) & 0xf0) | ((rasterCell.y >> 8) & 0x0f),
            b: rasterCell.y & 0xff,
            a: rasterCell.enabled ? 255 : 0
        };
    }

    processPixelChange(rasterCell, pixel) {
        var val = pixel.r + pixel.g + pixel.b;

        if (val > rasterCell.max)
            rasterCell.max = val;

        if (val < rasterCell.min)
            rasterCell.min = val;

        rasterCell.variance = rasterCell.max - rasterCell.min;
    }

    disableLowVariancePixels() {
        var reduceFun = (memo, list) => {
            return memo.concat(_.pluck(list, 'variance'));
        };

        var variances = _.reduce(this.data, reduceFun, []);
        variances.sort(function(x,y) { return x-y; });
        variances = _.uniq(variances, true);

        var idx = Math.ceil(variances.length * 0.5);
        var middle = variances[idx];

        var x,y;

        for (x = 0; x < this.width; ++x) {
            for (y = 0; y < this.height; ++y) {
                var cell = this.data[x][y];
                if (cell.variance < middle) {
                    cell.enabled = false;
                }
            }
        }
    }
}
