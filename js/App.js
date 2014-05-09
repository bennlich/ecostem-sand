"use strict";

import '../st-api/Util/StringUtil';
import {Leaflet} from '../st-api/Leaflet';
import {ModelPool} from '../st-api/ModelingCore/ModelPool';
import {Animator} from '../st-api/ModelingCore/Animator';
import {TransferFunctions} from '../st-api/ModelingParams/TransferFunctions';
import {RemoteBBoxSampler} from '../st-api/RemoteBBoxSampler';

var D = React.DOM;

var tfMockUI = React.createClass({
    render: () => D.div({id: 'transfer-function-svg'}),
    componentDidMount: () => TransferFunctions.init()
});

var leafletUI = React.createClass({
    render: () => D.div({id: 'leafletMap'}),
    componentDidMount: () => {
        var south = 33.357555,
            west = -105.890007,
            north = 33.525149,
            east = -105.584793;

        var bounds = L.latLngBounds(
            new L.LatLng(south, west),
            new L.LatLng(north, east)
        );

        var map = window.map = new Leaflet('leafletMap', bounds);

        map.setHomeView();
        map.addLayers();

        var modelPool = window.modelPool = new ModelPool(map);

        var elevModel = window.elevModel = modelPool.getModel('Elevation');
        var waterModel = window.waterModel = modelPool.getModel('Water Flow');

        map.toggleLayer({
            on: false,
            leafletLayer: waterModel.renderer.makeLayer({zIndex:20, opacity:0.85})
        });

        var animator = window.animator = new Animator(modelPool);

        var sampler = new RemoteBBoxSampler(
            document.createElement('canvas'),
            'http://node.redfish.com/cgi-bin/elevation.py?bbox={s},{w},{n},{e}&res={width},{height}'
        );

        sampler.loadRemoteData(elevModel.dataModel.geometry, () => {
            elevModel.dataModel.loadElevation(sampler);
            waterModel.dataModel.sampleElevation();
            animator.start();
        });
    }
});

var menuUI = React.createClass({
    render: () => {
        return D.div({className: 'menu'}, 'hello');
    }
});

var mainUI = React.createClass({
    render: () => {
        return D.div({}, [
            tfMockUI(),
            leafletUI(),
            menuUI()
        ]);
    }
});

React.renderComponent(mainUI(), $('.app')[0]);
