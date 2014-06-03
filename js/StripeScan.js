
import {ImageLoader} from './Util';
import {CameraRaster} from './CameraRaster';

export class StripeScan {
    constructor() {
        window.ss = this;

        this.server = "http://192.168.1.106:8080/shot.jpg";
        console.log(this.server);
        this.imageLoader = new ImageLoader();

        /* the canvas on which we draw the gray code stripes */
        this.screenCanvas = null;
        this.screenCtx = null;

        /* the raster in which we store the correspondence */
        this.outputRaster = null;

        /* temporary/working space canvas to store camera frame pixels */
        this.cameraCanvas = null;
        this.cameraCtx = null;

        this.darkStripeColor = '#000';
        this.lightStripeColor = '#888';

        this.init();
    }

    renderOutputCanvas() {
        this.outputRaster.renderInCanvas(this.outputCanvas);
    }

    init(width, height) {
        this.dummyImage = null;
        this.horizStripeImages = [];
        this.vertStripeImages = [];

        this.outputRaster = new CameraRaster(width, height);

        var outputCanvas = document.createElement('canvas');
        var cameraCanvas = document.createElement('canvas');

        outputCanvas.width = cameraCanvas.width = width;
        outputCanvas.height = cameraCanvas.height = height;

        this.outputCanvas = outputCanvas;
        this.outputCtx = outputCanvas.getContext('2d');

        this.cameraCanvas = cameraCanvas;
        this.cameraCtx = cameraCanvas.getContext('2d');
    }

    scan(vertFrames, horizFrames, canvas, doneCallback, errorCallback) {
        this.screenCanvas = canvas;
        this.screenCtx = canvas.getContext('2d');
        this.errorCallback = errorCallback;

        /* Grab an image just to get dimensions */
        this.grabCameraImage((img) => {
            this.init(img.width, img.height);
            /* numFrames is how many level of stripes to flash. numFrames == 7
               would mean the finest level will display 2^7 = 128 stripes, giving
               a resolution of 128 x 128 for the correspondence raster. */
            this.vertFrames = vertFrames;
            this.horizFrames = horizFrames;

            this.grabImages(() => {
                this.computeMinMax();
                this.processImages('vertical');
                this.processImages('horizontal');
                this.outputRaster.disableLowVariancePixels();
                this.invoke(doneCallback, this.outputRaster);
            });
        });
    }

    /* Pre-compute min/max/variance for the brightness of each pixel across all frames.
       This will be used by isBright below, for a dynamic per-pixel brightness estimate.
       It will also be used by outputRaster.disableLowVariancePixels to chop off
       pixels outside the active area. */
    computeMinMax() {
        var pixelCallback = (pixel, rasterCell) => {
            var value = pixel.r + pixel.g + pixel.b;

            if (value > rasterCell.max) {
                rasterCell.max = value;
            }

            if (value < rasterCell.min) {
                rasterCell.min = value;
            }

            rasterCell.variance = rasterCell.max - rasterCell.min;
        };

        this.processEachCameraPixel(this.dummyImage, pixelCallback);

        _.each(this.vertStripeImages, (img) => this.processEachCameraPixel(img, pixelCallback));
        _.each(this.horizStripeImages, (img) => this.processEachCameraPixel(img, pixelCallback));
    }

    isBright(pixel, rasterCell) {
        var variance = rasterCell.max - rasterCell.min;
        var val = pixel.r + pixel.g + pixel.b;
        /* the threshold between "bright" and "dark" is the halfway point
           between the pixel's min and max across all frames. */
        return val > rasterCell.min + variance/2;
    }

    invoke(callback, arg) {
        if (typeof callback === 'function') {
            callback(arg);
        }
    }

