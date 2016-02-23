/// <reference path="../../typings/tsd.d.ts" />

declare var Cesium: any;

module rpComponents.wmsInspectorService {

    'use strict';

    export interface IWmsInspectorCtrl {}

    export class WmsInspectorCtrl implements IWmsInspectorCtrl {
        static $inject = ["$scope", "wmsInspectorState", "wmsInspectorService"];
        constructor(
            public $scope: ng.IScope,
            public wmsInspectorState: rpComponents.wmsInspectorState.IWmsInspectorState,
            public wmsInspectorService: rpComponents.wmsInspectorService.IWmsInspectorService
        ){}
    }

    export interface IWmsInspectorService {
        features: any[];
        rocksFeature: any;
        featureInfo: any;
        isLoading: boolean;
        loadingSpinner: any;
    }
    export class WmsInspectorService implements IWmsInspectorService {

        public features: any[];
        public rocksFeature: any;
        public featureInfo: any;
        public isLoading: boolean = false;
        public loadingSpinner: any;
        rocksConfig: any;

        URL_EXCLUDE: string = "?SERVICE=WMS&";
        SURFACE_GEO: string = "GA_Surface_Geology_of_Australia";

        $inject = [
            "$rootScope",
            "$http",
            "wmsInspectorState",
            "assetsService",
            "configService",
            "loadingSpinnerService",
            "gwsUtilService"
        ];

        constructor(
            public $rootScope: ng.IRootScopeService,
            public $http: ng.IHttpService,
            public wmsInspectorState: rpComponents.wmsInspectorState.IWmsInspectorState,
            public assetsService: any,
            public configService: any,
            public loadingSpinnerService: rpComponents.spinnerService.ILoadingSpinnerService,
            public gwsUtilService: rpComponents.gwsUtilService.IGwsUtilService
        ) {
            // load feature classes
            assetsService.getReferenceFeatureClasses().then((features: any) => {
                console.log(features);
                this.features = features;
            });

            // setup rocks feature
            configService.getConfig().then((config: any) => {
                this.rocksConfig = config.rockProps;
                this.rocksFeature = {
                    wmsUrl: this.rocksConfig.geoserverWmsUrl
                };
            });
        }

        // TODO we should restrict the query to visible layers
        public queryRocks(): void {

            if(!this.rocksFeature.hasOwnProperty('layers') && this.gwsUtilService.wmsLayerNames){
                this.rocksFeature.layers = [];
                for(var i = 0; i < this.gwsUtilService.wmsLayerNames.length; i++){
                   this.rocksFeature.layers.push(this.rocksConfig.geoserverWmsLayerPrefix + this.gwsUtilService.wmsLayerNames[i]);
               }
            }

            this.queryFeature(this.rocksFeature);
        }

        public queryFeature(feature: any): void {

            console.log("queryFeature");
            console.log(feature);

            // TODO analytics
            //ga('send', 'event', 'rock-properties', 'click', 'wms point inspected: '+feature.name);

            // set view
            this.wmsInspectorState.view = "FEATUREINFO";
            this.toggleLoading();

            var targetUrl: string = feature.wmsUrl;
            var targetLayers: string[] = feature.layers;

            // clean any endpoints already containing '?'
            if(targetUrl.indexOf(this.URL_EXCLUDE) > -1){
                targetUrl = targetUrl.substring(0, (targetUrl.length - this.URL_EXCLUDE.length));
            }

            // surface geology has scale dependencies, so we need to check
            // zoom (aka camera height) to ensure we query the correct layer
            if(targetUrl.indexOf(this.SURFACE_GEO) >  -1){

                if(this.wmsInspectorState.cameraHeight <= 340000){
                    targetLayers = [targetLayers[0]];
                }
                else {
                    targetLayers = [targetLayers[1]];
                }
            }

            var queryString =

                '?SERVICE=WMS'+
                '&REQUEST=GetFeatureInfo'+
                '&VERSION=1.1.1'+
                '&LAYERS='+ targetLayers +
                '&STYLES='+
                '&SRS=EPSG%3A4326'+
                '&FORMAT=image%2Fpng'+

                // we use the click pos as the bottom left corner
                // and offset the top right by ~30 meters
                // (can be hard to click on a point if res is too fine)
                '&BBOX=' +
                this.wmsInspectorState.targetGeom.degrees.lon +','+
                this.wmsInspectorState.targetGeom.degrees.lat +','+
                (this.wmsInspectorState.targetGeom.degrees.lon + 0.0003) +','+
                (this.wmsInspectorState.targetGeom.degrees.lat + 0.0003) +

                '&QUERY_LAYERS='+ targetLayers +
                '&INFO_FORMAT=text%2Fhtml'+
                '&FEATURE_COUNT=50'+
                '&WIDTH=2' +
                '&HEIGHT=2'+
                '&X=1'+
                '&Y=1'+
                '&TRANSPARENT=true'+
                '&EXCEPTIONS=application%2Fvnd.ogc.se_xml';

            console.log("QUERY");
            console.log(targetUrl+queryString);

            // send the query
            this.$http.get(targetUrl + queryString).success((data: any) => {

                this.featureInfo = data;
                //wmsInspectorState.isOn = true;

                this.toggleLoading();

            })
            .error(function(data: any, status: any, headers: any, config: any){

                console.log("Couldn't load WMS GetFeatureInfo");
                this.featureInfo = "<h5>Couldn't load WMS GetFeatureInfo for this layer.</h5><p>You may not be able to access this function for some layers.</p>";

                this.toggleLoading();
                //wmsInspectorState.isOn = true;
            });


        }


        public toggleLoading(): void {

            if(this.loadingSpinner){
                this.isLoading = !this.isLoading;
            }

            else {
                this.loadingSpinner = this.loadingSpinnerService.addSpinner({
                    width: 60,
                    height: 60,
                    container: "#rocks-inspector-loading",
                    id: "rocks-inspector-spinner"
                });
                this.loadingSpinner();
                this.isLoading = true;
            }
        }
    }




    angular
        .module('explorer.rockproperties.inspector', ['explorer.assets'])
        .factory("wmsInspectorService", [
            "$rootScope",
            "$http",
            "wmsInspectorState",
            "assetsService",
            "configService",
            "loadingSpinnerService",
            "gwsUtilService",
            (
                $rootScope: ng.IRootScopeService,
                $http: ng.IHttpService,
                wmsInspectorState: rpComponents.wmsInspectorState.IWmsInspectorState,
                assetsService: any,
                configService: any,
                loadingSpinnerService: rpComponents.spinnerService.ILoadingSpinnerService,
                gwsUtilService: rpComponents.gwsUtilService.IGwsUtilService
            ) =>
                new rpComponents.wmsInspectorService.WmsInspectorService(
                    $rootScope,
                    $http,
                    wmsInspectorState,
                    assetsService,
                    configService,
                    loadingSpinnerService,
                    gwsUtilService
                )])
        .controller("wmsInspectorCtrl", rpComponents.wmsInspectorService.WmsInspectorCtrl)
        .directive("wmsInspectorPanel", function(): ng.IDirective {
            return {
                templateUrl: 'rockprops/wms-inspector-panel.html',
                controller:  WmsInspectorCtrl,
                controllerAs: 'wmsInspectorVM'
            };
        });
}


