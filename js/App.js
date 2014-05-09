"use strict";

import '../st-api/Util/StringUtil';
import {Leaflet} from '../st-api/Leaflet';
import {ModelPool} from '../st-api/ModelingCore/ModelPool';
import {Animator} from '../st-api/ModelingCore/Animator';
import {TransferFunctions} from '../st-api/ModelingParams/TransferFunctions';
import {RemoteBBoxSampler} from '../st-api/RemoteBBoxSampler';
import {Evented} from '../st-api/ModelingCore/Evented';

class Application extends Evented {
    constructor() {}
    initialize(mapDivId) {
        var south = 33.357555,
            west = -105.890007,
            north = 33.525149,
            east = -105.584793;

        var bounds = L.latLngBounds(
            new L.LatLng(south, west),
            new L.LatLng(north, east)
        );

        this.map = window.map = new Leaflet(mapDivId, bounds);

        this.map.setHomeView();
        this.map.addLayers();

        this.modelPool = new ModelPool(this.map);

        var elevModel = this.modelPool.getModel('Elevation');
        var waterModel = this.modelPool.getModel('Water Flow');

        this.map.toggleLayer({
            on: false,
            leafletLayer: waterModel.renderer.makeLayer({zIndex:20, opacity:0.85})
        });

        this.animator = new Animator(this.modelPool);

        var sampler = new RemoteBBoxSampler();

        sampler.loadRemoteData(elevModel.dataModel.geometry, () => {
            elevModel.dataModel.loadElevation(sampler);
            waterModel.dataModel.sampleElevation();
        });
    }
}

var D = React.DOM;

var tfMockUI = React.createClass({
    render: function() {
        return D.div({id: 'transfer-function-svg'});
    },
    componentDidMount: function() {
        TransferFunctions.init();
    }
});

var leafletUI = React.createClass({
    render: function() {
        return D.div({id: 'leafletMap'});
    },
    componentDidMount: function() {
        app.initialize('leafletMap');
    }
});

var menuUI = React.createClass({
    getInitialState: function() {
        return {started: false};
    },
    updateState: function() {
        this.setState({started: app.animator.isRunning});
    },
    handleStartClick: function() {
        app.animator.start();
        this.updateState();
    },
    handleStopClick: function() {
        app.animator.stop();
        this.updateState();
    },
    handleReset: function() {
        app.animator.reset();
        this.updateState();
    },
    render: function() {
        var startButton = D.button({onClick: this.handleStartClick}, 'Start');
        var stopButton = D.button({onClick: this.handleStopClick}, 'Stop');

        return D.div({className: 'menu'}, [
            this.state.started ? stopButton : startButton,
            D.button({onClick: this.handleReset}, 'Reset')
        ]);
    }
});

var mainUI = React.createClass({
    render: function() {
        console.log(this.props.app);
        return D.div({}, [
            tfMockUI(),
            leafletUI(),
            menuUI()
        ]);
    }
});

var app = new Application();
React.renderComponent(mainUI(), $('.app')[0]);
