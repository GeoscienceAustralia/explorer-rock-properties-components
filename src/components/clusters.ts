/// <reference path="../../typings/tsd.d.ts" />

declare var Cesium: any;
declare var d3: any;

module rpComponents.clusterService {

    'use strict';

    export interface IRocksClusterFilterCtrl {}
    export class RocksClusterFilterCtrl implements IRocksClusterFilterCtrl {

        static $inject = ["$scope", "clusterService", "rocksPanelService", "rocksFiltersService"];
        constructor(
            public $scope: ng.IScope,
            public clusterService: rpComponents.clusterService.IClusterService,
            public rocksPanelService: rpComponents.controlPanel.IRocksPanelService,
            public rocksFiltersService: rpComponents.filters.IRocksFiltersService
        ){}
    }

    export interface IClusterService {

        viewer: any;
        serviceUrl: string;
        clustersCollection: any;

        init(viewer: any): void;
        toggleClusters(): boolean;
        getClusters(heightIndex: number, extent: any): [rpComponents.cluster.ICluster];
        reCluster(): void;
        buildClusterInstance(cluster: rpComponents.cluster.ICluster, props: any): any;
        buildLabel(cluster: rpComponents.cluster.ICluster, props: any): any;
        drawClusters(sphereInstances: any, labelCollection: any): void;
        setHighlighted(id: any, highlight: boolean): void;
        clearHighlighted(): void;
    }

    export class ClusterService implements IClusterService {

        viewer: any;
        pickHandler: any;
        pickHandlerAction: any;
        serviceUrl: string;
        clusterPrimitive: any;
        clustersCollection: any;
        clusterRangeMeta: any = {
            maxExtrudeHeight: 500000
        };

        targetId: any;
        summarySpinner: any;

        static $inject = [
            "$http",
            "$rootScope",
            "zoomLevelService",
            "clusterChartService",
            "loadingSpinnerService",
            "rocksConfigService"
        ];

        constructor(
            public $http: ng.IHttpService,
            public $rootScope: ng.IRootScopeService,
            public zoomLevelService: rpComponents.zoom.IZoomLevelService,
            public clusterChartService: rpComponents.chartService.IClusterChartService,
            public loadingSpinnerService: rpComponents.spinnerService.ILoadingSpinnerService,
            public rocksConfigService: rpComponents.config.IRocksConfigService
        ) {}

        /**
         *
         * @param viewer
         * @param serviceUrl
         * @param usePicking
         */
        init(viewer: any): void {

            this.viewer = viewer;
            this.zoomLevelService.viewer = viewer;
            this.serviceUrl = this.rocksConfigService.config.clusterServiceUrl;

            this.$rootScope.$on('rocks.clusters.update', () => {
                this.reCluster();
            });

            // disable picking if you don't need charts
            if(this.rocksConfigService.config.useClusterPicking){

                this.pickHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
                this.pickHandlerAction = (movement: any) => {

                    // TODO revise cluster pick validation when we decide on format for service
                    var pick = this.viewer.scene.pick(movement.position);
                    if (Cesium.defined(pick) && Cesium.defined(pick.id)) {

                        this.clearHighlighted();
                        this.targetId = pick.id;
                        this.queryCluster(this.targetId);
                        this.setHighlighted(this.targetId, true);
                    }
                };

                this.pickHandler.setInputAction(this.pickHandlerAction, Cesium.ScreenSpaceEventType.LEFT_CLICK);
            }
        }

