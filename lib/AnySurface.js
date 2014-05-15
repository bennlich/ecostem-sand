var AnySurface = AnySurface || {};

AnySurface.Laser = function(chrome) {
    if (!chrome) {
        throw new Error('Anysurface supports only the Chrome browser.');
    }

    var app = {
        getID: function() {
            return document.getElementById('laserExtensionID').innerText;
        },

        evaluate: function(str, callback) {
            chrome.runtime.sendMessage(AnySurface.Laser.getID(), "{\"evaluate\":\" " + str + "\"}", function(e) {
                console.log('returned from eval on extension', e);
                if (typeof callback === 'function') {
                    callback(e);
                }
            });
        },

        getCorr: function(callback) {
            chrome.runtime.sendMessage(app.getID(), 'getcorres', function(e) {
                console.log('msg', e);
                if (e && e.search('data:image/') > -1) {
                    if (typeof callback === 'function') {
                        callback(e);
                    }
                }
            });
        },

        calib: function(callback) {
            function itsdone() {
                console.log('finally done');
                if (typeof callback === 'function') {
                    callback();
                }
                document.removeEventListener('grayDisplayControllerDone', itsdone, false);
            }

            document.addEventListener('grayDisplayControllerDone', itsdone, false);
            chrome.runtime.sendMessage(app.getID(), 'calibrate');
        },

        lasermove: function(callback) {
            //override this function to recieve laser messages
        },

        turnOffVMouse: function() {
            console.log('turn off mouse');
            var event = new CustomEvent('virtualMouse', {
                'detail': {
                    'enabled': false
                }
            });
            document.dispatchEvent(event);
        },

        turnOnVMouse: function() {
            var event = new CustomEvent('virtualMouse', {
                'detail': {
                    'enabled': true
                }
            });
            document.dispatchEvent(event);
        },

        getState: function(callback) {
            chrome.runtime.sendMessage(app.getID(), 'state', function(e) {
                if (typeof callback === 'function') {
                    callback(e);
                }
            });
        }
    };

    document.addEventListener('lasermove', function(e) {
        app.lasermove(e);
    }, false);

    return app;
}(chrome);

