"use strict";

import {TransferFunctions} from '../st-api/ModelingParams/TransferFunctions';
import {App} from './App';

var D = React.DOM;

var tfMockUI = React.createClass({
    render: function() {
        return D.div({id: 'transfer-function-svg'});
    },
    componentDidMount: function() {
        TransferFunctions.init();
    }
});

var leafletUI = React.createClass({
    render: function() {
        return D.div({id: 'leaflet-map'});
    },
    componentDidMount: function() {
        app.initialize('leaflet-map');
    }
});

var menuUI = React.createClass({
    getInitialState: function() {
        app.on('calib-mound-done', () => this.setState({
            calibrating: false,
            calibrated: true
        }));

        return {
            startedAnimator: false,
            calibrating: false,
            calibrated: false
        };
    },
    updateState: function() {
        this.setState({
            startedAnimator: app.animator.isRunning
        });
    },
    handleStartClick: function() {
        app.animator.start();
        this.updateState();
    },
    handleStopClick: function() {
        app.animator.stop();
        this.updateState();
    },
    handleResetClick: function() {
        app.animator.reset();
        this.updateState();
    },
    handleFlatScanClick: function() {
        app.fire('flat-scan-start');
    },
    handleMountainScanClick: function() {
        app.fire('mound-start');
    },
    handleCalibrate: function() {
        this.setState({calibrating: true});
        app.fire('calib-start');
    },
    render: function() {
        var startButton = D.button({onClick: this.handleStartClick}, 'Start');
        var stopButton = D.button({onClick: this.handleStopClick}, 'Stop');
        var calibButton = D.button({onClick: this.handleCalibrate}, 'Calibrate');

        if (!this.state.calibrating) {
            return D.div({className: 'menu'}, [
                calibButton,
                this.state.startedAnimator ? stopButton : startButton,
                D.button({onClick: this.handleResetClick}, 'Reset'),
                this.state.calibrated ? D.button({onClick: this.handleMountainScanClick}, 'Sand Scan') : null
            ]);
        } else {
            return D.div();
        }
    }
});

var scanUI = React.createClass({
    getInitialState: function() {
        this.id = 'scan';
        this.width = Math.floor($(window).width());
        this.height = Math.floor($(window).height());

        app.on('calib-start', () => this.calibFlat());
        app.on('calib-flat-done', () => this.calibMound());
//        app.on('calib-mound-done', () => this.setState({display:null}));

        app.on('mound-start', () => this.moundScan());
//        app.on('mound-done', () => this.setState({display:null}));

        return { display: null };
    },
    getCanvas: function() {
        var canvas = this.refs[this.id].getDOMNode();

        canvas.width = this.width;
        canvas.height = this.height;

        console.log(canvas.width, canvas.height);

        return canvas;
    },
    calibFlat: function() {
        this.setState({display:'flat-message'});

        var keyHandler = (e) => {
            if (e.keyCode === 32 /* space */) {
                this.calibFlatScan();
                $(document).off('keypress', keyHandler);
            }
        };

        $(document).on('keypress', keyHandler);
    },
    calibMound: function() {
        this.setState({display:'mound-message'});

        var keyHandler = (e) => {
            console.log(e.keyCode);
            if (e.keyCode === 32 /* space bar */) {
                this.calibMoundScan();
                $(document).off('keypress', keyHandler);
            }
        };

        $(document).on('keypress', keyHandler);
    },
    calibFlatScan: function() {
        this.setState({display: 'scan'});
        app.calibrationFlatScan(this.getCanvas());
    },
    calibMoundScan: function() {
        var square = $(this.refs.square.getDOMNode()),
            off = square.offset(),
            width = square.width(),
            height = square.height();

        this.setState({display: 'scan'});
        /* Pass in the screen coordinates of the square. */
        app.calibrationMoundScan(this.getCanvas(), off.left, off.top, off.left + width, off.top + height);
    },
    moundScan: function() {
        this.setState({display: 'scan'});
        app.moundScan(this.getCanvas());
    },
    render: function() {
        var d = this.state.display;

        if (d === 'flat-message') {
            return D.div({className: 'calib-container'},
                D.div({className: 'message'}, 'Flatten the sand and press Space.')
            );
        } else if (d === 'mound-message') {
            return D.div({className: 'calib-container'}, [
                D.div({className: 'message'}, 'Make a mountain with its peak centered in the square below and press Space.'),
                D.div({className: 'mound-square', ref: 'square'})
            ]);
        } else if (d === 'scan') {
            return D.div({className: 'canvas-container'}, D.canvas({id:this.id, ref:this.id}, null));
        } else {
            return D.div();
        }
    }
});

var errorMessageUI = React.createClass({
    getInitialState: function() {
        app.on('error', (msg) => this.setState({error: msg}));
        return {error: null};
    },
    handleClick: function() {
        this.setState({error:null});
    },
    render: function() {
        if (this.state.error) {
            return D.div({className: 'error'}, [
                this.state.error,
                D.button({onClick: this.handleClick}, 'OK')
            ]);
        } else {
            return D.div();
        }
    }
});

var mainUI = React.createClass({
    render: function() {
        return D.div({}, [
            tfMockUI(),
            leafletUI(),
            scanUI(),
            errorMessageUI(),
            menuUI()
        ]);
    }
});

var app = window.app = new App();
React.renderComponent(mainUI(), $('.app')[0]);
