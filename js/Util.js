
/* Dummy image loader that loads the pre-shot images from img/scantest.
   This is a drop-in from the image loader and doesn't require any
   changes to the client code. However, it makes assumptions about
   the setup in Correspondence.js. */
class ImageLoaderTestDummy {
    constructor() {
        this.imageLoader = new RealImageLoader();

        this.dir = 'img/scantest-sand2';

        this.init = 0;
        this.stage = 'before';
        this.step = 1;
        this.mode = 'v';

        /* Assumption: This has to be the same as 'vertFrames' in Correspondence.js */
        this.vertSteps = 7;
        /* Assumption: This has to be the same as 'horizFrames' in Correspondence.js */
        this.horizSteps = 7;
    }

    _doDummyFrame(callback) {
        this.imageLoader.load('{0}/before/dummy.jpg'.format(this.dir),callback);
        this.init++;
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
        if (this.init < 2) {
            this._doDummyFrame(callback);
            return;
        }
        url = '{0}/{1}/{2}{3}.jpg'.format(this.dir, this.stage, this.mode, this.step);
        console.log('loading', url);
        this.imageLoader.load(url, callback);
        this.step++;

        if ((this.mode === 'v' && this.step > this.vertSteps) || (this.mode === 'h' && this.step > this.horizSteps)) {
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
    constructor() {
        this.token = 1;
    }

    load(url, callback, errorCallback) {
        var img = new Image();
        var loading = false;
        var timeout;

        img.crossOrigin = '';
        img.onload = () => {
            if (!loading) {
                return;
            }
            clearTimeout(timeout);
            loading = false;
            if (typeof callback === 'function') {
                callback(img);
            }
        };
        img.onerror = () => {
            if (!loading) {
                return;
            }
            clearTimeout(timeout);
            loading = false;
            if (typeof errorCallback === 'function') {
                errorCallback();
            }
        };

        loading = true;
        img.src = url + '?token=' + this.token++;

        timeout = setTimeout(() => {
            if (loading) {
                loading = false;
                if (typeof errorCallback === 'function') {
                    errorCallback();
                }
            }
        }, 2000);
    }

    loadIntoCanvasCtx(url, ctx) {
        this.load(url, (img) => ctx.drawImage(img, 0, 0));
    }

    loadIntoCanvas(url, canvas) {
        this.loadIntoCanvasCtx(url, canvas.getContext('2d'));
    }
}

export var ImageLoader = ImageLoaderTestDummy;
//export var ImageLoader = RealImageLoader;

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
                this.data[x][y] = _.extend({}, this.initValue);
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
