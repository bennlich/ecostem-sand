
import {ElevationModel, ElevationPatchRenderer} from '../Models/ElevationModel';
import {ErosionModel, ErosionPatchRenderer} from '../Models/ErosionModel';
import {FireSeverityModel, FirePatchRenderer} from '../Models/FireSeverityModel';
import {VegetationModel, VegetationPatchRenderer} from '../Models/VegetationModel';
import {WaterModel, WaterPatchRenderer} from '../Models/WaterModel';
import {LeafletCoordSystem} from './LeafletCoordSystem';
import {ModelTileRenderer} from './ModelTileRenderer';
import {ModelTileServer} from '../ModelTileServer';

export class ModelPool {
    constructor(map) {
        this.map = map;

        this.defaultBBox = map.homeBBox;

        this.models = this._makeModels();

        this.crs = new LeafletCoordSystem(map.leafletMap);
    }

    _makeModel(name, modelClass, width, patchRendererClass, bbox, uiOpts) {
        var ratio = bbox.pixelHeight() / bbox.pixelWidth(),
            height = Math.floor(width * ratio);

        var model = new modelClass(width, height, bbox, this),
            patchRenderer = new patchRendererClass(model),
            tileRenderer = new ModelTileRenderer(this.map, model, patchRenderer),
            tileServer = new ModelTileServer(tileRenderer);

        return {
            name: name,
            dataModel: model,
            renderer: tileRenderer,
            server: tileServer,
            uiOpts : uiOpts
        };
    }

    _makeModels() {
        var bbox = this.defaultBBox;
        return {
            'Elevation'         : this._makeModel('Elevation', ElevationModel, 1024, ElevationPatchRenderer, bbox,
                                                  { canPaint: false }),
            'Fire Severity'     : this._makeModel('Fire Severity', FireSeverityModel, 512, FirePatchRenderer, bbox,
                                                  { canPaint: true }),
            'Vegetation'        : this._makeModel('Vegetation', VegetationModel, 512, VegetationPatchRenderer, bbox,
                                                  { canPaint: true }),
            'Erosion & Deposit' : this._makeModel('Erosion & Deposit', ErosionModel, 400, ErosionPatchRenderer, bbox,
                                                  { canPaint: false }),
            'Water Flow'        : this._makeModel('Water Flow', WaterModel, 400, WaterPatchRenderer, bbox,
                                                  { canPaint: true })
        };
    }

    getModels() {
        return _.values(this.models);
    }

    getModel(name) {
        return this.models[name];
    }

    getDataModel(name) {
        var model = this.getModel(name);

        return model ? model.dataModel : null;
    }
}
