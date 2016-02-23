/// <reference path="../../typings/tsd.d.ts" />

declare var Cesium: any;

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

            // register listener for pointInspector
            this.$rootScope.$on("viewer.click.left", (event: any, data: any) => {

                data.degrees = {
                    lat: Cesium.Math.toDegrees(data.cartographic.latitude),
                    lon: Cesium.Math.toDegrees(data.cartographic.longitude)
                };

                if(this.inspectorEnabled && data.hasOwnProperty('cartographic')){

                    this.wmsInspectorState.targetGeom = data;

                    this.wmsInspectorState.view = "LAYERSELECT";
                    this.wmsInspectorState.cameraHeight = Cesium.Ellipsoid.WGS84.cartesianToCartographic(this.viewer.camera.position).height;



                    console.log(this.viewer.imageryLayers);

                    for(var i = 0; i < this.viewer.imageryLayers.length; i++){

                        console.log(this.viewer.imageryLayers.get(i).imageryProvider.layers);

                    }

                }

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

        public toggleChecked(): void {
            this.masterChecked != this.masterChecked;
            for(var legend in this.legendData){
                this.legendData[legend]['isSelected'] = this.masterChecked;
            }
        }

        public togglePointInspector(): void {
            this.inspectorEnabled != this.inspectorEnabled;
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
