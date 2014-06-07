import {Gradient} from '../st-api/Util/Gradient';
import {BaseModel} from '../st-api/ModelingCore/BaseModel';
import {PatchRenderer} from '../st-api/ModelingCore/PatchRenderer';

export class ScanElevationModel extends BaseModel {
    constructor(xs, ys, geometry, modelPool) {
        super(xs, ys, geometry, modelPool);
        this.init({elevation:0});

        this.min = 1000000;
        this.max = -1000000;
    }
    loadFromRaster(raster) {
        console.log(raster);
        if (raster.width !== this.xSize || raster.height !== this.ySize) {
            console.error('raster differs from model', raster.width, raster.height, this.xSize, this.ySize);
        }
        for (var i = 0; i < this.xSize; ++i) {
            for (var j = 0; j < this.ySize; ++j) {
                var patch = raster.data[i][j];
                var elev = Math.abs(patch.x)+Math.abs(patch.y);

                this.world[i][j].elevation = elev;
                if (elev < this.min) {
                    this.min = elev;
                }
                if (elev > this.max) {
                    this.max = elev;
                }
            }
        }
        console.log(this.min, this.max);
    }
}

export class ScanElevationPatchRenderer extends PatchRenderer {
    constructor(elevModel) {
        super();
        this.model = elevModel;
        this.patchField = 'elevation';
        this.zeroValue = undefined;
    }
    color(value) {
        var variance = this.model.max - this.model.min;
        return Gradient.hsvToRgb((1-value/variance)*0.8, 1, 1);
    }
}