    /* Grabs an image from the camera server and iterates pixelCallback over
       each of its pixels. pixelCallback gets called with:

         pixelCallback(pixel, outputRasterCell)

       where index is the offset of the current pixel. cameraPixels is
       the "data" properties of the camera canvas ImageData object, so it contains a flat
       pixel representation where idx is the offset of the red component, idx+1
       is green, idx+2 is blue, and idx+3 is the alpha component.

       The callback should write its output into rasterCell, which represents
       the corresponding cell for this pixel in this.outputRaster. */
    processEachCameraPixel(img, pixelCallback) {
        /* No point in doing anything without a callback... */
        if (typeof pixelCallback !== 'function') {
            return;
        }

        /* Put the image in the tmp/workspace canvas. */
        this.cameraCtx.drawImage(img, 0, 0);

        var w = this.cameraCanvas.width,
        h = this.cameraCanvas.height,
        /* Camera image pixels */
        cameraPixels = this.cameraCtx.getImageData(0, 0, w, h);

        for (var i = 0; i < w; ++i) {
            for (var j = 0; j < h; ++j) {
                var idx = (j * w + i) * 4;
                /* Invoke the callback */
                var pixel = {
                    r: cameraPixels.data[idx],
                    g: cameraPixels.data[idx+1],
                    b: cameraPixels.data[idx+2],
                    a: cameraPixels.data[idx+3]
                };
                var rasterCell = this.outputRaster.data[i][j];
                pixelCallback(pixel, rasterCell);
            }
        }
    }

    grabDummyFrame(callback) {
        var width = this.screenCanvas.width,
            height = this.screenCanvas.height,
            ctx = this.screenCtx;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = this.darkStripeColor;
        ctx.fillRect(0, 0, width/2, height);
        ctx.fillStyle = this.lightStripeColor;
        ctx.fillRect(width/2, 0, width/2, height);

        this.grabCameraImage((img) => {
            this.dummyImage = img;
            this.invoke(callback);
        });
    }

    /* Fills the screen canvas with numStripes stripes. The stripes alternate
       in the following pattern (where 0 = white, 1 = black):
         Length 2:  01
         Length 4:  0110
         Length 8:  01100110
         Length 16: 0110011001100110
       This helps tagging pixels with their x- and y-coord in projector space
       by using a gray coding scheme. */
    paintStripes(numStripes, mode = 'vertical') {
        var stripeSize = (mode === 'vertical' ? this.screenCanvas.width : this.screenCanvas.height) / numStripes;

        /* This state machine determines what the next color should be. There are four states:
             0: white
             1: white
             2: black
             3: black
           We always start in state 1, painting a white stripe first. */
        var state = 1;
        var nextColor = () => {
            var ret;

            if (state === 0 || state === 1) {
                ret = this.lightStripeColor;
                state++;
            } else if (state === 2 || state === 3) {
                ret = this.darkStripeColor;
                state++;
            }

            if (state === 4) {
                state = 0;
            }

            return ret;
        };

        this.screenCtx.clearRect(0, 0, this.screenCanvas.width, this.screenCanvas.height);

        for (var x = 0; x < numStripes; ++x) {
            this.screenCtx.fillStyle = nextColor();
            if (mode === 'vertical') {
                this.screenCtx.fillRect(Math.floor(x * stripeSize), 0, stripeSize*2, this.screenCanvas.height);
            } else {
                this.screenCtx.fillRect(0, Math.floor(x * stripeSize), this.screenCanvas.width, stripeSize*2);
            }
        }
    }