        setHighlighted(id: any, highlight: boolean){

            var attributes = this.clusterPrimitive.getGeometryInstanceAttributes(id);

            if(attributes && highlight){
                attributes.prevColor = attributes.color;
                attributes.color = Cesium.ColorGeometryInstanceAttribute.toValue(Cesium.Color.fromCssColorString('#ff00ff').withAlpha(1));
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

        toggleClusters(): boolean {

            if(this.clustersCollection){

                this.clustersCollection.show = !this.clustersCollection.show;
                this.zoomLevelService.setActive(this.clustersCollection.show);

                if(this.clustersCollection.show){
                    this.pickHandler.setInputAction(this.pickHandlerAction, Cesium.ScreenSpaceEventType.LEFT_CLICK);
                }
                else {
                    this.pickHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
                }

                this.reCluster();
            }

            // init clusters
            else {
                this.clustersCollection = new Cesium.PrimitiveCollection();
                this.viewer.scene.primitives.add(this.clustersCollection);

                this.zoomLevelService.setActive(true);
                this.reCluster();
            }

            return this.clustersCollection.show;
        }

        /**
         *
         * This will be extended to use extent + zoom/index and filters on cluster service
         * TODO where will we get our extent - shouldn't depend on minimap
         * TODO filters
         *
         * @returns {IHttpPromise<T>}
         */
        public getClusters(): any {

            // debug
            return this.$http({
                method: 'GET',
                url: this.serviceUrl +"/"+ this.zoomLevelService.nextIndex + '.json',
                headers: {
                    'Content-Type': 'application/json'
                },
                data: {
                    heightIndex: this.zoomLevelService.nextIndex,
                    extent: this.zoomLevelService.getViewExtent(100)
                }
            });
        }

        /**
         *
         * Gets a summary of cluster data to pass to chartService.
         *
         * @param cluster
         */
        public queryCluster(cluster: rpComponents.cluster.ICluster): void {

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

            // DEBUG
            // TODO update once establish cluster summary service
            this.$http({
                method: 'GET',
                url: this.serviceUrl + '/cluster.json',
                headers: {
                    'Content-Type': 'application/json'
                },
                data: {
                    targetCluster: cluster
                }
            }).then((response: any) => {

                if(response.hasOwnProperty('data')){
                    this.clusterChartService.buildChart(response.data);
                }
            });

        }

        /**
         *
         * We get a performance benefit when we use fewer
         * primitives/collections to draw multiple static geometries.
         *
         */
        reCluster = (): void => {

            var clusterInstances: any = [];
            var labelCollection: any = new Cesium.LabelCollection();

            this.getClusters().then((response: any) => {

                if(response.data){

                    var clusters: [rpComponents.cluster.ICluster] = response.data;

                    // use d3 to build a scale for our extrude heights; we'll create a diff scale
                    // for each zoom level, as we can't guarantee they'll start at the top and work down
                    this.clusterRangeMeta.maxCount = d3.max(clusters, function(d: any) { return d.count; });
                    this.clusterRangeMeta.scale = d3.scale.linear()
                        .domain([0, this.clusterRangeMeta.maxCount])
                        .range([0, this.clusterRangeMeta.maxExtrudeHeight]);

                    for(var i = 0; i < clusters.length; i++){

                        var clusterProps: any = this.computeClusterAttributes(clusters[i].count);
                        clusterInstances.push(this.buildClusterInstance(clusters[i], clusterProps));
                        labelCollection.add(this.buildLabel(clusters[i], clusterProps));
                    }

                    this.drawClusters(clusterInstances, labelCollection);
                }
                else {
                    console.log("got no clusters");
                    console.log(response);
                }
            });
        };


        drawClusters(instances: any, labelCollection: any): void {

            this.clustersCollection.removeAll();
            this.clusterPrimitive = new Cesium.Primitive({
                geometryInstances : instances,
                appearance : new Cesium.PerInstanceColorAppearance({
                    translucent : true,
                    closed : true
                })
            });
            this.clustersCollection.add(this.clusterPrimitive);
            this.clustersCollection.add(labelCollection);
        }

        buildClusterInstance(cluster: rpComponents.cluster.ICluster, clusterProps: any): any {


            var instance = new Cesium.GeometryInstance({
                geometry : new Cesium.CircleGeometry({
                    center : Cesium.Cartesian3.fromDegrees(cluster.lon, cluster.lat),
                    radius : clusterProps.radius,
                    vertexFormat : Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
                    extrudedHeight: clusterProps.extrudeHeight //cluster.count * 10
                }),
                id : cluster,
                attributes : {
                    color : Cesium.ColorGeometryInstanceAttribute.fromColor(clusterProps.color)
                }
            });

            return instance;
        }

        buildLabel(cluster: rpComponents.cluster.ICluster, clusterProps: any): any {

            return {
                position : Cesium.Cartesian3.fromDegrees(cluster.lon, cluster.lat, 100 + clusterProps.extrudeHeight),
                text: cluster.count.toString(),
                fillColor: Cesium.Color.BLACK,
                outlineColor: Cesium.Color.RED,
                // TODO review labelling
                font: (40 - this.zoomLevelService.nextIndex)+'px arial, sans-serif',
                horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                id: cluster
            };
        }

        // stop doing this twice - once for cluster + label
        computeClusterAttributes(count: number): any {

            var attrs: any = {
                radius: 100000 * (this.zoomLevelService.nextIndex / 10),
                extrudeHeight: this.clusterRangeMeta.scale(count) * (this.zoomLevelService.nextIndex / 10)
            };
            if(count < 100){
                attrs.color = Cesium.Color.fromCssColorString('#4781cd').withAlpha(0.5);
            }
            else if(count >= 10 && count < 1000){
                attrs.color = Cesium.Color.fromCssColorString('#0fc70e').withAlpha(0.5);
            }
            else {
                attrs.color = Cesium.Color.fromCssColorString('#ff0000').withAlpha(0.5);
            }
            return attrs;
        }
    }

    angular
        .module('explorer.rockproperties.clusters', [])
        .controller("rocksClusterFilterCtrl", RocksClusterFilterCtrl)
        .directive("rocksClusterFilters", function(): ng.IDirective {
            return {
                templateUrl: 'rockprops/cluster-filters.html',
                controller:  RocksClusterFilterCtrl,
                controllerAs: 'rocksClusterFilterVM'
            };
        })
        .factory("clusterService", [
            "$http",
            "$rootScope",
            "zoomLevelService",
            "clusterChartService",
            "loadingSpinnerService",
            "rocksConfigService",
        (
            $http: ng.IHttpService,
            $rootScope: ng.IRootScopeService,
            zoomLevelService: rpComponents.zoom.IZoomLevelService,
            clusterChartService: rpComponents.chartService.IClusterChartService,
            chartSpinnerService: rpComponents.spinnerService.ILoadingSpinnerService,
            rocksConfigService: rpComponents.config.IRocksConfigService
        ) =>
        new rpComponents.clusterService.ClusterService(
            $http,
            $rootScope,
            zoomLevelService,
            clusterChartService,
            chartSpinnerService,
            rocksConfigService
        )]);

}
