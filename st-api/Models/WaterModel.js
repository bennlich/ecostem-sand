
import {BaseModel} from '../ModelingCore/BaseModel';
import {TransferFunctions} from '../ModelingParams/TransferFunctions';
import {PatchRenderer} from '../ModelingCore/PatchRenderer';
import {Gradient} from '../Util/Gradient';

/* Water model inherits from BaseModel */

export class WaterModel extends BaseModel {
    constructor(xs, ys, bbox, modelSet) {
        super(xs, ys, bbox, modelSet);

        this.init({
            elevation: 0,
            volume: 0,
            siltFloating: 0,
            siltDeposit: 0
        });

        this.isAnimated = true;
        this.elevationSampled = false;

        this.erosionModel = null;
        this.burnSeverityModel = null;

        this.reset();
    }

    _erosionModel() {
        if (!this.erosionModel && this.modelPool.models)
            this.erosionModel = this.modelPool.getDataModel('Erosion & Deposit');
        return this.erosionModel;
    }

    _burnSeverityModel() {
        if (!this.burnSeverityModel && this.modelPool.models)
            this.burnSeverityModel = this.modelPool.getDataModel('Fire Severity');
        return this.burnSeverityModel;
    }

    reset() {
        this.putData(0, 0, this.xSize, this.ySize, {volume:0, siltFloating: 0, siltDeposit: 0});
        this.putData(60, 20, 10, 10, { volume: 50 });
        this.putData(100, 60, 10, 10, { volume: 50 });

        var erosionModel = this._erosionModel();

        if (erosionModel) {
            erosionModel.reset();
        }
    }

    start() {
        super.start();
        this._erosionModel().start();
    }

    stop() {
        super.stop();
        this._erosionModel().stop();
    }

    sampleElevation() {
        if (this.elevationSampled)
            return;

        var elevationModel = this.modelPool.getDataModel('Elevation');

        for (var i = 0; i < this.xSize; ++i) {
            for (var j = 0; j < this.ySize; ++j) {
                var curPatch = this.world[i][j];
                var cc = this.modelPool.crs.modelCoordToCommonCoord({x:i, y:j}, this);
                curPatch.elevation = elevationModel.sample(cc).elevation;
            }
        }

        this.elevationSampled = true;
    }

    step() {
        for (var i = 0; i < this.xSize; ++i) {
            for (var j = 0; j < this.ySize; ++j) {
                var patch = this.world[i][j];

                if (patch.volume === 0)
                    continue;

                // the amount of water that flows is proportional to the difference in heights
                // between the current patch and its lowest neighbor
                var minNeighbor = _.min(this.neighbors(i,j), (neighbor) =>
                    neighbor.volume + neighbor.elevation + neighbor.siltDeposit + neighbor.siltFloating
                );

                var patchHeight = patch.volume + patch.elevation + patch.siltDeposit + patch.siltFloating;
                var neighborHeight = minNeighbor.volume + minNeighbor.elevation + minNeighbor.siltDeposit + minNeighbor.siltFloating;

                var transferVolumeBalancePoint = (neighborHeight + patchHeight) / 2;
                var transferVolume = patch.volume - (transferVolumeBalancePoint - patch.elevation);

                // TODO: Smarter velocity calculation
                var velocity = TransferFunctions.funs.slopeToVelocity(Math.abs(patchHeight - neighborHeight)/2);
                transferVolume *= velocity/100;

                if (transferVolume > patch.volume)
                    transferVolume = patch.volume;

                patch.volume -= transferVolume;
                minNeighbor.volume += transferVolume;

                /* Code below deals with erosion and deposit -- silting */

                /* soil height to be eroded */
                var erosionValue = TransferFunctions.funs.velocityToErosion(velocity),
                    /* percentage of floating silt to be deposited */
                    depositValue = TransferFunctions.funs.velocityToDeposit(velocity)/100;

                if (erosionValue < 0) {
                    throw new Error('negative erosion');
                }

                /* dislodge silt and make it float */
                patch.siltFloating += erosionValue;
                patch.siltDeposit -= erosionValue;

                if (patch.siltFloating > 0) {
                    var value = depositValue * patch.siltFloating;
                    if (value > patch.siltFloating) {
                        console.log(patch.siltFloating, value, depositValue);
                        throw new Error('shit');
                    }
                    patch.siltFloating -= value;
                    patch.siltDeposit += value;
                }

                this._erosionModel().world[i][j].erosion = patch.siltDeposit;

                if (patch.volume === 0) {
                    /* if we passed all the water to the neighbor,
                     * pass all the floating silt along with it.
                     */
                    minNeighbor.siltFloating += patch.siltFloating;
                    patch.siltFloating = 0;
                } else {
                    var siltTransfer = patch.siltFloating * velocity/100;
                    minNeighbor.siltFloating += siltTransfer;
                    patch.siltFloating -= siltTransfer;
                }
            }
        }
        this.fire('change', this.world);
        this._erosionModel().fire('change',this._erosionModel().world);
    }
}

export class WaterPatchRenderer extends PatchRenderer {
    constructor(model) {
        this.model = model;
        this.colorMap = Gradient.multiGradient(
            '#9cf',
            [{color: '#137', steps: 15},
            {color: '#123', steps: 5}]
        );
        this.step = this.colorMap.length / 30;
        this.scaleValues = [5, 10, 20, 30, 0];
        this.zeroValue = 0;
        this.patchField = 'volume';
    }

    color(volume) {
        var idx = Math.floor(volume * this.step);

        if (idx >= this.colorMap.length)
            idx = this.colorMap.length-1;

        return this.colorMap[idx];
    }
}
