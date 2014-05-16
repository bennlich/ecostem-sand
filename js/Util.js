
/* Simple utility that can load a remote image and invoke a user callback on it */
export class ImageLoader {
    constructor() {}

    load(url, callback) {
        var img = new Image();

        img.crossOrigin = '';
        img.onload = () => {
            if (typeof callback === 'function') {
                callback(img);
            }
        };
        img.src = url;
    }

    loadIntoCanvasCtx(url, ctx) {
        this.load(url, (img) => ctx.drawImage(img, 0, 0));
    }

    loadIntoCanvas(url, canvas) {
        this.loadIntoCanvasCtx(url, canvas.getContext('2d'));
    }
}

/* Simple 2d raster. TODO: Should technically be a model, I think. */
export class Raster {
    constructor(width,height,initValue) {
        this.width = width;
        this.height = height;

        this.data = new Array(width);
        for (var x = 0; x < this.width; ++x) {
            this.data[x] = new Array(height);
            for (var y = 0; y < this.height; ++y) {
                this.data[x][y] = _.extend({}, initValue);
            }
        }
    }
}