    /* Grab an image from the camera, technically assuming that the image is of
       a striped frame (done by projecting the output of paintStripes), and
       markes each camera pixel with its position in projector space, where
       its x-position is the x-th vertical stripe, and the y-position is the
       y-th horizontal stripe (counting from 0), in the last, highest resolution
       striped frame. */
    processFrame(img, mode) {
        /* determines which property of outputRasterCell we write into. If mode
           is 'vertical', we write the 'x' component. If it's horizontal, 'y' */
        var outputProp = mode === 'vertical' ? 'x' : 'y';

        var pixelCallback = (cameraPixel, outputRasterCell) => {
            /* TODO: This uses a fixed heuristic for brightness detection that might not work depending
               on lighting conditions. */

            /* Gray Coding. For each striped frame, we progressively tag each
               pixel with its x- or y-coordinate in projector space (in terms of the
               vertical stripe number x and horizontal stripe number y -- counting
               from 0). The stripes are projected in a gray code scheme. The x-
               and y-coords are always stored in binary (not gray codes), and the
               conversion is done on the fly.

               The gray code frames look like (0=white, 1=black):
                 0               1
                 0       1       1       0
                 0   1   1   0   0   1   1   0, etc.

               We progressively assign indices to the corresponding pixels like:
               Frame 1:
                 0               1
               > 0               1
               Frame 2:
                 0       1       1       0
               > 00      01      10      11
               Frame 3:
                 0   1   1   0   0   1   1   0
               > 000 001 010 011 100 101 110 111 (notice: decimal 0-7)

               Assuming no noise, this will make sure that each pixel is marked with
               this precise x- and y-positions in projector space. */

            var prevBit = outputRasterCell[outputProp] & 0x1,
                whiteBit = 0,
                blackBit = 1;

            /* If the LSB from the last frame is 1, flip the values. This is the
               whole trick to incrementally translating gray to binary. */
            if (prevBit === 1) {
                whiteBit = 1;
                blackBit = 0;
            }

            if (this.isBright(cameraPixel, outputRasterCell)) {
                outputRasterCell[outputProp] = outputRasterCell[outputProp] << 1 | whiteBit;
            } else {
                outputRasterCell[outputProp] = outputRasterCell[outputProp] << 1 | blackBit;
            }
        };

        this.processEachCameraPixel(img, pixelCallback);
    }

    /* Grab an image from the camera server and invoke the callback on it */
    grabCameraImage(callback) {
        /* Add a random element to the url to prevent the browser from
           returning a cached image. */
        var serverUrl = this.server;
        setTimeout(() =>
            this.imageLoader.load(
                serverUrl,
                (img) => this.invoke(callback, img),
                this.errorCallback
            ),
            200
        );
    }

    /* Take the mode which
       determines if the sequence will be vertical or horizontal stripes,
       and label each pixel with its location in projector space (in terms
       of which horizontal and vertical stripe it blongs to). Images are
       stored in a temporary canvas that is overwritten with each frame.
       The projector-space position of each pixel is stored in the output
       raster. */
    processImages(mode) {
        var array = mode === 'vertical' ? this.vertStripeImages : this.horizStripeImages;
        _.each(array, (img) => {
            console.log('process', img, mode);
            this.processFrame(img, mode);
        });
    }

    /* Grabs all the images from the camera server and stores the vertical stripe
       images in this.vertStripeImages and the horizontal ones in this.horizStripeImages. */
    grabImages(doneCallback) {
        this.grabDummyFrame(() => {
            this.grabImagesWithMode(this.vertFrames, 'vertical', this.vertStripeImages, () => {
                this.grabImagesWithMode(this.horizFrames, 'horizontal', this.horizStripeImages, doneCallback);
            });
        });
    }

    /* The meat of the method above. */
    grabImagesWithMode(n, mode, imageArray, doneCallback) {
        if (n > 0) {
            var numFrames = mode === 'vertical' ? this.vertFrames : this.horizFrames;
            var numStripes = Math.pow(2, (numFrames-n+1));
            /* Paint the stripes on the full-screen canvas. */
            this.paintStripes(numStripes, mode);
            /* Grab the camera image of those stripes. */
            this.grabCameraImage((img) => {
                /* Store it in its appropriate array -- order is totally important. */
                imageArray.push(img);
                /* Recurse next step. */
                this.grabImagesWithMode(n-1, mode, imageArray, doneCallback);
            });
        } else {
            this.invoke(doneCallback);
        }
    }
}
