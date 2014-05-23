"use strict";

import {SplineControl} from './SplineControl';
import {StackedBarsControl} from './StackedBarsControl';

export var TransferFunctions = {
    init: function() {
        this.activeFunction = null;
        this.funs = {};

        this.funs.slopeToVelocity = (function() {
            var slopeToVelocity = new SplineControl({
                title: 'Flow velocity vs. slope',
                domain: [0, 50],
                domainTitle: 'degrees',
                range: [0, 100],
                rangeTitle: 'cm / s'
            });
            slopeToVelocity.setControlPoints([[0.00,40.71],[11.25,43.93],[23.93,53.21],[35.00,69.64],[42.86,89.29],[50.00,100.00]]);
            return slopeToVelocity;
        })();

        this.funs.evapInfRunoff = new StackedBarsControl({
            domain: ['No Data', 'Low', 'Medium', 'High'],
            domainTitle: 'Burn Severity',
            range: ['Evaporation', 'Infiltration', 'Runoff'],
            rangeTitle: 'Percentage of Water Volume'
        });

        this.funs.fir = (function() {
            var fir = new SplineControl({
                title: 'Fir Density at Elevation',
                domain: [0, 4000],
                domainTitle: 'm',
                range: [0, 100],
                rangeTitle: '%'
            });
            fir.setControlPoints([[0.00,0.00],[1171.43,0.00],[2028.57,4.29],[2600.00,28.57],[3171.43,3.21],[4000.00,0.00]]);
            return fir;
        })();

        this.funs.sagebrush = (function() {
            var sagebrush = new SplineControl({
                title: 'Sagebrush Density at Elevation',
                domain: [0, 4000],
                domainTitle: 'm',
                range: [0, 100],
                rangeTitle: '%'
            });
            sagebrush.setControlPoints([[0.00,0.00],[1028.57,1.43],[2028.57,2.86],[2600.00,53.93],[3171.43,5.71],[4000.00,0.00]]);
            return sagebrush;
        })();

        this.funs.steppe = (function() {
            var steppe = new SplineControl({
                title: 'Steppe Density at Elevation',
                domain: [0, 4000],
                domainTitle: 'm',
                range: [0, 100],
                rangeTitle: '%'
            });
            steppe.setControlPoints([[0.00,0.00],[1000.00,0.00],[2285.71,0.00],[2857.14,4.29],[3428.57,49.64],[4000.00,0.00]]);
            return steppe;
        })();

        this.funs.grass = (function() {
            var grass = new SplineControl({
                title: 'Grass Density at Elevation',
                domain: [0, 4000],
                domainTitle: 'm',
                range: [0, 100],
                rangeTitle: '%'
            });
            grass.setControlPoints([[0.00,0.00],[1028.57,1.43],[1857.14,23.57],[2500.00,5.00],[3071.43,0.00],[3642.86,0.00]]);
            return grass;
        })();

        this.funs.velocityToErosion = (function() {
            var velocityToErosion = new SplineControl({
                title: 'Erosion vs. Water Speed',
                domain: [0, 100],
                domainTitle: 'cm/s',
                range: [0, 1],
                rangeTitle: 'm'
            });
            velocityToErosion.setControlPoints([[0,0],[20,0.2],[40,0.4],[60,0.6],[80,0.8],[100,1]]);
            return velocityToErosion;
        })();

        this.funs.velocityToDeposit = (function() {
            var velocityToDeposit = new SplineControl({
                title: 'Deposit vs. Water Speed',
                domain: [0, 100],
                domainTitle: 'cm/s',
                range: [0, 100],
                rangeTitle: '% (of floating silt)'
            });
            velocityToDeposit.setControlPoints([[0,100],[20,80],[40,60],[60,40],[80,20],[100,0]]);
            return velocityToDeposit;
        })();
    },

    show: function(fun) {
        if (!fun)
            return;
        
        this.hide();
        fun.show();
        this.activeFunction = fun;
    },

    hide: function() {
        if (this.activeFunction) {
            this.activeFunction.hide();
            this.activeFunction = null;
        }
    }
};
