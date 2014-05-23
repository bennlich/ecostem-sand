
import {Rect} from '../Util/Rect';

export class ModelTileRenderer {
    constructor(map, model, patchRenderer) {
        this.map = map;
        this.model = model;
        this.patchRenderer = patchRenderer;
        this.canvasLayer = null;
    }

    getDrawTileClosure(canvas, x, y, zoom) {
        var ctx = canvas.getContext('2d');

        // absolute pixel coordinates of top-left corner of tile
        var tileX = x * canvas.width;
        var tileY = y * canvas.height;

        var canvasRect = new Rect(tileX, tileY, canvas.width, canvas.height);
        var scenarioRect = this.model.geometry.toRect(zoom);

        // the rectangular area of canvas tile that intersects the scenario
        var intersection = canvasRect.intersect(scenarioRect);

        if (intersection === null) {
            // no intersection, nothing to do
            return null;
        }

        // size of a patch in pixels at current zoom
        var patchWidth = scenarioRect.width / this.model.xSize,
            patchHeight = scenarioRect.height / this.model.ySize;

        // minimum size of brush, in pixels (i.e. finest resolution at which to render patches)
        // (really only used when rendering multiple patches in a single brushstroke)
        var paintWidth = patchWidth,
            paintHeight = patchHeight;

        if (paintWidth < patchWidth)
            paintWidth = patchWidth;

        if (paintHeight < patchHeight)
            paintHeight = patchHeight;

        var patchesPerBrushX = paintWidth / patchWidth;
        var patchesPerBrushY = paintHeight / patchHeight;

        // top-left corner of the intersection, relative to
        // the top-left corner of the scenario, in pixels
        var intersectionX = Math.abs(scenarioRect.left - intersection.left); // in range [0, scenarioRect.width]
        var intersectionY = Math.abs(scenarioRect.top - intersection.top); // in range [0, scenarioRect.height]

        // same as above, in world coordinates
        var startWorldX = Math.floor(intersectionX / patchWidth); // in range [0, model.xSize]
        var startWorldY = Math.floor(intersectionY / patchHeight); // in range [0, model.ySize]

        // 1 patch beyond the bottom-right corner of the intersection, in world coordinates
        var endWorldX = Math.floor((intersectionX + intersection.width)/patchWidth)+1; // in range [0, model.xSize+1]
        var endWorldY = Math.floor((intersectionY + intersection.height)/patchHeight)+1; // in range [0, model.ySize+1]

        // coordinates of the top-left patch in this tile, relative to
        // the top-left corner of the tile, in pixels
        var drawStartX = intersection.left - tileX - (intersectionX % paintWidth);
        var drawStartY = intersection.top - tileY - (intersectionY % paintHeight);

        var renderStep = (world) => {
            ctx.clearRect(0,0,canvas.width,canvas.height);

            for (var worldX = startWorldX, p = drawStartX; worldX < endWorldX; worldX += patchesPerBrushX, p += paintWidth) {
                for (var worldY = startWorldY, k = drawStartY; worldY < endWorldY; worldY += patchesPerBrushY, k += paintHeight) {
                    var intWorldX = Math.floor(worldX);
                    var intWorldY = Math.floor(worldY);

                    this.patchRenderer.render(ctx, world, intWorldX, intWorldY, p, k, paintWidth, paintHeight);
                }
            }

            // var imageData = canvas.toDataURL();
            // console.log(imageData);

            // this shows the tile boundaries
            // ctx.strokeStyle = '#888';
            // ctx.strokeRect(0,0,canvas.width,canvas.height);
        };

        return renderStep;
    }

    // putData: function(point, brushSize, value) {
    //     var scenarioScreenWidth = this.model.bbox.pixelWidth(),
    //         scenarioScreenHeight = this.model.bbox.pixelHeight(),

    //         patchSize = scenarioScreenWidth / this.model.xSize,

    //         numPatches = Math.ceil(brushSize / patchSize),

    //         worldX = Math.round(point.x / patchSize - numPatches/2),
    //         worldY = Math.round(point.y / patchSize - numPatches/2);

    //     if (numPatches < 1)
    //         numPatches = 1;

    //     this.model.putData(worldX,worldY,numPatches,numPatches,value);

    //     this.refreshLayer();
    // },

    makeLayer(layerOpts) {
        layerOpts = layerOpts || {};

        this.canvasLayer = L.tileLayer.canvas(layerOpts);

        this.canvasLayer.drawTile = (canvas, tilePoint, zoom) => {
            var renderStep = this.getDrawTileClosure(canvas, tilePoint.x, tilePoint.y, zoom);
            
            this.model.on('change', renderStep);
            
            if (!this.model.isAnimated || !this.model.isRunning) {
                if (renderStep)
                    renderStep(this.model.world);
            }
        };

        this.map.leafletMap.on('zoomstart', () => {
            this.model.off('change');
        });

        this.map.leafletMap.on('layerremove', (e) => {
            if (e.layer === this.canvasLayer) {
                this.model.off('change');
            }
        });

        return this.canvasLayer;
    }
}
