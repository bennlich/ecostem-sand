
class ImageLoaderTestDummy {
    constructor() {
        this.imageLoader = new RealImageLoader();
        this.init = false;
        this.stage = 'before';
        this.step = 1;
        this.mode = 'v';
    }

    _doDummyFrame(callback) {
        this.imageLoader.load('img/scantest/before/h1.jpg',callback);
        this.init = true;
    }

    _flipMode() {
        this.step = 1;
        this.mode = this.mode === 'v' ? 'h' : 'v';
    }

    _flipStage() {
        this.step = 1;
        this.mode = 'v';
        this.stage = this.stage === 'before' ? 'after' : 'before';
    }

    load(url, callback) {
        if (!this.init) {
            this._doDummyFrame(callback);
            return;
        }
        url = 'img/scantest/{0}/{1}{2}.jpg'.format(this.stage, this.mode, this.step);
        console.log('loading', url);
        this.imageLoader.load(url, callback);
        this.step++;
        if (this.step > 7) {
            if (this.mode === 'h') {
                this._flipStage();
                this.init = false;
            } else {
                this._flipMode();
            }
        }
    }
}

/* Simple utility that can load a remote image and invoke a user callback on it */
class RealImageLoader {
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

export var ImageLoader = ImageLoaderTestDummy;

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
