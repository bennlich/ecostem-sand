
import {BaseModel} from '../ModelingCore/BaseModel';
import {PatchRenderer} from '../ModelingCore/PatchRenderer';
import {Gradient} from '../Util/Gradient';

export class ElevationModel extends BaseModel {
    constructor (xs, ys, bbox, modelSet) {
        super(xs, ys, bbox, modelSet);

        this.init({elevation:0});

        this.min = 1000000;
        this.max = 0;

        this.editable = false;
        this.canPaint = false;
    }

    sampleElevationXY(sampler, x,y) {
        var sampleSpacing = sampler.width / this.xSize;

        var offset = (p) => p * sampleSpacing + Math.floor(sampleSpacing/2);

        return sampler.sample(offset(x), offset(y));
    }

    loadElevation(sampler) {
        for (var i = 0; i < this.xSize; ++i) {
            for (var j = 0; j < this.ySize; ++j) {
                var curPatch = this.world[i][j];
                var e = this.sampleElevationXY(sampler, i,j);

                if (e < this.min)
                    this.min = e;
                if (e > this.max)
                    this.max = e;

                curPatch.elevation = e;
            }
        }
    }
}

export class ElevationPatchRenderer extends PatchRenderer {
    constructor(model) {
        this.model = model;
        this.colorMap = Gradient.multiGradient(
            '#123',
            [{color: '#505Fa5', steps: 40},
             {color: '#D66783', steps: 100},
             {color: '#fff', steps: 100}]
        );
        this.scaleValues = [5, 10, 20, 30, 0];
        this.zeroValue = 0;
        this.patchField = 'elevation';
    }

    color(elevation) {
        var range = this.model.max - this.model.min,
            relativeElevation = elevation - this.model.min,
            metersPerStep = range / this.colorMap.length,
            idx = Math.floor(relativeElevation / metersPerStep);

        return this.colorMap[idx];
    }
}
