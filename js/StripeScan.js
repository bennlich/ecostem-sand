
import {ImageLoader} from './Util';
import {Raster} from './Util';

/* TODO: this should eventually be a model, and I think the Raster
   class shouldn't be needed? */
class OutputRaster extends Raster {
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
        return {
            r: rasterCell.x,
            g: 0,
            b: rasterCell.y,
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

        console.log(variances, idx, middle);

        var x,y;

        for (x = 0; x < this.width; ++x) {
            for (y = 0; y < this.height; ++y) {
                var cell = this.data[x][y];
                if (cell.variance < middle) {
                    cell.enabled = false;
                }
            }
        }

        /*
        // temporary to cut out mirror reflection from the test pictures
        for (x = 0; x < this.width; ++x) {
            for (y = 500; y < this.height; ++y) {
                this.data[x][y].enabled = false;
            }
        }
        */
    }
}

export class StripeScan {
    constructor() {
        window.ss = this;

        this.server = "http://192.168.1.133:8080/shot.jpg";
        this.imageLoader = new ImageLoader();

        /* the canvas on which we draw the gray code stripes */
        this.screenCanvas = null;
        this.screenCtx = null;

        /* the raster in which we store the correspondence */
        this.outputRaster = null;

        /* temporary/working space canvas to store camera frame pixels */
        this.cameraCanvas = null;
        this.cameraCtx = null;
    }

    renderOutputCanvas() {
        this.outputRaster.renderInCanvas(this.outputCanvas);
    }

    makeCanvases(width, height) {
        this.outputRaster = new OutputRaster(width, height);

        var outputCanvas = document.createElement('canvas');
        var cameraCanvas = document.createElement('canvas');

        outputCanvas.width = cameraCanvas.width = width;
        outputCanvas.height = cameraCanvas.height = height;

        this.outputCanvas = outputCanvas;
        this.outputCtx = outputCanvas.getContext('2d');

        this.cameraCanvas = cameraCanvas;
        this.cameraCtx = cameraCanvas.getContext('2d');
    }

    scan(canvas, doneCallback, errorCallback) {
        this.screenCanvas = canvas;
        this.screenCtx = canvas.getContext('2d');
        this.errorCallback = errorCallback;

        /* Grab an image just to get dimensions */
        this.grabCameraImage((img) => {
            this.makeCanvases(img.width, img.height);
            /* numSteps is how many level of stripes to flash. numSteps == 7
               would mean the finest level will display 2^7 = 128 stripes, giving
               a resolution of 128 x 128 for the correspondence raster. */
            this.numSteps = 7;

            this.paintAndProcessStripes(this.numSteps, 'vertical', () => {
                this.paintAndProcessStripes(this.numSteps, 'horizontal', () => {
                    this.outputRaster.disableLowVariancePixels();
                    this.renderOutputCanvas();
                    this.invoke(doneCallback, this.outputCanvas);
                });
            });
        });
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
    processEachCameraPixel(pixelCallback, doneCallback) {
        /* No point in doing anything without a callback... */
        if (typeof pixelCallback !== 'function') {
            return;
        }

        /* Grab image from the server. */
        this.grabCameraImage((img) => {
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
                    this.outputRaster.processPixelChange(rasterCell, pixel);
                }
            }

            this.invoke(doneCallback);
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
             2: black
           We always start in state 1, painting a white stripe first. */
        var state = 1;
        var nextColor = () => {
            var ret;

            if (state === 0 || state === 1) {
                ret = 'white';
                state++;
            } else if (state === 2 || state === 3) {
                ret = 'black';
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
                this.screenCtx.fillRect(x * stripeSize, 0, x * stripeSize + stripeSize, this.screenCanvas.height);
            } else {
                this.screenCtx.fillRect(0, x * stripeSize, this.screenCanvas.width, x * stripeSize + stripeSize);
            }
        }
    }

    /* Grab an image from the camera, technically assuming that the image is of
       a striped frame (done by projecting the output of paintStripes), and
       markes each camera pixel with its position in projector space, where
       its x-position is the x-th vertical stripe, and the y-position is the
       y-th horizontal stripe (counting from 0), in the last, highest resolution
       striped frame. */
    processFrame(mode, doneCallback) {
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

            if (cameraPixel.r + cameraPixel.g + cameraPixel.b > 450) {
                outputRasterCell[outputProp] = outputRasterCell[outputProp] << 1 | whiteBit;
            } else {
                outputRasterCell[outputProp] = outputRasterCell[outputProp] << 1 | blackBit;
            }
        };

        this.processEachCameraPixel(pixelCallback, doneCallback);
    }

    /* Grab an image from the camera server and invoke the callback on it */
    grabCameraImage(callback) {
        /* Add a random element to the url to prevent the browser from
           returning a cached image. */
        var serverUrl = this.server + '?x=' + Math.random();
        setTimeout(() =>
            this.imageLoader.load(
                serverUrl,
                (img) => this.invoke(callback, img),
                this.errorCallback
            ),
            200
        );
    }

    /* Take the number of striped frames you want to run, the mode which
       determines if the sequence will be vertical or horizontal stripes,
       and label each pixel with its location in projector space (in terms
       of which horizontal and vertical stripe it blongs to). Images are
       stored in a temporary canvas that is overwritten with each frame.
       The projector-space position of each pixel is stored in the output
       canvas. */
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
