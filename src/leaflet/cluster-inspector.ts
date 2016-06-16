/// <reference path="../../typings/browser.d.ts" />
/// <reference path="../components/control-panel" />
/// <reference path="../components/charts" />


declare var ga: any;

module rpComponents.clusterInspector {

    'use strict';

    export interface IClusterInspectorCtrl {}
    export class ClusterInspectorCtrl implements IClusterInspectorCtrl {
        static $inject = ["$scope", "clusterInspectorService", "rocksPanelService"];
        constructor(
            public $scope: ng.IScope,
            public clusterInspectorService: rpComponents.clusterInspector.IClusterInspectorService,
            public rocksPanelService: rpComponents.controlPanel.IRocksPanelService
        ){}
    }

    export interface IClusterInspectorService {
        inspectMode: string;
        listReady: boolean;
        listFeatures: any;
        listIndex: number;
        maxListStep: number;

        setPickEnabled(enabled: boolean): void;
        setClusterPrimitive(primitive: any): void;
        loadNextListStep(): void;
    }
    
    export interface IPagingState {
        count: number;
        total: number;
        
        more():boolean;
    }
    
    export class PagingState implements IPagingState {
        public count: number;
        public total: number;
        
        constructor(
            count: number,
            total: number
        ) {
            this.count = count;
            this.total = total;
        }
        
        public more(): boolean {
            return this.total > this.count;  
        } 
    }
    
    export class ClusterInspectorService implements IClusterInspectorService {

        public inspectMode: string = "CHART";
        public listReady: boolean = false;
        public listFeatures: any;
        public listIndex: number;
        public pageIndex: number;
        public pagingState: PagingState;

        // TODO decide reasonable step size when plugged into real service
        public maxListStep: number = 100;

        map: any;
        serviceUrl: string;
        pickHandler: any;
        pickHandlerAction: any;
        clusterPrimitive: any;

        targetPos: any;
        targetId: any;
        summarySpinner: any;
        listSpinner: any;

        static $inject = [
            "$http",
            "$rootScope",
            "$timeout",
            "zoomLevelService",
            "loadingSpinnerService",
            "rocksConfigService",
            "clusterChartService",
            "clusterFilterState"
        ];

        constructor(
            public $http: ng.IHttpService,
            public $rootScope: ng.IRootScopeService,
            public $timeout: ng.ITimeoutService,
            public zoomLevelService: rpComponents.zoom.IZoomLevelService,
            public loadingSpinnerService: rpComponents.spinnerService.ILoadingSpinnerService,
            public rocksConfigService: rpComponents.config.IRocksConfigService,
            public clusterChartService: rpComponents.chartService.IClusterChartService,
            public clusterFilterState: rpComponents.filters.IClusterFilterState
        ) {
            this.$rootScope.$on('rocks.config.ready', () => {
                this.init();
            });
        }

        /**
         *
         
         * @param map
         * @param summaryService
         * @param usePicking
         */
        init(): void {
            this.map = this.rocksConfigService.map;
            this.serviceUrl = this.rocksConfigService.config.rocksServiceUrl;

            // setup our pick handler
            if(this.rocksConfigService.config.useClusterPicking){
               this.$rootScope.$on('rocks.cluster.selected', (event: any, data: any) => {
                  this.targetPos = data;
                        
                  this.listReady = false;
                  if(this.inspectMode == "CHART"){
                     this.chartClusterQuery();
                  } else {
                     this.listIndex = 0;
                     this.listClusterQuery();
                  }
               });
            }
        }

        /**
         *
         * Gets a summary of cluster data to pass to chartService.
         *
         * @param cluster
         */
        public chartClusterQuery(): void {

            //  spinner for summary chart load
            if(this.summarySpinner){
                document.getElementById("cluster-summary-chart-loading").style.display = 'block';
            }
            else {
                this.summarySpinner = this.loadingSpinnerService.addSpinner({
                    width: 100,
                    height: 100,
                    container: "#cluster-summary-chart-loading",
                    id: "chart-spinner"
                });
                this.summarySpinner();
            }

            var args: string =
                '/'+this.targetPos.zoom +
                '/'+ this.targetPos.x +
                '/'+ this.targetPos.y +
                '?v=1' +
                this.clusterFilterState.filterQuery;

            var query: string = this.serviceUrl + 'query' + args;

            console.log("query");
            console.log(query);

            this.$http({

                method: 'GET',
                url: query

            }).then((response: any) => {

                if(response.hasOwnProperty('data')){
                    this.clusterChartService.buildChart(response.data);
                }
            });

            ga('send', 'event', 'explorer-rock-properties', 'click', 'cluster inspector summary charts');
        }

