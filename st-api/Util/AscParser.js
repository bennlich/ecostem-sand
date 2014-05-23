/*
 * Fast(er) ASC file parser. Can parse large files (~125Mb) by scanning the
 * input without splitting it into lists.
 */

export class AscParser {
    constructor() {
        this.cursor = 0;
        this.headers = {};
        this.data = null;
        this.parsed = false;
    }

    parseToken(stream) {
        while (stream[this.cursor] === ' '
               || stream[this.cursor] === '\n'
               || stream[this.cursor] === '\r')
        {
            this.cursor++;
        }

        var t = "";

        while (stream[this.cursor] !== ' '
               && stream[this.cursor] !== '\n'
               && stream[this.cursor] !== '\r')
        {
            t += stream[this.cursor];
            this.cursor++;
        }

        return t;
    }

    parseHeaders(stream) {
        for (var i = 0; i < 6; ++i) {
            var key = this.parseToken(stream),
                value = parseFloat(this.parseToken(stream));
            this.headers[key] = value;
        }
    }

    parseBody(stream) {
        var i = 0, j = 0;

        var nrows = this.headers.nrows,
            ncols = this.headers.ncols,
            nodata = this.headers.NODATA_value;

        var progressSteps = Math.floor((nrows * ncols)/20),
            steps = 0,
            fun = typeof this.progressFunction === 'function' ? this.progressFunction : undefined;

        while (true) {
            steps++;

            if (fun && steps % progressSteps === 0) {
                fun();
            }

            var t = parseFloat(this.parseToken(stream));

            if (t !== nodata)
                this.data[i][j] = t;

            i++;

            if (i >= ncols) {
                i = 0;
                j++;
                if (j >= nrows)
                    break;
            }
        }
        console.log('done');
    }

    reset() {
        this.cursor = 0;
        this.headers = {};
        this.data = null;
        this.parsed = false;
    }

    parse(stream, progressFunction) {
        this.reset();

        this.progressFunction = progressFunction;

        this.parseHeaders(stream);

        this.data = new Array(this.headers.ncols);
        for (var i = 0; i < this.headers.ncols; ++i) {
            this.data[i] = new Array(this.headers.ncols);
        }

        this.parseBody(stream);
        this.parsed = true;
    }
}
