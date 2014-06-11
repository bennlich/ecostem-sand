
import {Config} from './Config';

/* Dummy image loader that loads the pre-shot images from img/scantest-*.
   This is a drop-in from the image loader and doesn't require any
   changes to the client code. */
class ImageLoaderTestDummy {
    constructor() {
        this.imageLoader = new RealImageLoader();

        this.dir = Config.dummyScanDir;

        this.init = 0;
        this.stage = 'before';
        this.step = 1;
        this.mode = 'v';
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
        /* Emulate StripeScan by loading one frame just to get image dimensions,
           and the special "dummy" frame that makes sure every pixel is both
           black and white across the full scan */
        if (this.init < 2) {
            this._doDummyFrame(callback);
            return;
        }
        url = '{0}/{1}/{2}{3}.jpg'.format(this.dir, this.stage, this.mode, this.step);
        this.imageLoader.load(url, callback);
        this.step++;

        if ((this.mode === 'v' && this.step > Config.vertFrames) || (this.mode === 'h' && this.step > Config.horizFrames)) {
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

export var ImageLoader = Config.useDummyServer ? ImageLoaderTestDummy : RealImageLoader;
