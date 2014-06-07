
/* Experimental visualization of the difference data, intersection points
   of a sample of pairs of diff segments, and the center of mass of these points */
export class Viz {
    lineIntersection(p1,p2,p3,p4) {
        var d12x = p1.x - p2.x,
            d34x = p3.x - p4.x,
            d12y = p1.y - p2.y,
            d34y = p3.y - p4.y,
            a = d12x * d34y - d12y * d34x,
            b = p1.x * p2.y - p1.y * p2.x,
            c = p3.x * p4.y - p3.y * p4.x;

        var rx = (d34x * b - d12x * c) / a,
            ry = (d34y * b - d12y * c) / a;

        if (isNaN(rx) || isNaN(ry)) {
            console.log('nan', p1, p2, p3, p4);
        }

        return {
            x : Math.floor(rx),
            y : Math.floor(ry)
        };
    }

    paintDiffSegments(canvas, diffData) {
        canvas.width = 5000;
        canvas.height = 4000;

        var ctx = canvas.getContext('2d');

        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, 5000, 4000);
        ctx.strokeStyle = 'rgba(255,127,0,0.5)';
        ctx.lineWidth = 1;

        var M = 10;
        var O = 1000;
        var i,j;

        var candidates = [];

        /* paint flat position with a blue dot, mound position with a red dot,
           and a faint yellow line in between. */
        for (i = 0; i < diffData.width; ++i) {
            for (j = 0; j < diffData.height; ++j) {
                var cell = diffData.data[i][j];
                if (cell.list && cell.list.length > 0 && cell.diffValue > 2) {
                    var opinion = cell.list[0];

                    ctx.fillStyle='blue';
                    ctx.fillRect(O + M*i-1, O + M*j-1, 2, 2);

                    ctx.fillStyle='red';
                    ctx.fillRect(O + M*opinion.x-1, O + M*opinion.y-1, 2, 2);

                    ctx.beginPath();
                    ctx.moveTo(O + M*i, O + M*j);
                    ctx.lineTo(O + M*opinion.x, O + M*opinion.y);
                    ctx.stroke();

                    /* save these guys to use in epinode estimate */
                    candidates.push(cell);
                }
            }
        }

        var numIntersections = candidates.length * 2;
        var xAvg = 0, yAvg = 0, avgNum = 0;

        ctx.fillStyle = 'yellow';

        /* pick random pairs of segments and display their intersection point.
           At the same time compute the center of mass of all these points. */
        while (numIntersections--) {
            var c1 = candidates[Math.floor(Math.random() * candidates.length)];
            var c2 = candidates[Math.floor(Math.random() * candidates.length)];

            var intersect = this.lineIntersection(
                {x:c1._x, y:c1._y},
                c1.list[0],
                {x:c2._x, y:c2._y},
                c2.list[0]
            );

            if (isFinite(intersect.x) && isFinite(intersect.y)) {
                xAvg += intersect.x;
                yAvg += intersect.y;
                avgNum++;

                ctx.fillRect(O + M*intersect.x-1, O + M*intersect.y-1, 2, 2);
            }
        }

        /* Paint the center of mass -- rough epinode estimate */
        var avgX = Math.floor(xAvg/avgNum);
        var avgY = Math.floor(yAvg/avgNum);
        ctx.fillRect(O + M*avgX, O + M*avgY, 10, 10);
        console.log(avgX, avgY);
    }
}
