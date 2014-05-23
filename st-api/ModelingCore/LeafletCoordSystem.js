
/*
    The coord system is an object that exposes two functions:

    commonCoordToModelCoord(commonCoord, model) --> modelCoord
    modelCoordToCommonCoord(modelCoord, model) --> commonCoord

    commonCoord is an object representing a coordinate in the common coordinate system
    modelCoord is an index to a sample in the model, with structure {x:xValue, y:yValue}
*/

export class LeafletCoordSystem {
    constructor (leafletMap) {
        this.leafletMap = leafletMap;
    }

    // currently these conversions go from latlng -> pixel coords -> model coords
    // instead of latlng -> projection coords -> model coords,
    // which would be preferable so that data was equally spaced in a
    // real coordinate system

    // the "stable" version of leaflet (0.7.2) doesn't actually support "unprojecting"
    // from projection coords (though the bleeding edge version does)

    // stable 0.7.2: https://github.com/Leaflet/Leaflet/blob/v0.7.2/src/geo/crs/CRS.js
    // bleeding edge 0.8-dev: https://github.com/Leaflet/Leaflet/blob/master/src/geo/crs/CRS.js

    commonCoordToModelCoord(latlng, model) {
        var zoom = 15,
            bbox = model.geometry,
            point = this.leafletMap.project(latlng, zoom),
            origin = this.leafletMap.project(bbox.bbox.getNorthWest(), zoom),
            bboxWidth = bbox.pixelWidth(zoom),
            bboxHeight = bbox.pixelHeight(zoom);

        var pixelX = point.x - origin.x,  // pixel coordinates, relative to origin
            pixelY = point.y - origin.y;

        var patchWidth = bboxWidth / model.xSize, // in pixels
            patchHeight = bboxHeight / model.ySize;

        var x = Math.floor(pixelX / patchWidth),
            y = Math.floor(pixelY / patchHeight);

        return {x:x, y:y};
    }

    modelCoordToCommonCoord(xy, model) {
        var zoom = 15,
            bbox = model.geometry,
            origin = this.leafletMap.project(bbox.bbox.getNorthWest(), zoom),
            bboxWidth = bbox.pixelWidth(zoom),
            bboxHeight = bbox.pixelHeight(zoom);

        var patchWidth = bboxWidth / model.xSize, // in pixels
            patchHeight = bboxHeight / model.ySize;

        var pixelX = xy.x * patchWidth, // pixel coordinates, relative to origin
            pixelY = xy.y * patchHeight;

        var point = new L.Point(origin.x + pixelX, origin.y + pixelY);

        return this.leafletMap.unproject(point, zoom);
    }

    // Ideally, the above functions would look
    // more like the following:

    // (note that the projection is easy to swap out)

    // commonCoordToModelCoord: function(latlng, crsName, origin, sampleWidth, sampleHeight) {
    // 	// e.g. crsName = "EPSG3857";
    // 	var crs = L.CRS[crsName], // proj4js could go here instead of Leaflet
    // 		point = crs.project(latlng);

    // 	// the rest of the math could be done inside of DataModel,
    // 	// since samples of DataModel are presumably equally distributed
    // 	// in its own coordinate system

    //     var xCoord = point.x - origin.x, // crs coordinates, relative to model origin
    //         yCoord = point.y - origin.y;

    //     var modelX = Math.floor(xCoord / sampleWidth),
    //         modelY = Math.floor(yCoord / sampleHeight);

    //     return { x: modelX, y: modelY };
    // },

    // modelCoordToCommonCoord: function(xy, crsName, origin, sampleWidth, sampleHeight) {
    // 	var crs = L.CRS[crsName];

    // 	// crs coordinates, relative to model origin
    // 	var xCoord = xy.x * sampleWidth,
    // 	    yCoord = xy.y * sampleHeight;

    // 	// crs coordinates, relative to crs origin
    // 	var point = new L.Point(origin.x + xCoord, origin.y + yCoord);

    // 	return crs.unproject(point);
    // }
}
