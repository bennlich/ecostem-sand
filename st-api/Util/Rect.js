/*
 * Generic rectangle utility
 */

export class Rect {
    constructor(left,top,width,height) {
        this.left = left;
        this.top = top;
        this.width = width;
        this.height = height;
    }

    intersect(rect) {
        var x0 = Math.max(this.left, rect.left);
        var x1 = Math.min(this.left + this.width, rect.left + rect.width);

        if (x0 <= x1) {
            var y0 = Math.max(this.top, rect.top);
            var y1 = Math.min(this.top + this.height, rect.top + rect.height);

            if (y0 <= y1) {
                return new Rect(x0, y0, x1-x0, y1-y0);
            }
        }
        return null;
    }
}
