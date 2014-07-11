import {Gradient} from '../st-api/Util/Gradient';
import {BaseModel} from '../st-api/ModelingCore/BaseModel';
import {PatchRenderer} from '../st-api/ModelingCore/PatchRenderer';

export class ScanElevationModel extends BaseModel {
    constructor(xs, ys, geometry, modelPool) {
        super(xs, ys, geometry, modelPool);
        this.init([{ name: "elevation", type: "float4", value: 0 }]);

        this.min = 1000000;
        this.max = -1000000;
    }
    loadFromRaster(raster) {
        console.log(raster);
        if (raster.width !== this.width || raster.height !== this.height) {
            console.error('raster differs from model', raster.width, raster.height, this.width, this.height);
        }

        for (var i = 0; i < this.width; ++i) {
            for (var j = 0; j < this.height; ++j) {
                var patch = raster.data[i][j];
                var elev = patch.diffValue;

                this.set('elevation', i, j, elev);
                
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
        return Gradient.hsvToRgb(0.8*(1-(value-this.model.min)/variance), 1, 1);
    }
}
