
export class EpinodeEstimate {
    constructor() {
        /* This is where we store the overall angle of the difference vectors
           within the box above. */
        this.heightAngle = null;
    }

    /* Estimate the overall angle of the difference vectors within the given bounding box.
       This should be called only once per calibration, to store the epinode estimate.
       After that, you can call writeNormalizedHeightsInto() over and over on new
       DiffRasters. */
    estimateEpinodeDirection(diffRaster, x0, y0, x1, y1) {
        /* Bounding box defined by NW and SE points within the raster.
           Key assumption is that the data in this bounding box is positive height data. */

        var angle = 0,
            numAngles = 0;

        for (var x = x0; x <= x1; ++x) {
            for (var y = y0; y <= y1; ++y) {
                var cell = diffRaster.data[x][y];
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
            console.error("No displacements were found in the given rect.");
            return;
        }

        /* Set the "overall angle" to the average of all the angles within the
           bounding box. */
        this.heightAngle = angle/numAngles;
    }

    /* Determines if the cell at data[x][y] is a height cell or a depression cell.
       If it is within 90 degrees on either side of heightAngle, it's determined
       to be positive height. Otherwise, it's a depression */
    _isHeight(cell) {
        if (cell.list && cell.list.length > 0) {
            var before = cell.list[0],
                dx = cell._x - before.x,
                dy = cell._y - before.y;

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
    writeNormalizedHeightsInto(diffRaster) {
        var min = 1000000,
            /* multiplying factor for elevation -- to make it something closer to meters */
            scale = 200,
            x, y;

        for (x = 0; x < diffRaster.width; ++x) {
            for (y = 0; y < diffRaster.height; ++y) {
                var cell = diffRaster.data[x][y],
                    val = cell.diffValue;
                /* If it's a height, make it negative */
                if (! this._isHeight(cell))
                    val = -val;
                /* Compute the min value along the way */
                if (val < min)
                    min = val;

                diffRaster.data[x][y].diffValue = val;
            }
        }
        /* Normalize heights -- make everything positive, a delta from the min value.  */
        for (x = 0; x < diffRaster.width; ++x) {
            for (y = 0; y < diffRaster.height; ++y) {
                diffRaster.data[x][y].diffValue = scale * (diffRaster.data[x][y].diffValue - min);
            }
        }

        /* Record the value previously "0" -- meaning "flat" or "unchanged" */
        diffRaster.zeroValue = scale * Math.abs(min);
    }
}
