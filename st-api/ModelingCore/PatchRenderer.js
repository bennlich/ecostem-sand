
export class PatchRenderer {
    constructor() {
        // override these
        this.scaleValues = [0];
        this.zeroValue = 0;
        // field used for coloring. patch[this.patchField] is passed to color()
        this.patchField = 'none';
    }

    // override this
    color(value) {
        return '#fff';
    }

    // override this optionally
    name(value) {
        return value;
    }

    scale() {
        return _.map(this.scaleValues, (v) => {
            var name, color;

            if (v === this.zeroValue) {
                name = 'None (Erase)';
                color = 'rgba(0,0,0,0)';
            } else {
                name = this.name(v);
                color = this.color(v);
            }

            var val = {};
            val[this.patchField] = v;

            return {
                value: val,
                color: color,
                name: name
            };
        });
    }

    render(ctx, world, i, j, drawX, drawY, drawWidth, drawHeight) {
        var patch, val;

        if (!world[i] || !(patch = world[i][j]))
            return;

        val = patch[this.patchField];

        if (val === this.zeroValue)
            return;

        ctx.fillStyle = this.color(patch[this.patchField]);
        ctx.fillRect(Math.floor(drawX), Math.floor(drawY), Math.ceil(drawWidth), Math.ceil(drawHeight));
    }
}
