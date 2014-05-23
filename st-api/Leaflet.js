"use strict";

import {ModelBBox} from './ModelingCore/ModelBBox';

export class Leaflet {
    constructor(id, bbox) {
        /* for debugging */
        window.map = this;

        this.leafletMap = new L.Map(id,{ minZoom: 3, maxZoom: 15 });
        this.zIndex = 10;

        this.homeBBox = new ModelBBox(bbox, this.leafletMap);

        L.control.scale().addTo(this.leafletMap);
    }

    addLayers() {
        // base layers
        this.baseLayers = this._makeBaseLayers();
        this.setBaseLayer(this.baseLayers[2]);

        // generic map overlays
        this.layers = this._makeLayers();
    }

    setHomeView() {
        if (this.homeBBox)
            this.leafletMap.setView(this.homeBBox.bbox.getCenter(), 12);
    }

    /* tile urls */
    _osmUrl() {
        return 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }

    _topOsmUrl(style, ext) {
        return 'http://{s}.tile.stamen.com/' + style + '/{z}/{x}/{y}.' + ext;
    }

    _mapBoxUrl(style) {
        switch(style) {
        case 'ROADMAP':
            return 'http://{s}.tiles.mapbox.com/v3/bennlich.hmi293in/{z}/{x}/{y}.png';
        case 'SATELLITE':
            return 'http://{s}.tiles.mapbox.com/v3/bennlich.hmi1nejo/{z}/{x}/{y}.png';
        case 'TERRAIN':
        default:
            return 'http://{s}.tiles.mapbox.com/v3/bennlich.hmi0c6k3/{z}/{x}/{y}.png';
        }
    }

    /* base layer functions */
    isBaseLayer(layer) {
        return layer === this.currentBaseLayer;
    }

    _makeBaseLayers() {
        var baseLayerSettings = {
            minZoom: 2,
            maxZoom: 18,
            zIndex: 1,
            zoomAnimation: false
        };

        return [{
            name: 'Roadmap',
            leafletLayer: new L.TileLayer(this._mapBoxUrl('ROADMAP'), baseLayerSettings)
        }, {
            name: 'Satellite',
            leafletLayer: new L.TileLayer(this._mapBoxUrl('SATELLITE'), baseLayerSettings)
        }, {
            name: 'Terrain',
            leafletLayer: new L.TileLayer(this._mapBoxUrl('TERRAIN'), baseLayerSettings)
        }, {
            name: 'OSM',
            leafletLayer: new L.TileLayer(this._osmUrl(), baseLayerSettings)
        }, {
            name: 'TopOSM Relief',
            leafletLayer: new L.TileLayer(this._topOsmUrl('toposm-color-relief', 'jpg'), baseLayerSettings)
        }];
    }

    setBaseLayer(layer) {
        if (this.currentBaseLayer) {
            this.leafletMap.removeLayer(this.currentBaseLayer.leafletLayer);
        }
        this.currentBaseLayer = layer;
        this.leafletMap.addLayer(layer.leafletLayer);
        this.leafletMap.fire('baselayerchange', { layer: layer.leafletLayer });
    }

    /* overlay layers */
    _makeLayers() {
        return [{
            on: false,
            name: 'Contours',
            leafletLayer: new L.TileLayer(this._topOsmUrl('toposm-contours', 'png'), {zIndex: this.zIndex++})
        }, {
            on: false,
            name: 'Features',
            leafletLayer: new L.TileLayer(this._topOsmUrl('toposm-features', 'png'), {zIndex: this.zIndex++})
        }];
    }

    toggleLayer(layer) {
        if (layer.on) {
            this.leafletMap.removeLayer(layer.leafletLayer);
        } else {
            this.leafletMap.addLayer(layer.leafletLayer);
        }
        layer.on = !layer.on;
    }
}
