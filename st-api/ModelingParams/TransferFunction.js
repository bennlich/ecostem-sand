"use strict";

import {Evented} from "../ModelingCore/Evented";

export class TransferFunction {
    constructor(opts) {
        var svgcanID = opts.id || "transfer-function-svg";
        this.width = $('#' + svgcanID).width();
        this.height = $('#' + svgcanID).height();
        this.container = d3.select('#' + svgcanID).append('g');
    }

    extendTransferFunc(tFunc) {
        tFunc.show = function() {
            $(this.container[0]).show();
        };

        tFunc.hide = function() {
            $(this.container[0]).hide();
        };

        // can't think of a better way to make a function
        // inherit the properties of another class
        _.extend(tFunc, Evented.prototype);
        Evented.call(tFunc);
	}
}
