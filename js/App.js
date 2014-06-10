"use strict";

import '../st-api/Util/StringUtil';
import {Leaflet} from '../st-api/Leaflet';
import {ModelPool} from '../st-api/ModelingCore/ModelPool';
import {Animator} from '../st-api/ModelingCore/Animator';
import {Evented} from '../st-api/ModelingCore/Evented';
import {ModelBBox} from '../st-api/ModelingCore/ModelBBox';
import {ElevationPatchRenderer} from '../st-api/Models/ElevationModel';
import {ModelTileRenderer} from '../st-api/ModelingCore/ModelTileRenderer';
import {ModelTileServer} from '../st-api/ModelTileServer';

import {ScanElevationModel, ScanElevationPatchRenderer} from './ScanElevationModel';
import {Correspondence} from './Correspondence';

export class App extends Evented {
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
            this.elevModel.dataModel.fire('change', this.elevModel.dataModel.world);
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
            name: 'Scan Elevation',
            dataModel: model,
            renderer: tileRenderer,
            server: tileServer,
            uiOpts : { canPaint: false }
        };

        model.loadFromRaster(diffData);
        this.waterModel.dataModel.sampleElevationFromModel(model);

        this.addModelLayer(modelObject);

        this.elevModel = modelObject;
    }

    calibrationFlatScan(canvas) {
        this.correspondence.calibrationFlatScan(canvas, () => {
            this.fire('calib-flat-done');
        }, () => {
            this.fire('error', 'Could not load camera frame.');
        });
    }

    calibrationMoundScan(canvas) {
        this.correspondence.calibrationMoundScan(canvas, () => {
            this.fire('calib-mound-done');
        }, () => {
            this.fire('error', 'Could not load camera frame.');
        });
    }

    sandScan(canvas) {
        this.correspondence.moundScan(canvas, (diffRaster) => {
            this.updateScanElevation(diffRaster);
            this.fire('sand-scan-done');
        }, () => {
            this.fire('error', 'Could not load camera frame.');
        });
    }
}
