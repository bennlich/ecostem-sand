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
        app.on('flat-scan-done', () => this.setState({ flatScanned: true }));
        return {
            started: false,
            flatScanned: false
        };
    },
    updateState: function() {
        this.setState({started: app.animator.isRunning});
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
        app.fire('mound-scan-start');
    },
    render: function() {
        var startButton = D.button({onClick: this.handleStartClick}, 'Start');
        var stopButton = D.button({onClick: this.handleStopClick}, 'Stop');

        return D.div({className: 'menu'}, [
            this.state.started ? stopButton : startButton,
            D.button({onClick: this.handleResetClick}, 'Reset'),
            D.button({onClick: this.handleFlatScanClick}, 'Flat Scan'),
            this.state.flatScanned ? D.button({onClick: this.handleMountainScanClick}, 'Mountain Scan') : null
        ]);
    }
});

var calibrationUI = React.createClass({
    getInitialState: function() {
        return {
            started: false,
            flatDone: false,
            moundDone: false
        };
    },
    render: function() {
        return D.div({className: 'calib-container'}, [
            D.div({className: 'message'}, 'Make a mountain centered in the square below and press Space.'),
            D.div({className: 'mound-square'})
        ]);
    }
});

var scanUI = React.createClass({
    getInitialState: function() {
        this.id = 'scan';

        app.on('flat-scan-start', () => this.startFlatScan());
        app.on('mound-scan-start', () => this.startMoundScan());
        app.on('flat-scan-done', () => this.setState({active:true}));
        app.on('mound-scan-done', () => this.setState({active:false}));

        return {
            active: false
        };
    },
    getCanvas: function() {
        var canvas = this.refs[this.id].getDOMNode(),
            width = $(canvas).parent().width(),
            height = $(canvas).parent().height();

        canvas.width = width;
        canvas.height = height;

        return canvas;
    },
    startFlatScan: function() {
        this.setState({active:true});
        app.flatScan(this.getCanvas());
    },
    startMoundScan: function() {
        this.setState({active:true});
        app.moundScan(this.getCanvas());
    },
    render: function() {
        return D.div({},
            this.state.active ? D.div({className: 'canvas-container'}, D.canvas({id:this.id, ref:this.id})) : null
        );
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
            calibrationUI(),
            scanUI(),
            errorMessageUI(),
            menuUI()
        ]);
    }
});

var app = window.app = new App();
React.renderComponent(mainUI(), $('.app')[0]);
