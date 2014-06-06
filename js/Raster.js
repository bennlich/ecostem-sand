
/* Simple 2d raster. TODO: Should technically be a model, I think. */
export class Raster {
    constructor(width,height,initValue) {
        this.width = width;
        this.height = height;
        this.initValue = initValue;

        this.data = new Array(width);

        for (var x = 0; x < this.width; ++x) {
            this.data[x] = new Array(height);

            for (var y = 0; y < this.height; ++y) {
                this.data[x][y] = _.extend({}, initValue);
            }
        }
    }

    /* subclass this */
    pixelRenderer(rasterCell) { return {r:0, g: 0, b: 0, a: 255}; }

    reset() {
        for (var x = 0; x < this.width; ++x) {
            for (var y = 0; y < this.height; ++y) {
                this.data[x][y] = _.extend({_x: x, _y: y}, this.initValue);
            }
        }
    }

    renderInCanvas(canvas) {
        canvas.width = this.width;
        canvas.height = this.height;

        var ctx = canvas.getContext('2d'),
            imageData = ctx.getImageData(0, 0, this.width, this.height);

        for (var x = 0; x < this.width; ++x) {
            for (var y = 0; y < this.height; ++y) {
                var idx = (y * this.width + x) * 4;
                var rgba = this.pixelRenderer(this.data[x][y]);
                imageData.data[idx] = rgba.r;
                imageData.data[idx+1] = rgba.g;
                imageData.data[idx+2] = rgba.b;
                imageData.data[idx+3] = rgba.a;
            }
        }

        ctx.putImageData(imageData, 0, 0);
    }

    /* bilinear interpolation -- adapted from Owen's coffeescript code */
    bilinear(x,y,prop) {
        var get = (x,y) => {
            if (this.data[x] && this.data[x][y])
                return this.data[x][y][prop] || 0;
            else
                return 0;
        };

        var x0 = Math.floor(x),
            y0 = Math.floor(y);

        x = x - x0;
        y = y - y0;

        var dx = 1-x,
            dy = 1-y,
            f00 = get(x0, y0),
            f01 = get(x0, y0+1),
            f10 = get(x0+1, y0),
            f11 = get(x0+1, y0+1);

        return f00 * dx * dy + f10 * x * dy + f01 * dx * y + f11 * x * y;
    }

    neighbors(x,y) {
        var n = [];

        for (var i = x-1; i <= x+1; ++i) {
            for (var j = y-1; j <= y+1; ++j) {
                if (!(i === x && j === y) && i >= 0 && j >= 0 && i < this.width && j < this.height) {
                    n.push(this.data[i][j]);
                }
            }
        }

        return n;
    }
}
