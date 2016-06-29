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
        deselectLayers(): void;
        someChecked(): boolean;
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
        defaultWmsLayers: string[];

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

        public init(): void {

            this.wmsServiceUrl = this.rocksConfigService.config.geoserverWmsUrl;
            this.defaultWmsLayers = this.rocksConfigService.config.defaultWmsLayers?this.rocksConfigService.config.defaultWmsLayers: [];
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
            if(this.wmsLayer) {
                if(this.pointsVisible) {
                   this.map.addLayer(this.wmsLayer);
                } else {
                   this.map.removeLayer(this.wmsLayer);
                }
            } else {
                this.updatePointsLayer();
            }
            return this.pointsVisible;
        }

        public someChecked(): boolean {
           var checked = false;
           angular.forEach(this.legendData, (layer: any) => {
              checked = layer.isSelected || checked; 
           }); 
           return checked;      
        }

        public deselectLayers(): void {
           angular.forEach(this.legendData, (layer: any) => {
              layer.isSelected = false; 
           });
           this.updatePointsLayer();
        }

        public toggleLayer(name: string): void {
           this.updatePointsLayer();
        }

        getLegendData(): void{
            this.legendData = {};
            for(var i = 0; i < this.layers.length; i++) {
                this.legendData[this.layers[i]] = {
                    legendUrl : this.wmsServiceUrl + this.legendParamString + this.layers[i],
                    isSelected : isSelected(this.layers[i], this.defaultWmsLayers)
                };
            }
            
            function isSelected(name: string, layers: string[]) {
               if(layers.length) {
                  // Tempted to use array indexOf but got scared someone may try port this to something really old.
                  var findIn = layers.join(",");
                  return findIn.indexOf(name) > -1;
               } else {
                  return true;
               }
            }
        }

        updatePointsLayer(): void{
            var targetLayers: L.TileLayer[] = [];
            for(var legend in this.legendData){
                if (this.legendData[legend] && this.legendData[legend]['isSelected'] === true) {
                    targetLayers.push(L.tileLayer.wms(this.wmsServiceUrl, {
                        layers: legend,
                        transparent: true,
                        format: 'image/png'
                     }));
                }
            }

            if(this.wmsLayer){
                this.map.removeLayer(this.wmsLayer);
            }

            ga('send', 'event', 'explorer-rock-properties', 'click', 'update wms points layer: '+targetLayers.toString());

            this.wmsLayer = L.layerGroup(targetLayers);
            this.map.addLayer(this.wmsLayer);
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
