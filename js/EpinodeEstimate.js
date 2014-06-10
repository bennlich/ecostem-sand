
export class EpinodeEstimate {
    constructor(diffRaster) {
        this.diffRaster = diffRaster;
        this.x0 = 31;
        this.y0 = 64;
        this.x1 = 40;
        this.y1 = 71;
        this.heightAngle = null;
    }

    estimate() {
        var angle = 0,
            numAngles = 0;

        for (var x = this.x0; x <= this.x1; ++x) {
            for (var y = this.y0; y <= this.y1; ++y) {
                var cell = this.diffRaster.data[x][y];
                if (cell.list && cell.list.length > 0) {
                    var choice = cell.list[0],
                        beforeX = choice.x,
                        beforeY = choice.y,
                        afterX = x,
                        afterY = y,
                        dx = afterX - beforeX,
                        dy = afterY - beforeY;

                    var theAngle = Math.atan2(dy, dx) * 180/Math.PI;

                    if (theAngle > 0) {
                        angle += theAngle;
                        numAngles++;
                        console.log(theAngle);
                    }
                }
            }
        }

        if (numAngles === 0) {
            throw new Error("No displacements were found in the given rect.");
        }

        this.heightAngle = angle/numAngles;
    }

    write() {
        var min = 1000000, x, y;
        for (x = 0; x < this.diffRaster.width; ++x) {
            for (y = 0; y < this.diffRaster.height; ++y) {
                var val = this.diffRaster.data[x][y].diffValue;

                if (! this.isHeight(x,y))
                    val = -val;

                if (val < min)
                    min = val;

                this.diffRaster.data[x][y].diffValue = val;
            }
        }

        for (x = 0; x < this.diffRaster.width; ++x) {
            for (y = 0; y < this.diffRaster.height; ++y) {
                this.diffRaster.data[x][y].diffValue = this.diffRaster.data[x][y].diffValue - min;
            }
        }

        return Math.abs(min);
    }

    isHeight(x,y) {
        var cell = this.diffRaster.data[x][y];

        if (cell.list && cell.list.length > 0) {
            var choice = cell.list[0],
                dx = x - choice.x,
                dy = y - choice.y;

            var theAngle = Math.atan2(dy, dx) * 180/Math.PI;
            var angleDiff = (this.heightAngle - theAngle + 180) % 360 - 180;

            return angleDiff <= 90 && angleDiff >= -90;
        } else {
            return false;
        }
    }
}
