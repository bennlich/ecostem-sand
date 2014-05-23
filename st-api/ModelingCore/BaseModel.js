
import {Evented} from "./Evented";

export class BaseModel extends Evented {
    constructor(xs, ys, geometry, modelSet) {
        super();

        this.xSize = xs;
        this.ySize = ys;
        this.geometry = geometry;
        this.timeStep = 1;
        this.modelPool = modelSet;
        this.world = null;
        this.callbacks = [];
        this.isAnimated = false;
    }

    init(defaultValue) {
        var world = new Array(this.xSize);

        for (var i = 0; i < this.xSize; ++i) {
            world[i] = new Array(this.ySize);
            for (var j = 0; j < this.ySize; ++j) {
                world[i][j] = { x: i, y: j };
                /* make sure we make a copy of the default value */
                _.extend(world[i][j], defaultValue);
            }
        }

        this.world = world;
    }

    /* override this optionally */
    reset() { }

    putData(x,y,width,height,obj) {
        if (x < 0)
            x = 0;
        if (x + width > this.xSize)
            width = this.xSize - x;

        if (y < 0)
            y = 0;
        if (y + height > this.ySize)
            height = this.ySize - y;

        
        for (var i = x; i < x + width; ++i) {
            for (var j = y; j < y + height; ++j) {
                for (var key in obj) {
                    this.world[i][j][key] = obj[key];
                }
            }
        }

        this.fire('change', this.world);
    }

    sample(latlng) {
        var xy = this.modelPool.crs.commonCoordToModelCoord(latlng, this);

        if (xy.x < 0 || xy.x >= this.xSize || xy.y < 0 || xy.y >= this.ySize) {
            return undefined;
        }

        return this.world[xy.x][xy.y];
    }

    neighbors(x,y) {
        var n = [];

        for (var i = x-1; i <= x+1; ++i) {
            for (var j = y-1; j <= y+1; ++j) {
                if (!(i === x && j === y) && i >= 0 && j >= 0 && i < this.xSize && j < this.ySize) {
                    n.push(this.world[i][j]);
                }
            }
        }

        return n;
    }

    /* override this if the model is animated */
    step() { }
}
