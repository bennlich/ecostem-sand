
export class EpinodeEstimate {
    constructor(diffRaster) {
        this.diffRaster = diffRaster;
        /* Bounding box defined by NW and SE points within the raster.
           We assume all the data in this bounding box is positive height data.
           A possible interaction is to draw the box, tell the user to make a
           mountain in the box, and do a scan. */
        this.x0 = 31;
        this.y0 = 64;
        this.x1 = 40;
        this.y1 = 71;
        /* This is where we store the overall angle of the difference vectors
           within the box above. */
        this.heightAngle = null;
    }

    /* Estimate the overall angle of the difference vectors within the box */
    _estimate() {
        var angle = 0,
            numAngles = 0;

        for (var x = this.x0; x <= this.x1; ++x) {
            for (var y = this.y0; y <= this.y1; ++y) {
                var cell = this.diffRaster.data[x][y];
                if (cell.list && cell.list.length > 0) {
                    /* We assume the first element of the "opinion" list to
                       be the best choice for the "before" position.
                       TODO: rewrite diff raster to make this more clear. */
                    var before = cell.list[0],
                        dx = x - before.x,
                        dy = y - before.y;
                    /* The angle of the diff vector */
                    var theAngle = Math.atan2(dy, dx) * 180/Math.PI;

                    if (theAngle > 0) {
                        angle += theAngle;
                        numAngles++;
                    }
                }
            }
        }

        if (numAngles === 0) {
            throw new Error("No displacements were found in the given rect.");
        }

        /* Set the "overall angle" to the average of all the angles within the
           bounding box. */
        this.heightAngle = angle/numAngles;
    }

    /* Determines if the cell at data[x][y] is a height cell or a depression cell.
       If it is within 90 degrees on either side of heightAngle, it's determined
       to be positive height. Otherwise, it's a depression */
    _isHeight(x,y) {
        var cell = this.diffRaster.data[x][y];

        if (cell.list && cell.list.length > 0) {
            var before = cell.list[0],
                dx = x - before.x,
                dy = y - before.y;

            var theAngle = Math.atan2(dy, dx) * 180/Math.PI;
            var angleDiff = (this.heightAngle - theAngle + 180) % 360 - 180;

            return angleDiff <= 90 && angleDiff >= -90;
        } else {
            return false;
        }
    }

    /* Normalize the height data to be all-positive numbers, where the smallest
       number is in the deepest depression. Also remember the "zero value" --
       the value that used to be "0" prior to normalization. */
    writeNormalizedHeights() {
        this._estimate();

        var min = 1000000, x, y;

        for (x = 0; x < this.diffRaster.width; ++x) {
            for (y = 0; y < this.diffRaster.height; ++y) {
                var val = this.diffRaster.data[x][y].diffValue;
                /* If it's a height, make it negative */
                if (! this._isHeight(x,y))
                    val = -val;
                /* Compute the min value along the way */
                if (val < min)
                    min = val;

                this.diffRaster.data[x][y].diffValue = val;
            }
        }
        /* Normalize heights -- make everything positive, a delta from the min value.  */
        for (x = 0; x < this.diffRaster.width; ++x) {
            for (y = 0; y < this.diffRaster.height; ++y) {
                this.diffRaster.data[x][y].diffValue = this.diffRaster.data[x][y].diffValue - min;
            }
        }

        /* Record the value previously "0" -- meaning "flat" or "unchanged" */
        this.diffRaster.zeroValue = Math.abs(min);
    }
}
