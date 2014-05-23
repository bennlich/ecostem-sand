"use strict";

/* Loads image data from an HTTP url that takes a bounding box and image size.
   It also caches the returned data.
   This works for the node.redfish.com elevationServer and presumably
   it could be used for the fuel server as well */

import {LocalStorage} from './LocalStorage';

export class RemoteBBoxSampler {
    constructor(canvas, url) {
        /* elevation server by default */
        this.url = url || 'http://node.redfish.com/cgi-bin/elevation.py?bbox={s},{w},{n},{e}&res={width},{height}';
        this.canvas = canvas || document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.imageData = null;
        this.width = 1024;
        this.cacheDir = '/remote_sampler_cache';
        this.storage = new LocalStorage();
    }

    hasData() {
        return this.imageData !== null;
    }

    _bboxToString(bbox) {
        return '{s}_{w}_{n}_{e}'.namedFormat({
            s : bbox.getSouth(),
            w : bbox.getWest(),
            n : bbox.getNorth(),
            e : bbox.getEast()
        });
    }

    _getCachedData(bbox, successCb, notFoundCb) {
        var bboxString = this._bboxToString(bbox);
        this.storage.withDir(this.cacheDir, (dir) => {
            this.storage.dirGetFile(dir, bboxString, (fileObj) => {
                this.storage.readFileAsByteArray(fileObj, successCb);
            }, notFoundCb);
        });
    }

    _putCachedData(bbox, data) {
        var bboxString = this._bboxToString(bbox);
        this.storage.withDir(this.cacheDir, (dir) => {
            this.storage.writeFile('{0}/{1}'.format(dir, bboxString), data);
        });
    }

    /* Loads data for the current map bounds. Downloads the
     * remote image and writes it into a canvas. The canvas is used
     * for pixel-level access into the image, as well as for optionally
     * viewing the image.
     *
     * Takes a modelBBox and a callback that gets invoked when the
     * loading is finished.
     */
    loadRemoteData(modelBBox, callback) {
        var img = new Image();
        var height = Math.floor(modelBBox.pixelHeight() * this.width/modelBBox.pixelWidth());


        this.canvas.width = this.width;
        this.canvas.height = height;

        this._getCachedData(modelBBox.bbox, (data) => {
            /* cached data was found */

            var imageData = this.ctx.createImageData(this.canvas.width, this.canvas.height);

            _.each(data, function(d, idx) {
                imageData.data[idx] = d;
            });

            this.imageData = data;
            this.ctx.putImageData(imageData, 0, 0);

            if (typeof callback === 'function') {
                callback();
            }
        }, () => {
             /* cached data was not found. We have to hit the server. */

            img.crossOrigin = '';

            img.onload = () => {
                this.ctx.drawImage(img, 0, 0);

                this.imageData = this.ctx.getImageData(0, 0, this.width, height).data;

                /* cache the image data */
                this._putCachedData(modelBBox.bbox, this.imageData);

                if (typeof callback === 'function') {
                    callback();
                }
            };

            img.src = this.url.namedFormat({
                s : modelBBox.bbox.getSouth(),
                w : modelBBox.bbox.getWest(),
                n : modelBBox.bbox.getNorth(),
                e : modelBBox.bbox.getEast(),
                width: this.width,
                height: height
            });
        });
    }

    /* Gives the value at a given pixel. The value is
     * encoded in the pixel's color value using the formula:
     *  (red * 255^2 + green * 255 + blue)/10
     */
    sample(x,y) {
        x = Math.floor(x);
        y = Math.floor(y);

        var idx = (y * this.canvas.width + x) * 4;

        var r = this.imageData[idx];
        var g = this.imageData[idx+1];
        var b = this.imageData[idx+2];

        return (r * 255 * 255 + g * 255 + b) / 10;
    }
}