        public loadNextListStep(): void {
            this.listIndex += this.maxListStep;

            console.log("loadNextListStep "+ this.listIndex);

            this.listClusterQuery();
        }

        public listClusterQuery(): void {

            console.log("listClusterQuery");

            //  spinner for summary chart load
            if(this.listSpinner){
                document.getElementById("cluster-result-list-loading").style.display = 'block';
            }
            else {
                this.listSpinner = this.loadingSpinnerService.addSpinner({
                    width: 100,
                    height: 100,
                    container: "#cluster-result-list-loading",
                    id: "cluster-result-list-spinner"
                });
                this.listSpinner();
            }

            var args: string =
                '/'+this.targetPos.zoom +
                '/'+ this.targetPos.x +
                '/'+ this.targetPos.y +
                '?maxCount='+this.maxListStep +
                '&startIndex='+ this.listIndex +
                this.clusterFilterState.filterQuery;

            var query: string = this.serviceUrl + 'features' + args;

            console.log("features query");
            console.log(query);

            this.$http({
                method: 'GET',
                url: query
            }).then((response: any) => {
                if(response.hasOwnProperty('data')){
                    this.$timeout(() => {
                        document.getElementById("cluster-result-list-loading").style.display = 'none';
                        this.listReady = true;

                        // step, merge features
                        if (this.listIndex != 0) {
                            this.listFeatures.features = this.listFeatures.features.concat(response.data.features);
                        } else {
                            this.listFeatures = response.data;
                        }
                        let morePages = this.listFeatures.features.length < this.listFeatures.totalFeatures;
                        this.pagingState = new PagingState(this.listFeatures.features.length, this.listFeatures.totalFeatures);
                    }, 1000);
                }
            });

            ga('send', 'event', 'explorer-rock-properties', 'click', 'cluster inspector feature list (startIndex: '+ this.listIndex +')');
        }

        setPickEnabled(enabled: boolean): void {

            if(enabled){
                //this.pickHandler.setInputAction(this.pickHandlerAction, Cesium.ScreenSpaceEventType.LEFT_CLICK);
            }
            else {
                //this.pickHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
            }
        }

        setClusterPrimitive(primitive: any){
            this.clusterPrimitive = primitive;
        }

        setHighlighted(id: any, highlight: boolean){

            var attributes = this.clusterPrimitive.getGeometryInstanceAttributes(id);

            if(attributes && highlight){
                attributes.prevColor = attributes.color;
                attributes.color = '#ff00ff';
            }
        }

        clearHighlighted(){
            if(this.targetId){
                var attributes = this.clusterPrimitive.getGeometryInstanceAttributes(this.targetId);
                if(attributes && attributes.hasOwnProperty('prevColor')) {
                    attributes.color = attributes.prevColor;
                }
            }
        }
    }

    angular
        .module('explorer.rockproperties.clusterinspector', [])
        .controller("clusterInspectorCtrl", ClusterInspectorCtrl)
        .directive("rocksClusterInspectorPanel", function(): ng.IDirective {
            return {
                templateUrl: 'rockprops/cluster-inspector.html',
                controller:  ClusterInspectorCtrl,
                controllerAs: 'clusterInspectorVM'
            };
        })
        .factory("clusterInspectorService", [
            "$http",
            "$rootScope",
            "$timeout",
            "zoomLevelService",
            "loadingSpinnerService",
            "rocksConfigService",
            "clusterChartService",
            "clusterFilterState",
        (
            $http: ng.IHttpService,
            $rootScope: ng.IRootScopeService,
            $timeout: ng.ITimeoutService,
            zoomLevelService: rpComponents.zoom.IZoomLevelService,
            chartSpinnerService: rpComponents.spinnerService.ILoadingSpinnerService,
            rocksConfigService: rpComponents.config.IRocksConfigService,
            clusterChartService: rpComponents.chartService.IClusterChartService,
            clusterFilterState: rpComponents.filters.IClusterFilterState
        ) =>
            new rpComponents.clusterInspector.ClusterInspectorService(
                $http,
                $rootScope,
                $timeout,
                zoomLevelService,
                chartSpinnerService,
                rocksConfigService,
                clusterChartService,
                clusterFilterState
            )]);
}
