"use strict";

import {TransferFunctions} from '../st-api/ModelingParams/TransferFunctions';
import {App} from './App';

var D = React.DOM;

var tfMockUI = React.createClass({
    componentDidMount: function() {
        TransferFunctions.init();
    },
    render: function() {
        return D.div({ id: 'transfer-function-svg' });
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
    componentDidMount: function() {
        app.on('calib-mound-done', () => this.setState({
            calibrating: false,
            calibrated: true
        }));
    },
    getInitialState: function() {
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
        this.setState({ calibrating: true });
        app.fire('calib-start');
    },
    render: function() {
        if (this.state.calibrating)
            return D.div();

        var animateButton = this.state.startedAnimator ?
                D.button({ onClick: this.handleStopClick }, 'Stop') :
                D.button({ onClick: this.handleStartClick }, 'Start'),
            calibButton = D.button({ onClick: this.handleCalibrate }, 'Calibrate'),
            resetButton = D.button({ onClick: this.handleResetClick }, 'Reset'),
            sandScanButton = this.state.calibrated ?
                D.button({onClick: this.handleMountainScanClick}, 'Sand Scan') : null;
        
        return D.div({ className: 'menu' }, [
            calibButton,
            animateButton,
            resetButton,
            sandScanButton
        ]);
    }
});

var scanUI = React.createClass({
    componentDidMount: function() {
        this.id = 'scan';
        this.width = Math.floor($(window).width());
        this.height = Math.floor($(window).height());

        app.on('calib-start', () => this.calibFlat());
        app.on('calib-flat-done', () => this.calibMound());
        app.on('calib-mound-done', () => this.setState({ display: null }));

        app.on('mound-start', () => this.moundScan());
        app.on('mound-done', () => this.setState({ display: null }));
    },
    getInitialState: function() {
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
        this.setState({ display: 'flat-message' });

        var keyHandler = (e) => {
            if (e.keyCode === 32 /* space */) {
                this.calibFlatScan();
                $(document).off('keypress', keyHandler);
            }
        };

        $(document).on('keypress', keyHandler);
    },
    calibMound: function() {
        this.setState({ display: 'mound-message' });

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
        this.setState({ display: 'scan' });
        app.calibrationFlatScan(this.getCanvas());
    },
    calibMoundScan: function() {
        var square = $(this.refs.square.getDOMNode()),
            off = square.offset(),
            width = square.width(),
            height = square.height();

        this.setState({ display: 'scan' });
        /* Pass in the screen coordinates of the square. */
        app.calibrationMoundScan(this.getCanvas(), off.left, off.top, off.left + width, off.top + height);
    },
    moundScan: function() {
        this.setState({ display: 'scan' });
        app.moundScan(this.getCanvas());
    },
    render: function() {
        switch (this.state.display) {
            case 'flat-message':
                return D.div({ className: 'calib-container' },
                    D.div({ className: 'message' }, 'Flatten the sand and press Space.')
                );
            case 'mound-message':
                return D.div({className: 'calib-container'}, [
                    D.div({ className: 'message' }, 'Make a mountain with its peak centered in the square below and press Space.'),
                    D.div({ className: 'mound-square', ref: 'square' })
                ]);
            case 'scan':
                return D.div({ className: 'canvas-container' },
                    D.canvas({ id: this.id, ref: this.id })
                );
            default:
                return D.div();
        }
    }
});

var errorMessageUI = React.createClass({
    componentDidMount: function() {
        app.on('error', (msg) => this.setState({ error: msg }));
    },
    getInitialState: function() {
        return { error: null };
    },
    handleClick: function() {
        this.setState({ error: null });
    },
    render: function() {
        if (!this.state.error)
            return D.div();
        
        return D.div({ className: 'error' }, [
            this.state.error,
            D.button({ onClick: this.handleClick }, 'OK')
        ]);
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
