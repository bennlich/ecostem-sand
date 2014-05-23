"use strict";

import {BaseModel} from '../ModelingCore/BaseModel';
import {PatchRenderer} from '../ModelingCore/PatchRenderer';

/* Fire severity model inherits from DataModel */

export class FireSeverityModel extends BaseModel {
    constructor(xs, ys, bbox, modelSet) {
        super(xs, ys, bbox, modelSet);
        this.init({ severity: FireSeverityModel.severityTypes.NONE });
    }
}

FireSeverityModel.severityTypes = {
    LOW: 1, MEDIUM: 2, HIGH: 3, NONE: 0
};

FireSeverityModel.typeToString = function(type) {
    var t = FireSeverityModel.severityTypes;
    switch (type) {
    case t.LOW    : return 'Low';
    case t.MEDIUM : return 'Medium';
    case t.HIGH   : return 'High';
    case t.NONE   :
    default       : return 'No Data';
    }
};

/* Renderer for a single fire severity patch */

export class FirePatchRenderer extends PatchRenderer {
    constructor(model) {
        this.model = model;

        var colors = {},
            t = FireSeverityModel.severityTypes;
        colors[t.HIGH] = 'rgb(105,82,58)';
        colors[t.MEDIUM] = 'rgb(173,147,118)';
        colors[t.LOW] = 'rgb(240,217,192)';
        colors[t.NONE] = 'rgb(255,255,255)';

        this.colors = colors;

        this.scaleValues = [t.LOW, t.HIGH, t.MEDIUM, t.NONE];
        this.zeroValue = t.NONE;
        this.patchField = 'severity';
    }

    name(value) {
        return FireSeverityModel.typeToString(value);
    }

    color(value) {
        return this.colors[value];
    }
}
