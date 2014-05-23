
import {Rect} from '../Util/Rect';

/* Wrapper for the scenario bounding box. Mainly encapsulates degree-to-pixel
 * translations */
export class ModelBBox {
    constructor(bbox, leafletMap) {
        this.bbox = bbox;
        this.leafletMap = leafletMap;
    }

    calculatePixelBounds(zoom) {
        return {
            ne: this.leafletMap.project(this.bbox.getNorthEast(), zoom),
            sw: this.leafletMap.project(this.bbox.getSouthWest(), zoom)
        };
    }

    pixelWidth(zoom) {
        var bounds = this.calculatePixelBounds(zoom);
        return Math.abs(Math.floor(bounds.ne.x - bounds.sw.x));
    }

    pixelHeight(zoom) {
        var bounds = this.calculatePixelBounds(zoom);
        return Math.abs(Math.floor(bounds.ne.y - bounds.sw.y));
    }

    xOffsetFromTopLeft(zoom) {
        var topLeft = this.leafletMap.getPixelBounds(),
            bounds = this.calculatePixelBounds(zoom);
        return Math.floor(bounds.sw.x - topLeft.min.x);
    }

    yOffsetFromTopLeft(zoom) {
        var topLeft = this.leafletMap.getPixelBounds(),
            bounds = this.calculatePixelBounds(zoom);
        return Math.floor(bounds.ne.y - topLeft.min.y);
    }

    toRect(zoom) {
        var bounds = this.calculatePixelBounds(zoom);
        return new Rect(bounds.sw.x, bounds.ne.y, this.pixelWidth(zoom), this.pixelHeight(zoom));
    }
}
