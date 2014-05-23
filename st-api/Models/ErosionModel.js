
import {BaseModel} from '../ModelingCore/BaseModel';
import {PatchRenderer} from '../ModelingCore/PatchRenderer';
import {Gradient} from '../Util/Gradient';

export class ErosionModel extends BaseModel {
    constructor(xs, ys, bbox, modelSet) {
        super(xs, ys, bbox, modelSet);

        this.init({ erosion: 0 });
        this.isAnimated = true;
        this.editable = true;
        this.canPaint = false;
    }

    reset() {
        this.putData(0, 0, this.xSize, this.ySize, { erosion: 0 });
    }
}

export class ErosionPatchRenderer extends PatchRenderer {
    constructor(model) {
        this.model = model;

        var gradientSteps = 200;
        this.negativeGradient = Gradient.gradient('#ffebeb', '#e03838', gradientSteps);
        this.positiveGradient = Gradient.gradient('#dbecff', '#2e7ad1', gradientSteps);

        this.scaleValues = [-20,-10,-5,0,5,10,20];
        this.zeroValue = 0;
        this.patchField = 'erosion';
    }

    color(erosion) {
        var idx = Math.floor(Math.abs(erosion*100));

        if (idx >= this.negativeGradient.length)
            idx = this.negativeGradient.length - 1;

        return erosion >= 0 ? this.positiveGradient[idx] : this.negativeGradient[idx];
    }
}
