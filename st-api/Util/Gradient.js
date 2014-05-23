'use strict';

export var Gradient = {
    /* Taken from here: https://gist.github.com/THEtheChad/1297590 */
    parseColor : function(color) {
        var cache, p = parseInt; // Use p as a byte saving reference to parseInt

        color = color.replace(/\s\s*/g,''); // Remove all spaces

        // Checks for 6 digit hex and converts string to integer
        if ((cache = /^#([\da-fA-F]{2})([\da-fA-F]{2})([\da-fA-F]{2})/.exec(color)))
            cache = [p(cache[1], 16), p(cache[2], 16), p(cache[3], 16)];

        // Checks for 3 digit hex and converts string to integer
        else if ((cache = /^#([\da-fA-F])([\da-fA-F])([\da-fA-F])/.exec(color)))
            cache = [p(cache[1], 16) * 17, p(cache[2], 16) * 17, p(cache[3], 16) * 17];

        // Checks for rgba and converts string to
        // integer/float using unary + operator to save bytes
        else if ((cache = /^rgba\(([\d]+),([\d]+),([\d]+),([\d]+|[\d]*.[\d]+)\)/.exec(color)))
            cache = [+cache[1], +cache[2], +cache[3], +cache[4]];

        // Checks for rgb and converts string to
        // integer/float using unary + operator to save bytes
        else if ((cache = /^rgb\(([\d]+),([\d]+),([\d]+)\)/.exec(color)))
            cache = [+cache[1], +cache[2], +cache[3]];

        // Otherwise throw an exception to make debugging easier
        else throw new Error('Cannot parse ' + color);

        // Performs RGBA conversion by default
        if (isNaN(cache[3]))
            cache[3] = 1;

        // Adds or removes 4th value based on rgba support
        // Support is flipped twice to prevent erros if
        // it's not defined
        return cache.slice(0,3 + !!$.support.rgba);
    },

    multiGradient: function(initialColor, units) {
        var gradient = [];
        var prevColor = initialColor;

        for (var i = 0; i < units.length; ++i) {
            var u = units[i];
            gradient = gradient.concat(this.gradient(prevColor, u.color, u.steps));
            prevColor = u.color;
        }

        return gradient;
    },

    gradient: function(c1, c2, n) {
        function c(r,g,b) {
            return 'rgb({0},{1},{2})'.format(r,g,b);
        }

        c1 = c1 || 'rgb(0,0,0)';
        c2 = c2 || 'rgb(255,255,255)';
        var numSteps = n || 10;

        var c1Vals = this.parseColor(c1);
        var c2Vals = this.parseColor(c2);

        var r1 = c1Vals[0],
            g1 = c1Vals[1],
            b1 = c1Vals[2];

        var r2 = c2Vals[0],
            g2 = c2Vals[1],
            b2 = c2Vals[2];

        var rInc = Math.abs(r2-r1)/numSteps;
        var gInc = Math.abs(g2-g1)/numSteps;
        var bInc = Math.abs(b2-b1)/numSteps;

        var rDir = r2 > r1;
        var gDir = g2 > g1;
        var bDir = b2 > b1;

        var gradient = [];

        while (numSteps--) {
            gradient.push(c(Math.round(r1), Math.round(g1), Math.round(b1)));

            if (rDir)
                r1 += rInc;
            else
                r1 -= rInc;

            if (gDir)
                g1 += gInc;
            else
                g1 -= gInc;

            if (bDir)
                b1 += bInc;
            else
                b1 -= bInc;
        }

        return gradient;
    }
};
