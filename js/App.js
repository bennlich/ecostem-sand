"use strict";

import {Leaflet} from '../st-api/Leaflet';

var D = React.DOM;

var leafletUI = React.createClass({
    render: () => {
        return D.div({id: 'leafletMap'});
    },
    componentDidMount: () => {
        var south = 33.357555,
            west = -105.890007,
            north = 33.525149,
            east = -105.584793;

        var bounds = L.latLngBounds(
            new L.LatLng(south, west),
            new L.LatLng(north, east)
        );

        this.map = new Leaflet('leafletMap', bounds);
        this.map.setHomeView();
        this.map.addLayers();
    }
});

var menuUI = React.createClass({
    render: () => {
        return D.div({className: 'menu'}, 'hello');
    }
});

var mainUI = React.createClass({
    render: () => {
        return D.div({}, [
            leafletUI(),
            menuUI()
        ]);
    }
});

React.renderComponent(mainUI(), $('.app')[0]);
