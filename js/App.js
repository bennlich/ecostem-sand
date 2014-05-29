"use strict";

import '../st-api/Util/StringUtil';
import {Leaflet} from '../st-api/Leaflet';
import {ModelPool} from '../st-api/ModelingCore/ModelPool';
import {Animator} from '../st-api/ModelingCore/Animator';
import {TransferFunctions} from '../st-api/ModelingParams/TransferFunctions';
import {RemoteBBoxSampler} from '../st-api/RemoteBBoxSampler';
import {Evented} from '../st-api/ModelingCore/Evented';

import {ModelBBox} from '../st-api/ModelingCore/ModelBBox';
import {ElevationPatchRenderer} from '../st-api/Models/ElevationModel';
import {ModelTileRenderer} from '../st-api/ModelingCore/ModelTileRenderer';
import {ModelTileServer} from '../st-api/ModelTileServer';

import {BaseModel} from '../st-api/ModelingCore/BaseModel';
import {PatchRenderer} from '../st-api/ModelingCore/PatchRenderer';

import {Correspondence} from './Correspondence';

import {Gradient} from '../st-api/Util/Gradient';

class ScanElevationModel extends BaseModel {
    constructor(xs, ys, geometry, modelPool) {
        super(xs, ys, geometry, modelPool);
        this.init({elevation:0});

        this.min = 1000000;
        this.max = -1000000;
    }
    loadFromRaster(raster) {
        console.log(raster);
        if (raster.width !== this.xSize || raster.height !== this.ySize) {
            console.error('raster differs from model', raster.width, raster.height, this.xSize, this.ySize);
        }
        for (var i = 0; i < this.xSize; ++i) {
            for (var j = 0; j < this.ySize; ++j) {
                var patch = raster.data[i][j];
                var elev = Math.abs(patch.x)+Math.abs(patch.y);

                this.world[i][j].elevation = elev;
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

class ScanElevationPatchRenderer extends PatchRenderer {
    constructor(elevModel) {
        super();
        this.model = elevModel;
        this.patchField = 'elevation';
        this.zeroValue = undefined;
    }
    color(value) {
        var variance = this.model.max - this.model.min;
        return Gradient.hsvToRgb((1-value/variance)*0.8, 1, 1);
    }
}

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
        this.waterModel = this.modelPool.getModel('Water Flow');

        this.map.toggleLayer({
            on: false,
            leafletLayer: this.waterModel.renderer.makeLayer({zIndex:20, opacity:0.85})
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

    updateScanElevation(diffData) {
        if (this.elevModel) {
            this.elevModel.dataModel.loadFromRaster(diffData);
            this.waterModel.dataModel.sampleElevationFromModel(this.elevModel.dataModel);
            this.elevationModel.fire('change');
            return;
        }

        var width = diffData.width,
            height = diffData.height,
            bbox = new ModelBBox(this.map.leafletMap.getBounds(), this.map.leafletMap),
            model = new ScanElevationModel(width, height, bbox, this.modelPool),
            patchRenderer = new ScanElevationPatchRenderer(model),
            tileRenderer = new ModelTileRenderer(this.map, model, patchRenderer),
            tileServer = new ModelTileServer(tileRenderer);

        var modelObject = {
            name: name,
            dataModel: model,
            renderer: tileRenderer,
            server: tileServer,
            uiOpts : { canPaint: false }
        };

        model.loadFromRaster(diffData);
        this.waterModel.dataModel.sampleElevationFromModel(model);

        this.addModelLayer(modelObject);

        this.elevModel = model;
    }

    flatScan(canvas) {
        this.correspondence.flatScan(canvas, () => {
            this.fire('flat-scan-done');
        }, () => {
            this.fire('error', 'Could not load camera frame.');
        });
    }

    moundScan(canvas) {
        this.correspondence.moundScan(canvas, (diffRaster) => {
            this.updateScanElevation(diffRaster);
            this.fire('mound-scan-done');
        }, () => {
            this.fire('error', 'Could not load camera frame.');
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
        app.fire('mound-scan-start');
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
        app.on('flat-scan-start', () => this.startFlatScan());
        app.on('mound-scan-start', () => this.startMoundScan());
        app.on('flat-scan-done', () => this.setState({active:false}));
        app.on('mound-scan-done', () => this.setState({active:false}));
        return { active: false };
    },
    getCanvas: function() {
        var canvas = this.refs[this.id].getDOMNode(),
            width = $(canvas).parent().width(),
            height = $(canvas).parent().height();

        canvas.width = width;
        canvas.height = height;

        return canvas;
    },
    startFlatScan: function() {
        this.setState({active:true});
        app.flatScan(this.getCanvas());
    },
    startMoundScan: function() {
        this.setState({active:true});
        app.moundScan(this.getCanvas());
    },
    render: function() {
        return D.div({},
            this.state.active ? D.div({className: 'canvas-container'}, D.canvas({id:this.id, ref:this.id})) : null
        );
    }
});

var errorMessageUI = React.createClass({
    getInitialState: function() {
        app.on('error', (msg) => this.setState({error: msg}));
        return {error: null};
    },
    handleClick: function() {
        this.setState({error:null});
    },
    render: function() {
        if (this.state.error) {
            return D.div({className: 'error'}, [
                this.state.error,
                D.button({onClick: this.handleClick}, 'OK')
            ]);
        } else {
            return D.div();
        }
    }
});

var mainUI = React.createClass({
    render: function() {
        return D.div({}, [
            tfMockUI(),
            leafletUI(),
            scanUI(),
            errorMessageUI(),
            menuUI()
        ]);
    }
});

var app = window.app = new Application();
React.renderComponent(mainUI(), $('.app')[0]);