AnySurface.Scan = function() {
    return {
        projWid: 1280,
        projHei: 768,
        camWid: 0,
        camHei: 0,
        flatProjXY: null,
        moundProjXY: null,
        flatCamXY: null,
        moundCamXY: null,
        differencesXY: null,
        moundImg: new Image(),
        flatImg: new Image(),
        NODATA_VALUE: -9999, //-1215752191
        //
        //  Fill arrays with data
        //
        setup: function(flatImgsrc, moundImgsrc, callbackA) {
            console.log('   threeDiScan.setup called');

            var imgF = document.createElement('img');
            var imgM = document.createElement('img');
            var loaded = 0;
            var this2 = this;

            imgM.onload = imgF.onload = function() {
                console.log('   making imageData');
                var can = document.createElement('canvas');
                can.width = this.width;
                can.height = this.height;
                var ctx = can.getContext('2d');
                ctx.drawImage(this, 0, 0);
                this.imgData = ctx.getImageData(0, 0, can.width, can.height);
                console.log(can.toDataURL("image/png"));
                loaded += 1;
                if (loaded >= 2) {
                    this2._setupArrays(this2.flatImg.imgData, this2.moundImg.imgData);
                    this2.find3D();
                    if (callbackA) {
                        callbackA();
                    }
                }
            };

            this.flatImg = imgF;
            this.moundImg = imgM;
            imgF.src = flatImgsrc;
            imgM.src = moundImgsrc;
        },

        find3D2: function() {

            var flood_iterations = 300// max
            var blurBefore = false//I dont like this, probably going to remove it
            var blursAfter = 3//0 for no after blur
            var filterWithEpipole = true //slow, but good for noise

            //find differences
            this.moundProjXY = this.flood(this.moundProjXY, 1)
            this.flatProjXY = this.flood(this.flatProjXY, 1)

            var d1 = this.difference(this.moundProjXY, this.flatProjXY);
            if (filterWithEpipole) {
                var d1 = this.filterDifferences(d1,{max_epipole_dist:3, max_lines:200 })
            }
            //var d1 = this.flood(d1, 1)
            var d = this.flood(this.difference(d1, this.flatProjXY), flood_iterations)
            var c = this.flood(this.difference(d1, this.moundProjXY), flood_iterations)
            if (blurBefore) {
                c = this.blur(c)
                d = this.blur(d)
            }
            var e = this.difference(c, d)
            for( var i=0; i < blursAfter; i++){
                e = this.blur(e)
            }
            this.differencesXY = e //this.moundProjXY //d1

        },
           find3D: function() {
            var flood_iterations = 100// max
            var blurBefore = false//I dont like this, probably going to remove it
            var blursAfter = 0//0 for no after blur
            var filterWithEpipole = true //slow, but good for noise

            //find differences
            this.moundProjXY = this.flood(this.moundProjXY, 1)
            this.flatProjXY = this.flood(this.flatProjXY, 1)

            var d1 = this.difference(this.moundProjXY, this.flatProjXY);
            if (filterWithEpipole) {
                var d1 = this.filterDifferences(d1,{max_epipole_dist:20, max_lines:300 , min_dist:1.5, max_dist:70})
            }
            var d2 = this.flood(d1, flood_iterations)
            var e = d2
            for( var i=0; i < blursAfter; i++){
                e = this.blur(e)
            }
            this.differencesXY = e //this.moundProjXY //d1

        },


        _setupArrays: function(flatImgData, moundImgData) {
            console.log("   threeDiScan setting up arrays");

            var start = new Date().getTime();

            this.camWid = flatImgData.width;
            this.camHei = flatImgData.height;

            this.flatProjXY = this._fillerProj(flatImgData);
            this.moundProjXY = this._fillerProj(moundImgData);
            this.flatCamXY = this._fillerCam(flatImgData);
            this.moundCamXY = this._fillerCam(moundImgData);

            var end = new Date().getTime();
            console.log('   threeDiScan, array setup took ', end - start, ' ms');
        },

        //
        //  Convert rgb encode image to a projector to camera lookup table
        //
        _fillerProj: function(imgdata) {
            var w = this.projWid;
            var h = this.projHei;
            var result = [new Int32Array(w * h), new Int32Array(w * h)];

            var width = imgdata.width;
            var height = imgdata.height;
            var data = imgdata.data;

            for (var y = 0; y < height; y += 1) {
                for (var x = 0; x < width; x += 1) {
                    var baseIndex = ((y * width) + x) * 4;
                    var r = data[baseIndex];
                    var g = data[baseIndex + 1];
                    var b = data[baseIndex + 2];

                    var projectorX = this.rgb2Xcoord(r, g, b); //((r << 4) & 0x0FF0) | ((g >> 4) & 0x000F);
                    var projectorY = this.rgb2Ycoord(r, g, b); //((g << 8) & 0x0F00) | (b & 0x00FF);
                    var projIndex = projectorY * this.projWid + projectorX;
                    if (projectorX != this.NODATA_VALUE && projectorY != this.NODATA_VALUE) {
                        if (projectorX < w && projectorY < h && projectorX > 0 && projectorY > 0) {
                            result[0][projIndex] = x;
                            result[1][projIndex] = y;
                        }
                    }
                }
            }

            for (var i = 0; i < result[0].length; i++) {
                if (result[0][i] == 0 && result[1][i] == 0) {
                    result[0][i] = result[1][i] = this.NODATA_VALUE
                }
            }

            result.width = w;
            result.height = h;

            return result;
        },

        //
        // convert the rgb into numbers. I find this much easier to work with
        //
        _fillerCam: function(imgdata) {
            var width = imgdata.width;
            var height = imgdata.height;
            var data = imgdata.data;
            var result = [new Int32Array(width * height), new Int32Array(width * height)];

            for (var y = 0; y < height; y += 1) {
                for (var x = 0; x < width; x += 1) {
                    var baseIndex = ((y * width) + x) * 4;
                    var r = data[baseIndex];
                    var g = data[baseIndex + 1];
                    var b = data[baseIndex + 2];

                    var projectorX = this.rgb2Xcoord(r, g, b); //((r << 4) & 0x0FF0) | ((g >> 4) & 0x000F);
                    var projectorY = this.rgb2Ycoord(r, g, b);
                    result[0][y * width + x] = projectorX;
                    result[1][y * width + x] = projectorY;
                    if (projectorX == 0 && projectorY == 0) {
                        result[0][y * width + x] = result[1][y * width + x] = this.NODATA_VALUE
                    }
                }
            }

            result.width = width;
            result.height = height;

            return result;
        },

        rgb2Xcoord: function(r, g, b) {
            return ((r << 4) & 0x0FF0) | ((g >> 4) & 0x000F);
        },

        rgb2Ycoord: function(r, g, b) {
            return ((g << 8) & 0x0F00) | (b & 0x00FF);
        },

        difference: function(xyarrayA, xyarrayB, wid, hei) {
            var start = new Date().getTime();
            var dim = this.checkDimensions(xyarrayA, wid, hei);
            wid = dim[0];
            hei = dim[1];

            var MINVAL = -200;
            var MAXVAL = 600;
            var A = xyarrayA;
            var B = xyarrayB;
            var diff = [new Int32Array(xyarrayA[0].length), new Int32Array(xyarrayA[0].length)];

            var nd = this.NODATA_VALUE
            for (var i = 0; i < diff[0].length; i++) {

                if ((B[0][i] == nd || A[0][i] == nd) || (B[1][i] == nd || A[1][i] == nd)) {
                    diff[0][i] = diff[1][i] = nd
                } else {
                    diff[0][i] = A[0][i] - B[0][i];
                    diff[1][i] = A[1][i] - B[1][i];
                }
            }

            diff.width = wid;
            diff.height = hei;
            var end = new Date().getTime();
            console.log('  difference took', end - start, 'ms');
            return diff;
        },

        flood: function(xyarray, iterations, wid, hei) {
            var dim = this.checkDimensions(xyarray, wid, hei);
            wid = dim[0];
            hei = dim[1];

            var start = new Date().getTime();
            var len = xyarray[0].length;
            var res1 = [new Int32Array(len), new Int32Array(len)];
            var Xa = res1[0];
            var Ya = res1[1];
            var seeds1 = [];
            var seeds2 = [];
            var mOffsets = [
                [0, -1],
                [1, 0],
                [0, 1],
                [-1, 0]
            ];

            var abs = Math.abs

            for (var i = 0; i < len; i++) {
                Xa[i] = xyarray[0][i];
                Ya[i] = xyarray[1][i];
                if (Xa[i] != this.NODATA_VALUE && Ya[i] != this.NODATA_VALUE) {
                    seeds1.push(i);
                }
            }

            console.log('seeds:', seeds1.length);

            var nd = this.NODATA_VALUE

            for (var it = 0; it < iterations && seeds1.length > 0; it++) {
                for (i = 0; i < seeds1.length; i++) {
                    var index1 = seeds1[i];
                    var y1 = Math.floor(index1 / wid);
                    var x1 = index1 % wid;
                    for (var j = 0; j < mOffsets.length; j++) {
                        var offset = mOffsets[j];
                        var x2 = x1 + offset[0];
                        var y2 = y1 + offset[1];
                        var index2 = y2 * wid + x2;
                        if (x2 >= 0 && x2 < wid  && y2 >= 0 && y2 < hei ) {
                            var p1x = Xa[index1];
                            var p1y = Ya[index1];
                            var p2x = Xa[index2];
                            var p2y = Ya[index2];
                            if ((p1x != nd && p1y != nd) && (p2x == nd || p2y == nd)) {
                                Xa[index2] = p1x;
                                Ya[index2] = p1y;
                                seeds2.push(index2);
                            }
                        }
                    }
                }
                //console.log(it, ' count ', seeds2.length)
                seeds1 = seeds2;
                seeds2 = [];
            }

            var end = new Date().getTime();
            console.log('  iterations ', it, '  flood took', end - start, 'ms', ' seeds left', seeds1.length);

            res1.width = wid;
            res1.height = hei;

            return res1;
        },

        blur: function(xyarray, width, height) {
            var dim = this.checkDimensions(xyarray, width, height);
            width = dim[0];
            height = dim[1];

            var start = new Date().getTime();
            var len = xyarray[0].length;
            var res1 = [new Float32Array(len), new Float32Array(len)];
            var res2 = [new Float32Array(len), new Float32Array(len)];
            var Xa = res1[0];
            var Ya = res1[1];

            var kernel1D = new Float32Array([0.05, 0.09, 0.12, 0.15, 0.16, 0.15, 0.12, 0.09, 0.05]);
            //kernel1D = [0.1,0.2,0.4,0.2,0.1]
            var mid = Math.floor(kernel1D.length / 2);
            //do x
            for (var i = mid * width; i < len - mid * width; i++) {
                var vx = 0;
                var vy = 0;
                if (xyarray[0][i] != this.NODATA_VALUE) {
                    for (var k = 0; k < kernel1D.length; k++) {
                        var i2 = i + (k - mid) * width;
                        vx += xyarray[0][i2] * kernel1D[k];
                        vy += xyarray[1][i2] * kernel1D[k];
                    }
                }
                res1[0][i] = vx;
                res1[1][i] = vy;
            }
            //do y
            for (i = mid * width; i < len - mid * width; i++) {
                var vx = 0;
                var vy = 0;
                if (xyarray[0][i] != this.NODATA_VALUE) {
                    for (var k = 0; k < kernel1D.length; k++) {
                        var i2 = i + (k - mid);
                        vx += res1[0][i2] * kernel1D[k];
                        vy += res1[1][i2] * kernel1D[k];
                    }
                }
                res2[0][i] = vx;
                res2[1][i] = vy;
            }

            var end = new Date().getTime();
            console.log('blur took', end - start, 'ms');
            res2.width = width;
            res2.height = height;

            return res2;
        },

        hsvToRgb: function(h, s, v) {
            var r, g, b;

            var i = Math.floor(h * 6);
            var f = h * 6 - i;
            var p = v * (1 - s);
            var q = v * (1 - f * s);
            var t = v * (1 - (1 - f) * s);

            switch (i % 6) {
                case 0:
                    r = v, g = t, b = p;
                    break;
                case 1:
                    r = q, g = v, b = p;
                    break;
                case 2:
                    r = p, g = v, b = t;
                    break;
                case 3:
                    r = p, g = q, b = v;
                    break;
                case 4:
                    r = t, g = p, b = v;
                    break;
                case 5:
                    r = v, g = p, b = q;
                    break;
            }

            return [r * 255, g * 255, b * 255];
        },

        drawdata: function(canvas, data, width, height, clamp, colorSteps) {
            //
            // this is basically tuned to the sand table.
            //
            var maxDisp = 6;
            var min = Number.MAX_VALUE;
            var max = Number.MIN_VALUE;

            if( !colorSteps){
                colorSteps = 70
            }

            var dim = this.checkDimensions(data, width, height);
            width = dim[0];
            height = dim[1];

            canvas.width = width;
            canvas.height = height;
            var ctx = canvas.getContext('2d');
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            var projImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            var imgdata = projImageData.data;

            //clamp = true
            for (var i = 0; i < data[0].length; i++) {
                var mIndex = 4 * i;
                var da = data[0][i];
                var db = data[1][i];
                var dm = db; //Math.sqrt(da * da + db * db)
                var h;
                if (clamp) {
                    h = ((dm / maxDisp)); //just look at y displacement
                    //if (Math.sqrt(db * db + da * da) > 20) {
                    //    h = 0.3;
                    //}
                    //h = Math.min(1, Math.max(0, h));
                    h = (h + 0.4)
                    h = Math.floor(h * colorSteps) / colorSteps;
                    h = Math.min(0.80, Math.max(0, h));
                    var rgb = this.hsvToRgb(h, 1, 1);
                    //if (da + db > 0 ) {
                    imgdata[mIndex + 3] = 255;
                    imgdata[mIndex + 2] = rgb[2]; //0//dm
                    imgdata[mIndex + 1] = rgb[1]; //(db/maxDisp)*255
                    imgdata[mIndex] = rgb[0]; //0//(da + db) * 4;
                } else {
                    //h = (Math.sqrt(da * da + db * db) / 50 + 0.3) % 1;
                     h = (1.7 - (dm / maxDisp + 0.3)) % 1; //just look at y displacement
                    h = Math.floor(h * colorSteps) / colorSteps;
                    var rgb = this.hsvToRgb(h, 1, 1);
                    //if (da + db > 0 ) {
                    imgdata[mIndex + 3] = 255;
                    imgdata[mIndex + 2] = rgb[2]; //0//dm
                    imgdata[mIndex + 1] = rgb[1]; //(db/maxDisp)*255
                    imgdata[mIndex] = rgb[0]; //0//(da + db) * 4;
                    if (da == this.NODATA_VALUE || db == this.NODATA_VALUE) {
                        imgdata[mIndex + 3] = 255
                        imgdata[mIndex + 2] = imgdata[mIndex + 1] = imgdata[mIndex] = 255; //0//(da + db) * 4;
                    }
                    /*
                    imgdata[mIndex + 3] = 255;
                    imgdata[mIndex + 2] = 3 * d; //0//dm
                    imgdata[mIndex + 1] = 6 * d; //(db/maxDisp)*255
                    imgdata[mIndex] = 12 * d; //0//(da + db) * 4;
                    */
                }

                //var h2 = Math.sin(h * Math.PI / 2)

                //}
                min = Math.min(dm, min);
                max = Math.max(dm, max);
            }

            console.log('max value', max, 'min', min);
            ctx.putImageData(projImageData, 0, 0);
        },

        checkDimensions: function(xyarray, width, height) {
            if (xyarray.width) {
                width = xyarray.width;
                //console.log('found width', wid)
            }
            if (xyarray.height) {
                height = xyarray.height;
                //console.log('found height', hei)
            }
            if (height * width != xyarray[0].length) {
                console.warn('dimension mismatch', width, '*', height, '!=', xyarray[0].length);
            }
            return [width, height];
        },

        //
        //  Utilities
        //
        findPointsDistFromLine: function(E, p1, p2) {
            var a = numeric.sub(p2, p1)
            var b = numeric.sub(E, p1)
            var theta = Math.acos(numeric.dot(a, b) / (numeric.norm2(a) * numeric.norm2(b)))
            var dst = Math.sin(theta) * numeric.norm2(b)
            return dst || Number.MAX_VALUE
        },

        shuffleArray: function(array) {
            for (var i = array.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var temp = array[i];
                array[i] = array[j];
                array[j] = temp;
            }
            return array;
        },

        //  tries to find the epipole and ignore noisy points
        ransacTheLines: function(dat, threshold, max_dist, iterations, p1) {
            console.log('RANSAC', arguments)
            var bestInlier = 0
            var bestXY = [0, 0]
            for (var n = 0; n < iterations; n++) {
                var x = Math.random() * max_dist - max_dist / 2
                var y = Math.random() * max_dist - max_dist / 2
                var xy = [p1[0] + x, p1[1] + y]

                var inliers = 0
                for (var i = 0; i < dat.length; i++) {
                    var d = dat[i]
                    var dist = this.findPointsDistFromLine(xy, d[0], d[1]) //numeric.norm2( numeric.sub(xy, d))
                    if (dist < threshold) {
                        inliers++
                    }
                }
                if (inliers > bestInlier) {
                    bestInlier = inliers
                    bestXY = xy
                }
            }
            console.log('ransac lines results:', bestXY, bestInlier)
            return {
                'xy': bestXY,
                'score': inliers
            }
        },

        //
        findMovementLinesInCamera: function(minDist, maxDist) {
            if (!minDist) {
                minDist = 3
            }
            if (!maxDist) {
                maxDist = this.projWid
            }
            var lines = []
            //var max_number_of_lines =
            var nd = this.NODATA_VALUE
            for (var x = 0; x < this.projWid; x = x + 5) {
                for (var y = 0; y < this.projHei; y = y + 5) {
                    var projIndex = y * this.projWid + x
                    var start = [this.flatProjXY[0][projIndex], this.flatProjXY[1][projIndex]]
                    var end = [this.moundProjXY[0][projIndex], this.moundProjXY[1][projIndex]]
                    var dist = numeric.norm2(numeric.sub(start, end))
                    if (start[0] > 0 && start[1] > 0 && end[0] > 0 && end[1] > 0 && start[0] != end[0] && start[1] != end[1]) {
                        if (dist > minDist && dist < maxDist) {
                            if (start[0] != nd && start[1] != nd && end[0] != nd && end[1] != nd) {
                                lines.push([start, end])
                            }
                        }
                    }
                }
            }
            console.log(lines)
            return lines
        },

            //
            //  find the intersection beteen 2 lines . p1 and p2 define the first line, and p3,p4 define the second line
            //
            findIntersection: function(p1, p2, p3, p4) {
                x_1 = p1[0]
                y_1 = p1[1]
                x_2 = p2[0]
                y_2 = p2[1]
                x_3 = p3[0]
                y_3 = p3[1]
                x_4 = p4[0]
                y_4 = p4[1]
                point_x = ((x_1 * y_2 - y_1 * x_2) * (x_3 - x_4) - (x_1 - x_2) * (x_3 * y_4 - y_3 * x_4)) / ((x_1 - x_2) * (y_3 - y_4) - (y_1 - y_2) * (x_3 - x_4))
                point_y = ((x_1 * y_2 - y_1 * x_2) * (y_3 - y_4) - (y_1 - y_2) * (x_3 * y_4 - y_3 * x_4)) / ((x_1 - x_2) * (y_3 - y_4) - (y_1 - y_2) * (x_3 - x_4))
                return [point_x, point_y]
            },

            findManyIntersections: function(lines) {
                var res = []
                console.log('finding intersections')
                // find the intersections
                //
                for (var i = 0; i < 50; i++) {
                    for (var j = i; j < 50; j = j + 1) {
                        var p1 = lines[i][0]
                        var p2 = lines[i][1]
                        var p3 = lines[j][0]
                        var p4 = lines[j][1]
                        var d1 = numeric.norm2(numeric.sub(p1, p2))
                        var d2 = numeric.norm2(numeric.sub(p3, p4))
                        if (d1 > 2 && d2 > 2 && d1 < 600 && d2 < 600) {
                            pt = this.findIntersection(p1, p2, p3, p4)
                            if (isFinite(pt[0]) && isFinite(pt[1])) { //not parallel
                                res.push(pt)
                            }
                        }
                    }
                }

                var mean = jStat(res).mean()
                var median = jStat(res).median()
                var stdev = jStat(res).stdev()
                return {results:res, mean:mean, median:median, stdev:stdev}
            },
        //
        filterDifferences: function(diffs,options) {
            var max_lines = 100
            var max_epipole_dist = 10
            var min_dist = 2
            var max_dist = 1000000
            if(!options){
                options = {}
            }
            if( options.max_lines >= 0){
                max_lines = options.max_lines
            }
              if( options.max_epipole_dist >= 0){
                max_epipole_dist = options.max_epipole_dist
            }
            if( options.min_dist >= 0){
                min_dist = options.min_dist
            }
            if( options.max_dist >= 0){
                max_dist = options.max_dist
            }
            var lines = this.findMovementLinesInCamera()
            if (lines.length > max_lines) {
                lines = this.shuffleArray(lines)
                lines = lines.slice(0, max_lines)
                console.log('too many lines')
            }
            else{
                console.log('not enough lines', lines.length)
                return diffs
            }

            var inters = this.findManyIntersections(lines)
            console.log(inters)
            var ranXY = this.ransacTheLines(lines, 15, 800, 2000, inters.median)
            var ranXY = this.ransacTheLines(lines, 10, 200, 400, ranXY.xy)
            var ranXY = this.ransacTheLines(lines, 5, 20, 80, ranXY.xy)

            var len = diffs[0].length
            var result = [new Int32Array(diffs[0].length), new Int32Array(diffs[0].length)]
            var thrownOutForMag = 0
            var thrownOutForEpipole = 0
            var thrownNodata = 0
            var notThrownOut = len
            var nd = this.NODATA_VALUE
            for (var i = 0; i < len; i++) {
                result[0][i] = diffs[0][i]
                result[1][i] = diffs[1][i]
                var dist = numeric.norm2([diffs[0][i], diffs[1][i]])
                var distfromepipole = this.findPointsDistFromLine(ranXY.xy, [this.moundProjXY[0][i], this.moundProjXY[1][i]], [this.flatProjXY[0][i], this.flatProjXY[1][i]])
                if( diffs[0][i] == nd || diffs[1][i] == nd){
                    result[0][i] = this.NODATA_VALUE
                    result[1][i] = this.NODATA_VALUE
                    thrownNodata ++
                    notThrownOut --
                }
                else if (dist < min_dist) {
                    result[0][i] = diffs[0][i] //this.NODATA_VALUE
                    result[1][i] = diffs[1][i] //this.NODATA_VALUE
                    thrownOutForMag++
                    notThrownOut--
                }
                else if( dist > max_dist){
                    result[0][i] = this.NODATA_VALUE
                    result[1][i] = this.NODATA_VALUE
                    thrownOutForMag++
                    notThrownOut--
                }
                else if (distfromepipole > max_epipole_dist) {
                    result[0][i] = this.NODATA_VALUE
                    result[1][i] = this.NODATA_VALUE
                    thrownOutForEpipole++
                    notThrownOut--
                }
            }
            console.log('thrown out for  Magnitude:', thrownOutForMag, 'epipolar constraint', thrownOutForEpipole, 'no data', thrownNodata, ". not thrown out", notThrownOut)
            result.width = diffs.width
            result.height = diffs.height
            return result
        },




        /*

     Interactions with the extension
     Im not sure if these really belong here or not
     */
        flatScan: function(flatDoneCallback) {
            var this2 = this;
            AnySurface.Laser.calib(function() { //uggh callback hell
                AnySurface.Laser.getCorr(function(dataurl) {
                    console.log('flat callback called');
                    this2.flatImg.src = String(dataurl);
                    if (flatDoneCallback) {
                        flatDoneCallback();
                    }
                });
            });
        },

        mountainScan: function(mountainDoneScan) {
            var this2 = this;
            AnySurface.Laser.calib(function() {
                AnySurface.Laser.getCorr(function(dataurl) {
                    this2.moundImg.src = dataurl;
                    this2.setup(this2.flatImg.src, this2.moundImg.src, function() {
                        if (mountainDoneScan) {
                            mountainDoneScan(this2.differencesXY);
                        }
                    });
                });
            });
        }
    };
}();
