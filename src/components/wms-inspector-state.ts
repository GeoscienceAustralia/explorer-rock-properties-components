/// <reference path="../../typings/tsd.d.ts" />

declare var Cesium: any;

module rpComponents.wmsInspectorState {

    'use strict';

    export interface IWmsInspectorState {
        view: string;
        targetGeom: any;
        cameraHeight: number;
    }

    /*
        The WMS points panel can be in 1 of 3 view states:
        1. LEGEND - the default/home shows available service layers
        2. LAYERSELECT - user presented with layers to interrogate with GetFeatureInfo when
        they have clicked a point on the map
        3. FEATUREINFO - view to present raw html returned by GetFeatureInfo
     */
    export class WmsInspectorState implements IWmsInspectorState {
        public view: string = "LEGEND";
        public targetGeom: number;
        public cameraHeight: number;
    }

    angular
        .module('explorer.rockproperties.inspectorstate', [])
        .factory("wmsInspectorState", [() => new rpComponents.wmsInspectorState.WmsInspectorState()])
}
