
import {Gradient} from '../st-api/Util/Gradient';

class ImageLoader {
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

class Raster {
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

export class Correspondence {
    constructor() {
        this.stripeScan = new StripeScan();
        this.dataSize = 128;
        this.flatData = new Raster(this.dataSize, this.dataSize, {x:0, y:0});
        this.moundData = new Raster(this.dataSize, this.dataSize, {x:0, y:0});
        this.diffData = new Raster(this.dataSize, this.dataSize, {x:0, y:0});
    }

    flatScan(screenCanvas, callback) {
        this.doScan(screenCanvas, this.flatData.data, callback);
    }

    moundScan(screenCanvas, callback) {
        this.doScan(screenCanvas, this.moundData.data, () => {
            this.doDiff();
            this.paintDiff(screenCanvas);
        });
    }

    doDiff() {
        for (var x = 0; x < this.dataSize; ++x) {
            for (var y = 0; y < this.dataSize; ++y) {
                this.diffData.data[x][y].x = this.moundData.data[x][y].x - this.flatData.data[x][y].x;
                this.diffData.data[x][y].y = this.moundData.data[x][y].y - this.flatData.data[x][y].y;
            }
        }
    }

    paintDiff(canvas) {
        var colors = Gradient.gradient('#000', '#fff', 100);
        var ctx = canvas.getContext('2d');

        var patchWidth = canvas.width / this.dataSize;
        var patchHeight = canvas.width / this.dataSize;

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

    doScan(screenCanvas, raster, callback) {
        this.stripeScan.scan(screenCanvas, (canvas) => {
            var ctx = canvas.getContext('2d'),
                pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

            for (var i = 0; i < canvas.width; ++i) {
                for (var j = 0; j < canvas.height; ++j) {
                    var idx = (j * canvas.width + i) * 4;

                    if (pixels[idx+3]) {
                        var x = pixels[idx];
                        var y = pixels[idx+2];
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

class StripeScan {
    constructor() {
        this.server = "http://192.168.1.141:8080/shot.jpg";
        this.imageLoader = new ImageLoader();

        /* the canvas on which we draw the binary code stripes */
        this.screenCanvas = null;
        this.screenCtx = null;

        /* the canvas in which we store the correspondence */
        this.canvas = null;
        this.canvasCtx = null;

        /* temporary/working space canvas to store camera frame pixels */
        this.tmpCanvas = null;
        this.tmpCtx = null;
    }

    makeCanvas(width, height) {
        var canvas = document.createElement('canvas');
        var tmpCanvas = document.createElement('canvas');

        canvas.width = tmpCanvas.width = width;
        canvas.height = tmpCanvas.height = height;

        this.canvas = canvas;
        this.canvasCtx = canvas.getContext('2d');

        /* It's important that we start with all r/g/b values set to 0
           and all opacity values set to 255. */
        this.canvasCtx.fillStyle = 'black';
        this.canvasCtx.fillRect(0, 0, width, height);

        this.tmpCanvas = tmpCanvas;
        this.tmpCtx = tmpCanvas.getContext('2d');
    }

    scan(canvas, doneCallback) {
        this.screenCanvas = canvas;
        this.screenCtx = canvas.getContext('2d');

        /* Grab an image just to get dimensions */
        this.grabCameraImage((img) => {
            this.makeCanvas(img.width, img.height);
            /* numSteps is how many level of stripes to flash. numSteps == 7
               would mean the finest level will display 2^7 = 128 stripes, giving
               a resolution of 128 x 128 for the correspondence raster. */
            this.numSteps = 7;

            this.blackFrame(() => {
                this.whiteFrame(() => {
                    this.paintAndProcessStripes(this.numSteps, 'vertical', () => {
                        this.paintAndProcessStripes(this.numSteps, 'horizontal', () => {
                            //this.screenCtx.drawImage(this.canvas, 0, 0);
                            this.invoke(doneCallback, this.canvas);
                        });
                    });
                });
            });
        });
    }

    invoke(callback, arg) {
        if (typeof callback === 'function') {
            callback(arg);
        }
    }

    whiteFrame(doneCallback) {
        this.screenCtx.fillStyle = 'white';
        this.screenCtx.fillRect(0, 0, this.screenCanvas.width, this.screenCanvas.height);

        var pixelCallback = (cameraPixels, outputPixels, idx) => {
            if (!(cameraPixels[idx] > 80 || cameraPixels[idx + 1] > 80 || cameraPixels[idx + 2] > 80)) {
                outputPixels[idx + 3] = 0;
            }
        };

        this.processEachCameraPixel(pixelCallback, doneCallback);
    }

    blackFrame(doneCallback) {
        this.screenCtx.fillStyle = 'black';
        this.screenCtx.fillRect(0, 0, this.screenCanvas.width, this.screenCanvas.height);

        var pixelCallback = (cameraPixels, outputPixels, idx) => {
            if (cameraPixels[idx] > 150 && cameraPixels[idx + 1] > 150 && cameraPixels[idx + 2] > 150) {
                outputPixels[idx + 3] = 0;
            }
        };

        this.processEachCameraPixel(pixelCallback, doneCallback);
    }

    processEachCameraPixel(pixelCallback, doneCallback) {
        /* No point in doing anything without a callback... */
        if (typeof pixelCallback !== 'function') {
            return;
        }

        /* Grab image from the server. */
        this.grabCameraImage((img) => {
            /* Put the image in the tmp/workspace canvas. */
            this.tmpCtx.drawImage(img, 0, 0);

            var w = this.tmpCanvas.width,
                h = this.tmpCanvas.height,
                /* Camera image pixels */
                cameraPixels = this.tmpCtx.getImageData(0, 0, w, h),
                /* Output canvas pixels */
                outputPixels = this.canvasCtx.getImageData(0, 0, w, h);

            for (var i = 0; i < w; ++i) {
                for (var j = 0; j < h; ++j) {
                    var idx = (j * w + i) * 4;
                    pixelCallback(cameraPixels.data, outputPixels.data, idx);
                }
            }

            /* Write the change pixels back into the output canvas. */
            this.canvasCtx.putImageData(outputPixels, 0, 0);

            this.invoke(doneCallback);
        });
    }

    paintStripes(numStripes, mode = 'vertical') {
        var stripeSize = (mode === 'vertical' ? this.screenCanvas.width : this.screenCanvas.height) / numStripes;

        var state = true;
        var nextColor = () => (state = !state) ? 'white' : 'black';

        this.screenCtx.clearRect(0, 0, this.screenCanvas.width, this.screenCanvas.height);

        for (var x = 0; x < numStripes; ++x) {
            this.screenCtx.fillStyle = nextColor();
            if (mode === 'vertical') {
                this.screenCtx.fillRect(x * stripeSize, 0, x * stripeSize + stripeSize, this.screenCanvas.height);
            } else {
                this.screenCtx.fillRect(0, x * stripeSize, this.screenCanvas.width, x * stripeSize + stripeSize);
            }
        }
    }

    processFrame(mode, doneCallback) {
        var offset = mode === 'vertical' ? 0 : 2;

        var pixelCallback = (cameraPixels, outputPixels, idx) => {
            if (cameraPixels[idx] > 100 && cameraPixels[idx + 1] > 100 && cameraPixels[idx + 2] > 100) {
                outputPixels[idx + offset] = (outputPixels[idx + offset] << 1) | 1;
            } else {
                outputPixels[idx + offset] = (outputPixels[idx + offset] << 1) | 0;
            }
        };

        this.processEachCameraPixel(pixelCallback, doneCallback);
    }

    grabCameraImage(callback) {
        /* Add a random element to the url to prevent the browser from
           returning a cached image. */
        var serverUrl = this.server + '?x=' + Math.random();
        setTimeout(() => this.imageLoader.load(serverUrl, (img) => this.invoke(callback, img)), 200);
    }

    paintAndProcessStripes(n, mode, doneCallback) {
        if (n > 0) {
            var numStripes = Math.pow(2, (this.numSteps-n+1));
            this.paintStripes(numStripes, mode);
            this.processFrame(mode, () => this.paintAndProcessStripes(n-1, mode, doneCallback));
        }
        else {
            this.invoke(doneCallback);
        }
    }
}
