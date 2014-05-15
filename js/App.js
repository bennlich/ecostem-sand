"use strict";

import '../st-api/Util/StringUtil';
import {Leaflet} from '../st-api/Leaflet';
import {ModelPool} from '../st-api/ModelingCore/ModelPool';
import {Animator} from '../st-api/ModelingCore/Animator';
import {TransferFunctions} from '../st-api/ModelingParams/TransferFunctions';
import {RemoteBBoxSampler} from '../st-api/RemoteBBoxSampler';
import {Evented} from '../st-api/ModelingCore/Evented';

import {ModelBBox} from '../st-api/ModelingCore/ModelBBox';
import {ScanElevationModel} from '../st-api/Models/ScanElevationModel';
import {ElevationPatchRenderer} from '../st-api/Models/ElevationModel';
import {ModelTileRenderer} from '../st-api/ModelingCore/ModelTileRenderer';
import {ModelTileServer} from '../st-api/ModelTileServer';

import {Correspondence} from './Correspondence';

class Application extends Evented {
    constructor() {
        super();
    }
    initialize(mapDivId) {
        var south = 33.357555,
            west = -105.890007,
            north = 33.525149,
            east = -105.584793;

        var bounds = L.latLngBounds(
            new L.LatLng(south, west),
            new L.LatLng(north, east)
        );

        this.correspondence = new Correspondence();
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

        //var sampler = new RemoteBBoxSampler();

        //sampler.loadRemoteData(elevModel.dataModel.geometry, () => {
        //    elevModel.dataModel.loadElevation(sampler);
        //    waterModel.dataModel.sampleElevation();
        //});

        //AnySurface.Laser.turnOffVMouse();
    }

    addModelLayer(obj) {
        this.modelPool.models[obj.name] = obj;
        this.map.toggleLayer({
            on: false,
            leafletLayer: obj.renderer.makeLayer({zIndex: 19, opacity: 0.85})
        });
    }

    flatScan(canvas) {
        this.correspondence.scan(canvas, () => {
            this.fire('flat-scan-done');
        });
    }

    mountainScan(doneCb) {
        AnySurface.Scan.mountainScan((data) => {
            var modelName = 'Scan Elevation';
            var model = this.modelPool.getDataModel(modelName);

            if (! model) {
                var w = data.width,
                    h = data.height,
                    leafletMap = this.map.leafletMap,
                    bbox = new ModelBBox(leafletMap.getBounds(), leafletMap);

                model = new ScanElevationModel(w, h, bbox, this.modelPool);
                model.load(data);

                var tileRenderer = new ModelTileRenderer(this.map, model, new ElevationPatchRenderer(model));
                var tileServer = new ModelTileServer(tileRenderer);

                var obj = {
                    name: modelName,
                    dataModel: model,
                    renderer: tileRenderer,
                    server: tileServer
                };
                this.addModelLayer(obj);
            } else {
                model.load(data);
            }

            var waterModel = this.modelPool.getDataModel('Water Flow');
            waterModel.sampleElevationFromModel(model);

            if (typeof doneCb === 'function') {
                doneCb();
            }
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
        return D.div({id: 'leaflet-map'});
    },
    componentDidMount: function() {
        app.initialize('leaflet-map');
    }
});

var menuUI = React.createClass({
    getInitialState: function() {
        app.on('flat-scan-done', () => this.setState({ flatScanned: true }));
        return {
            started: false,
            flatScanned: false
        };
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
    handleResetClick: function() {
        app.animator.reset();
        this.updateState();
    },
    handleFlatScanClick: function() {
        app.fire('flat-scan-start');
    },
    handleMountainScanClick: function() {
        app.mountainScan();
    },
    render: function() {
        var startButton = D.button({onClick: this.handleStartClick}, 'Start');
        var stopButton = D.button({onClick: this.handleStopClick}, 'Stop');

        return D.div({className: 'menu'}, [
            this.state.started ? stopButton : startButton,
            D.button({onClick: this.handleResetClick}, 'Reset'),
            D.button({onClick: this.handleFlatScanClick}, 'Flat Scan'),
            this.state.flatScanned ? D.button({onClick: this.handleMountainScanClick}, 'Mountain Scan') : null
        ]);
    }
});

var scanUI = React.createClass({
    getInitialState: function() {
        this.id = 'scan';
        app.on('flat-scan-start', () => this.startScan());
        app.on('flat-scan-done', () => this.setState({active:false}));
        return { active: false };
    },
    startScan: function() {
        this.setState({active:true});

        var canvas = this.refs[this.id].getDOMNode(),
            width = $(canvas).parent().width(),
            height = $(canvas).parent().height();

        canvas.width = width;
        canvas.height = height;

        app.flatScan(canvas);
    },
    render: function() {
        console.log('render', this.state);
        return D.div({className: 'canvas-container'}, this.state.active ? D.canvas({id:this.id,ref:this.id}) : null);
    }
});

var mainUI = React.createClass({
    render: function() {
        console.log(this.props.app);
        return D.div({}, [
            tfMockUI(),
            leafletUI(),
            scanUI(),
            menuUI()
        ]);
    }
});

var app = window.app = new Application();
React.renderComponent(mainUI(), $('.app')[0]);
