
import {Evented} from "./ModelingCore/Evented";

export class ModelTileServer extends Evented {
    constructor(modelTileRenderer) {
        super();

        this.renderer = modelTileRenderer;
        this.fb = new Firebase("https://simtable.firebaseio.com/nnmc/livetiles2");
        this.isRunning = false;
        this._layerRef = null;
    }

    _init(name) {
        var bbox = this.renderer.model.geometry.bbox;
        this._layerRef = this.fb.push({
            name: name,
            zIndex: this.renderer.canvasLayer.options.zIndex,
            bbox: {
                north: bbox.getNorth(),
                west: bbox.getWest(),
                south: bbox.getSouth(),
                east: bbox.getEast()
            }
        });

        this._layerRef.onDisconnect().remove();

        this._layerRef.child('listen').on('value', (data) => {
            var val = data.val();
            if (val)
                this.handleTileRequest(val);
        });

        this._layerRef.child('stopListening').on('value', (data) => {
            var zxy = data.val();

            if (!zxy)
                return;

            this.off(zxy);
            this._layerRef.child(zxy).remove();
        });
    }

    start(name) {
        this._init(name);
        this.isRunning = true;
        this._run();
    }

    stop() {
        this.isRunning = false;
        this._layerRef.remove();
    }

    _run() {
        if (this.isRunning) {
            var world = this.renderer.model.world;
            this.fireAll(world);
            setTimeout(() => this._run(), 600);
        }
    }

    handleTileRequest(fbHandle) {
        if (this.events.hasOwnProperty(fbHandle)) {
            return;
        }

        var zxy = fbHandle.split('_'),
            z = zxy[0], x = zxy[1], y = zxy[2];

        var canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;

        var tileClosure = this.renderer.getDrawTileClosure(canvas, x, y, z);

        if (tileClosure) {
            if (this.renderer.model.isAnimated) {
                /* Maybe this doesn't fit too well with Evented, because
                   it registers one callback per fbHandle. So this.fireAll()
                   will fire the events somewhat inefficiently, iterating
                   a 1-element array for each key. */
                this.on(fbHandle, (world) => {
                    tileClosure(world);
                    this._layerRef.child(fbHandle).set(canvas.toDataURL());
                });
            } else {
                tileClosure(this.renderer.model.world);
                this._layerRef.child(fbHandle).set(canvas.toDataURL());
            }
        }
    }
}
