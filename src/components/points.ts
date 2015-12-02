/// <reference path="../../typings/tsd.d.ts" />

declare var Cesium: any;

module rpComponents.pointsService {

    'use strict';

    export interface IRocksWmsPointsCtrl {}
    export class RocksWmsPointsCtrl implements IRocksWmsPointsCtrl {

        static $inject = ["$scope", "wmsPointsService", "rocksPanelService"];
        constructor(
            public $scope: ng.IScope,
            public wmsPointsService: rpComponents.pointsService.IWmsPointsService,
            public rocksPanelService: rpComponents.controlPanel.IRocksPanelService
        ){}
    }

    export interface IWmsPointsService {
        layers: [any];
        legendData: any;
        init(viewer: any): void;
        togglePoints(): boolean;
    }

    export class WmsPointsService implements IWmsPointsService {

        layers: [any];
        viewer: any;
        restrictedBounds: any;
        wmsServiceUrl: string;
        wmsLayer: any;
        legendData: any;
        pointsVisible: boolean;
        legendParamString: string = "";

        $inject = [
            "gwsUtilService",
            "rocksConfigService"
        ];

        constructor(
            public gwsUtilService: rpComponents.gwsUtilService.IGwsUtilService,
            public rocksConfigService: rpComponents.config.IRocksConfigService
        ) {}

        public init(viewer: any): void{

            this.wmsServiceUrl = this.rocksConfigService.config.geoserverWmsUrl;
            this.viewer = viewer;
            this.restrictedBounds = Cesium.Rectangle.fromDegrees(109, -45, 158, -8);

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
            }
            // init
            else {
                this.updatePointsLayer();
            }
            return this.pointsVisible;
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
                this.viewer.imageryLayers.remove(this.wmsLayer);
            }

            this.wmsLayer = this.viewer.imageryLayers.addImageryProvider(new Cesium.WebMapServiceImageryProvider({
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
        }
    }

    angular
        .module('explorer.rockproperties.wmspoints', [])
        .factory("wmsPointsService", ["gwsUtilService", "rocksConfigService",
            (
                gwsUtilService: rpComponents.gwsUtilService.IGwsUtilService,
                rocksConfigService: rpComponents.config.IRocksConfigService
            ) =>
                new rpComponents.pointsService.WmsPointsService(gwsUtilService, rocksConfigService)])
        .controller("rocksWmsPointsCtrl", RocksWmsPointsCtrl)
        .directive("rocksWmsPointsLegend", function(): ng.IDirective {
            return {
                templateUrl: 'rockprops/points-legend.html',
                controller:  RocksWmsPointsCtrl,
                controllerAs: 'rocksWmsPointsVM'
            };
        });
}
