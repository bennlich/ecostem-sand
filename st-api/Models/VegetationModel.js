"use strict";

import {BaseModel} from '../ModelingCore/BaseModel';
import {PatchRenderer} from '../ModelingCore/PatchRenderer';

export class VegetationModel extends BaseModel {
    constructor(xs, ys, bbox, modelSet) {
        super(xs, ys, bbox, modelSet);
        this.init({ vegetation: VegetationModel.vegTypes.NONE });
    }
}

VegetationModel.vegTypes = {
    FIR: 'fir', SAGEBRUSH: 'sagebrush', STEPPE: 'steppe', GRASS: 'grass', NONE: 'none'
};

VegetationModel.typeToString = function(type) {
    var t = VegetationModel.vegTypes;
    switch (type) {
    case t.FIR: return 'Fir';
    case t.SAGEBRUSH: return 'Sagebrush';
    case t.STEPPE: return 'Steppe';
    case t.GRASS: return 'Grass';
    case t.NONE:
    default: return 'No Data';
    }
};

export class VegetationPatchRenderer extends PatchRenderer {
    constructor(model) {
        this.model = model;

        var t = VegetationModel.vegTypes;

        var colors = {};
        colors[t.FIR] = 'rgb(50,99,32)';
        colors[t.SAGEBRUSH] = 'rgb(55, 105, 93)';
        colors[t.STEPPE] = 'rgb(214, 173, 84)';
        colors[t.GRASS] = 'rgb(59, 153, 54)';
        colors[t.NONE] = 'rgb(255,255,255)';

        this.colors = colors;
        this.scaleValues = [t.FIR, t.SAGEBRUSH, t.STEPPE, t.GRASS, t.NONE];
        this.zeroValue = t.NONE;
        this.patchField = 'vegetation';
    }

    name(v) {
        return VegetationModel.typeToString(v);
    }

    color(v) {
        return this.colors[v];
    }
}
