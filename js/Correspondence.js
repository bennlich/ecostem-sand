
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

export class Correspondence {
    constructor() {
        this.server = "http://192.168.1.141:8080/shot.jpg";
        this.imageLoader = new ImageLoader();
        /* the canvas on which we draw the binary codes */
        this.screenCanvas = null;
        this.screenCtx = null;
        /* the canvas in which we store the correspondence */
        this.canvas = null;
        this.canvasCtx = null;

        this.tmpCanvas = null;
        this.tmpCtx = null;

        this.w = 128;
        this.h = 128;

        this.map1 = new Array(this.w);
        this.map2 = new Array(this.w);

        for (var x = 0; x < this.w; ++x) {
            this.map1[x] = new Array(this.h);
            this.map2[x] = new Array(this.h);
            for (var y = 0; y < this.h; ++y) {
                this.map1[x][y] = 0;
                this.map2[x][y] = 0;
            }
        }
    }

    makeCanvas(width, height) {
        var canvas = document.createElement('canvas');
        var tmpCanvas = document.createElement('canvas');

        canvas.width = tmpCanvas.width = width;
        canvas.height = tmpCanvas.height = height;

        this.canvas = canvas;
        this.canvasCtx = canvas.getContext('2d');
        this.canvasCtx.fillStyle = 'black';
        this.canvasCtx.fillRect(0, 0, width, height);

        this.tmpCanvas = tmpCanvas;
        this.tmpCtx = tmpCanvas.getContext('2d');
    }

    scan(canvas, map, cb) {
        console.log(canvas.width, canvas.height);
        this.screenCanvas = canvas;
        this.screenCtx = canvas.getContext('2d');

        this.getImage((img) => {
            this.makeCanvas(img.width, img.height);
            this.numSteps = 7;
            this.blackFrame(() => {
                this.whiteFrame(() => {
                    this.step(this.numSteps, true, () => {
                        this.step(this.numSteps, false, () => {
                            this.screenCtx.drawImage(this.canvas, 0, 0);
                        });
                    });
                });
            });
        });
    }

    blackFrame(cb) {
        this.screenCtx.fillStyle = 'black';
        this.screenCtx.fillRect(0, 0, this.screenCanvas.width, this.screenCanvas.height);
        this.getImage((img) => {
            this.tmpCtx.drawImage(img, 0, 0);

            var w = this.tmpCanvas.width,
                h = this.tmpCanvas.height,
                imgData = this.tmpCtx.getImageData(0, 0, w, h),
                canvasImgData = this.canvasCtx.getImageData(0, 0, w, h);

            for (var i = 0; i < w; ++i) {
                for (var j = 0; j < h; ++j) {
                    var idx = (j * w + i) * 4;
                    var r = imgData.data[idx],
                        g = imgData.data[idx+1],
                        b = imgData.data[idx+2];

                    if (r > 150 && g > 150 && b > 150) {
                        canvasImgData.data[idx+3] = 0;
                    }
                }
            }
            this.canvasCtx.putImageData(canvasImgData, 0, 0);

            if (typeof cb === 'function') { cb(); }
        });
    }

    whiteFrame(cb) {
        this.screenCtx.fillStyle = 'white';
        this.screenCtx.fillRect(0, 0, this.screenCanvas.width, this.screenCanvas.height);
        this.getImage((img) => {
            this.tmpCtx.drawImage(img, 0, 0);

            var w = this.tmpCanvas.width,
                h = this.tmpCanvas.height,
                imgData = this.tmpCtx.getImageData(0, 0, w, h),
                canvasImgData = this.canvasCtx.getImageData(0, 0, w, h);

            for (var i = 0; i < w; ++i) {
                for (var j = 0; j < h; ++j) {
                    var idx = (j * w + i) * 4;
                    var r = imgData.data[idx],
                        g = imgData.data[idx+1],
                        b = imgData.data[idx+2];

                    if (!(r > 80 || g > 80 || b > 80)) {
                        canvasImgData.data[idx+3] = 0;
                    }
                }
            }
            this.canvasCtx.putImageData(canvasImgData, 0, 0);

            if (typeof cb === 'function') { cb(); }
        });
    }

    scan1(canvas, cb) { this.scan(canvas, this.map1, cb); }

    scan2(canvas, cb) { this.scan(canvas, this.map2, cb); }

    showDiff(canvas) {
    }

    paint(numStripes, vertical = true) {
        var stripeSize = (vertical ? this.screenCanvas.width : this.screenCanvas.height) / numStripes;

        var state = true;
        var nextColor = () => (state = !state) ? 'white' : 'black';

        this.screenCtx.clearRect(0, 0, this.screenCanvas.width, this.screenCanvas.height);

        for (var x = 0; x < numStripes; ++x) {
            this.screenCtx.fillStyle = nextColor();
            if (vertical) {
                this.screenCtx.fillRect(x * stripeSize, 0, x * stripeSize + stripeSize, this.screenCanvas.height);
            } else {
                this.screenCtx.fillRect(0, x * stripeSize, this.screenCanvas.width, x * stripeSize + stripeSize);
            }
        }
    }

    process(img,mode) {
        this.tmpCtx.drawImage(img, 0, 0);

        var w = this.tmpCanvas.width,
            h = this.tmpCanvas.height,
            imgData = this.tmpCtx.getImageData(0, 0, w, h),
            canvasImgData = this.canvasCtx.getImageData(0, 0, w, h);

        for (var i = 0; i < w; ++i) {
            for (var j = 0; j < h; ++j) {
                var idx = (j * w + i) * 4;
                var r = imgData.data[idx],
                    g = imgData.data[idx+1],
                    b = imgData.data[idx+2];

                var offset = mode ? 0 : 2;
                if (r > 100 && b > 100 && g > 100) {
                    canvasImgData.data[idx+offset] = (canvasImgData.data[idx+offset] << 1) | 1;
                } else {
                    canvasImgData.data[idx+offset] = (canvasImgData.data[idx+offset] << 1) | 0;
                }
            }
        }
        this.canvasCtx.putImageData(canvasImgData, 0, 0);
    }

    getImage(cb) {
        setTimeout(() => {
            this.imageLoader.load(this.server + '?x=' + Math.random(), (img) => {
                if (typeof cb === 'function') {
                    cb(img);
                }
            });
        }, 200);
    }

    step(n,mode,cb) {
        if (n > 0) {
            var numStripes = Math.pow(2, (this.numSteps-n+1));
            this.paint(numStripes,mode);
            this.getImage((img) => {
                this.process(img,mode);
                this.step(n-1,mode,cb);
            });
        }
        else {
            if (typeof cb === 'function') {
                cb();
            }
        }
    }
}
