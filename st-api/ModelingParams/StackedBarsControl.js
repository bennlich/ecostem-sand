"use strict";

import {TransferFunction} from "./TransferFunction";

export class StackedBarsControl extends TransferFunction {
    constructor(opts) {
        super(opts);

        var domain = opts.domain,
            domainTitle = opts.domainTitle,
            range = opts.range,
            rangeTitle = opts.rangeTitle;

        transfer.title = range.slice(0,range.length-1).join(", ") + ", and " + range[range.length-1];

        var padding = 60;
        var colorClassnames = ['color-a', 'color-b', 'color-c', 'color-d', 'color-e'];

        // currently a lot of variables belong to the 'transfer' function
        // eventually we may want to make these private, but for now it's helped
        // with debugging

        function transfer(x) {
            var column = transfer.rectangles[x];

            if (!column) {
                return null;
            }

            var ret = {};
            for (var i = 0; i < range.length; i++) {
                ret[range[i]] = column[i].yBottom - column[i].yTop;
            }
            return ret;
        }

        transfer.render = function() {
            var columns = this.container.selectAll('g.column');

            var controlGroup = columns.selectAll('g.control')
                .data(function(d) { return transfer.controls[d]; });
            controlGroup.select('rect.control')
                .attr('y', function(d) {
                    return transfer.yScale(d.val);
                });

            controlGroup.select('rect.handle')
                .attr('y', function(d) {
                    return transfer.yScale(d.val) - 10;
                });

            var barGroup = columns.selectAll('rect.bar')
                .data(function(d) { return transfer.rectangles[d]; })
                .attr('height', function(d) {
                    return transfer.yScale(d.yBottom) - transfer.yScale(d.yTop);
                })
                .attr('y', function(d) {
                    return transfer.yScale(d.yTop);
                });

            var barLabels = columns.selectAll('text.bar-label')
                .data(function(d) { return transfer.rectangles[d]; })
                .attr('y', function(d) {
                    return (transfer.yScale(d.yTop) + transfer.yScale(d.yBottom))/2;
                })
                .text(function(d) {
                    return d3.format("%")(d.yBottom - d.yTop);
                });
        };

        var width = this.width,
            height = this.height;

        // these scales convert from the extent of the data to
        // the extent of the svg canvas where we want to draw
        transfer.xScale = d3.scale.ordinal().domain(domain)
            .rangeBands([0 + padding, width - padding], 0.01);
        transfer.yScale = d3.scale.linear().domain([0,1])
            .rangeRound([0 + padding, height - padding]);

        // init data
        var partitionScale = d3.scale.linear().domain([0,range.length]).range([0,1]);

        function newControlGroup(rectangleGroup) {
            var controlGroup = [];
            for (var i = 1; i < range.length; i++) {
                controlGroup.push({
                    val: partitionScale(i),
                    topBar: rectangleGroup[i-1],
                    bottomBar: rectangleGroup[i]
                });
            }
            return controlGroup;
        }

        function newRectangleGroup() {
            var rectangleGroup = [];
            for (var i = 0; i < range.length; i++) {
                rectangleGroup.push({
                    yTop: partitionScale(i),
                    yBottom: partitionScale(i+1),
                    class: colorClassnames[i % colorClassnames.length]
                });
            }
            return rectangleGroup;
        }

        transfer.controls = {};
        transfer.rectangles = {};
        domain.forEach(function(name) {
            transfer.rectangles[name] = newRectangleGroup();
            transfer.controls[name] = newControlGroup(transfer.rectangles[name]);
        });

        // svg container
        var container = transfer.container = this.container
            .attr('class', 'stacked-bars');

        var columns = container.selectAll('g.column')
            .data(domain).enter()
            .append('g')
            .attr('class', 'column')
            .attr('transform', function(d) {
                return 'translate('+transfer.xScale(d)+',0)';
            });

        var barGroup = columns.selectAll('rect.bar')
            .data(function(d) { return transfer.rectangles[d]; }).enter()
            .append('rect')
            .attr('class', function(d) { return 'bar '+d.class; })
            .attr('width', transfer.xScale.rangeBand())
            .attr('height', function(d) {
                return transfer.yScale(d.yBottom) - transfer.yScale(d.yTop);
            })
            .attr('y', function(d) {
                return transfer.yScale(d.yTop);
            });

        var barLabels = columns.selectAll('text.bar-label')
            .data(function(d) { return transfer.rectangles[d]; }).enter()
            .append('text')
            .attr('class', 'bar-label')
            .attr('dy', '.35em')
            .attr('x', transfer.xScale.rangeBand()/2)
            .attr('y', function(d) {
                return (transfer.yScale(d.yTop) + transfer.yScale(d.yBottom))/2;
            })
            .text(function(d) {
                return d3.format("%")(d.yBottom - d.yTop);
            });

        var controlGroup = columns.selectAll('g.control')
            .data(function(d) { return transfer.controls[d]; }).enter()
            .append('g')
            .attr('class', 'control')
            .call(d3.behavior.drag()
                .on('drag', function(d) {
                    d.val = transfer.yScale.invert(d3.event.y);
                    d.val = Math.min(d.bottomBar.yBottom, Math.max(d.val, d.topBar.yTop));
                    d.topBar.yBottom = d.bottomBar.yTop = d.val;
                    transfer.render();
                }));

        controlGroup.append('rect')
            .attr('class', 'control')
            .attr('width', transfer.xScale.rangeBand())
            .attr('height', 1)
            .attr('y', function(d) {
                return transfer.yScale(d.val);
            });

        controlGroup.append('rect')
            .attr('class', 'handle')
            .attr('width', transfer.xScale.rangeBand())
            .attr('height', 21)
            .attr('y', function(d) {
                return transfer.yScale(d.val) - 10;
            });

        // axes
        var xAxis = d3.svg.axis().scale(transfer.xScale);
        // yAxisScale = d3.scale.linear().domain([0,1]).rangeRound([height - padding, 0 + padding]),
        // yAxis = d3.svg.axis().scale(yAxisScale).orient('left').ticks(2).tickFormat(d3.format("%"));

        container.append('g')
            .attr('class', 'x-axis')
            .attr('transform', 'translate(0,' + (height - padding) + ')')
            .call(xAxis);

        // labels
        var title = container.append('text')
            .attr('class', 'title')
            .attr('text-anchor', 'middle')
            .attr('transform', 'translate(' + width / 2 + ',' + (padding - 30) + ')');
        for (var i = 0; i < range.length; i++) {
            title.append('tspan')
                .attr('class', colorClassnames[i])
                .text(range[i]);
            // TODO use colored underlines instead of colored text
            if (i < range.length - 2) {
                title.append('tspan').text(', ');
            }
            else if (i === range.length - 2) {
                title.append('tspan').text(', and ');
            }
        }

        container.append('text')
            .attr('class', 'x-label')
            .attr('text-anchor', 'middle')
            .attr('transform', 'translate(' + width / 2 + ',' + (height - padding + 40) + ')')
            .text(domainTitle);
        container.append('text')
            .attr('class', 'y-label')
            .attr('text-anchor', 'middle')
            .attr('transform', 'rotate(-90) translate(' + -height / 2 + ',' + (padding - 20) + ')')
            .text(rangeTitle);

        $(transfer.container[0]).hide();

        this.extendTransferFunc(transfer);

        return transfer;
    }
}
