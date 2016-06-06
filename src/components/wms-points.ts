/// <reference path="../../typings/browser.d.ts" />
/// <reference path="config" />
/// <reference path="../components/control-panel" />
/// <reference path="../leaflet/wms-inspector" />
/// <reference path="../leaflet/wms-inspector-state" />
/// <reference path="gws-util" />

module rpComponents.pointsService {

    'use strict';

    export interface IRocksWmsPointsCtrl {}
    export class RocksWmsPointsCtrl implements IRocksWmsPointsCtrl {

        static $inject = ["$scope", "wmsPointsService", "rocksPanelService", "wmsInspectorState"];
        constructor(
            public $scope: ng.IScope,
            public wmsPointsService: rpComponents.pointsService.IWmsPointsService,
            public rocksPanelService: rpComponents.controlPanel.IRocksPanelService,
            public wmsInspectorState: rpComponents.wmsInspectorState.IWmsInspectorState
        ){}
    }

    export interface IWmsPointsService {
        layers: [any];
        legendData: any;
        init(): void;
        togglePoints(): boolean;
    }

    export class WmsPointsService implements IWmsPointsService {

        layers: [any];
        map: any;
        restrictedBounds: any;
        wmsServiceUrl: string;
        wmsLayer: any;
        legendData: any;
        inspectorEnabled: boolean = true;
        masterChecked: boolean = true;
        pointsVisible: boolean;
        legendParamString: string = "";

        $inject = [
            "$rootScope",
            "gwsUtilService",
            "rocksConfigService",
            "wmsInspectorState"
        ];

        constructor(
            public $rootScope: ng.IRootScopeService,
            public gwsUtilService: rpComponents.gwsUtilService.IGwsUtilService,
            public rocksConfigService: rpComponents.config.IRocksConfigService,
            public wmsInspectorState: rpComponents.wmsInspectorState.IWmsInspectorState
        ) {
            this.$rootScope.$on('rocks.config.ready', () => {
                this.init();
            });
        }

        public init(): void{

            this.wmsServiceUrl = this.rocksConfigService.config.geoserverWmsUrl;
            this.map = this.rocksConfigService.map;
            this.restrictedBounds = [109, -45, 158, -8];

            // build our legend param string from config
            this.legendParamString = "?";
            angular.forEach(this.rocksConfigService.config.geoserverWmsLegendParams, (value: any, key: any) => {
                this.legendParamString += key +"="+ value +"&";
            });
            // lose trailing &
            this.legendParamString = this.legendParamString.slice(0, -1) + "&LAYER=";

            this.gwsUtilService.getWmsLayerNames().then((layers: any) => {
                this.layers = layers;
                this.getLegendData();
            });
        }

        public togglePoints(): boolean {

            this.pointsVisible = !this.pointsVisible;
            if(this.wmsLayer){
                this.wmsLayer.show = this.pointsVisible;
            } else {
                this.updatePointsLayer();
            }
            return this.pointsVisible;
        }

        public toggleChecked(): void {
            this.masterChecked != this.masterChecked;
            for(var legend in this.legendData){
                this.legendData[legend]['isSelected'] = this.masterChecked;
            }
        }

        getLegendData(): void{

            this.legendData = {};
            for(var i = 0; i < this.layers.length; i++){

                this.legendData[this.layers[i]] = {
                    legendUrl : this.wmsServiceUrl + this.legendParamString + this.layers[i],
                    isSelected : true
                };
            }
        }

        updatePointsLayer(): void{

            var targetLayers: any = [];
            for(var legend in this.legendData){
                if (this.legendData.hasOwnProperty(legend) && this.legendData[legend]['isSelected'] === true) {
                    targetLayers.push(legend);
                }
            }

            if(this.wmsLayer){
                this.map.remove(this.wmsLayer);
            }

            ga('send', 'event', 'explorer-rock-properties', 'click', 'update wms points layer: '+targetLayers.toString());

            this.wmsLayer = L.tileLayer.wms(this.wmsServiceUrl, {
                layers: targetLayers.toString(),
                transparent: true,
                format: 'image/png'
            });
            this.map.addLayer(this.wmsLayer);
            
/*            this.wmsLayer = this.viewer.imageryLayers.addImageryProvider(new Cesium.WebMapServiceImageryProvider({
                url : this.wmsServiceUrl,
                layers: targetLayers.toString(),
                rectangle: this.restrictedBounds,
                parameters : {
                    transparent : 'true',
                    format : 'image/png'
                },
                enablePickFeatures: false
            }));
            this.wmsLayer.alpha = 0.7;
*/           
        }
    }

    angular
        .module('explorer.rockproperties.wmspoints', [])
        .factory("wmsPointsService", ["$rootScope", "gwsUtilService", "rocksConfigService", "wmsInspectorState",
            (
                $rootScope: ng.IRootScopeService,
                gwsUtilService: rpComponents.gwsUtilService.IGwsUtilService,
                rocksConfigService: rpComponents.config.IRocksConfigService,
                wmsInspectorState: rpComponents.wmsInspectorState.IWmsInspectorState
            ) =>
                new rpComponents.pointsService.WmsPointsService($rootScope, gwsUtilService, rocksConfigService, wmsInspectorState)])
        .controller("rocksWmsPointsCtrl", RocksWmsPointsCtrl)
        .directive("rocksWmsPointsLegend", function(): ng.IDirective {
            return {
                templateUrl: 'rockprops/wms-points-panel.html',
                controller:  RocksWmsPointsCtrl,
                controllerAs: 'rocksWmsPointsVM'
            };
        });
}
