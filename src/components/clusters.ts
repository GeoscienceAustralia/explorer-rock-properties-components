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

        toggleClusters(): boolean;
        getClusters(heightIndex: number, extent: any): any;
        reCluster(): void;
        buildClusterInstance(cluster: any, props: any): any;
        buildLabel(cluster: any, props: any): any;
        drawClusters(sphereInstances: any, labelCollection: any): void;
    }

    export class ClusterService implements IClusterService {

        viewer: any;
        serviceUrl: string;
        clusterPrimitive: any;
        clustersCollection: any;
        clusterRangeMeta: any = {
            maxExtrudeHeight: 500000
        };

        static $inject = [
            "$http",
            "$rootScope",
            "zoomLevelService",
            "clusterChartService",
            "loadingSpinnerService",
            "rocksConfigService",
            "clusterInspectorService"
        ];

        constructor(
            public $http: ng.IHttpService,
            public $rootScope: ng.IRootScopeService,
            public zoomLevelService: rpComponents.zoom.IZoomLevelService,
            public clusterChartService: rpComponents.chartService.IClusterChartService,
            public loadingSpinnerService: rpComponents.spinnerService.ILoadingSpinnerService,
            public rocksConfigService: rpComponents.config.IRocksConfigService,
            public clusterInspectorService: rpComponents.clusterInspector.IClusterInspectorService

        ) {
            this.$rootScope.$on('rocks.config.ready', () => {
                this.viewer = this.rocksConfigService.viewer;
                this.serviceUrl = this.rocksConfigService.config.rocksServiceUrl;
            });

            this.$rootScope.$on('rocks.clusters.update', () => {
                this.reCluster();
            });
        }

        toggleClusters(): boolean {

            if(this.clustersCollection){

                this.clustersCollection.show = !this.clustersCollection.show;
                this.zoomLevelService.setActive(this.clustersCollection.show);

                if(this.clustersCollection.show){
                    this.clusterInspectorService.setPickEnabled(true);
                }
                else {
                    this.clusterInspectorService.setPickEnabled(false);
                }

                this.reCluster();
            }

            // init clusters
            else {
                this.clustersCollection = new Cesium.PrimitiveCollection();
                this.viewer.scene.primitives.add(this.clustersCollection);
                this.zoomLevelService.setActive(true);
                this.reCluster();
                this.clusterInspectorService.setPickEnabled(true);
            }

            return this.clustersCollection.show;
        }

        /**
         *
         * TODO filters
         *
         * @returns {IHttpPromise<T>}
         */
        public getClusters(): any {

            // args
            var args: string =
                '?zoom='+this.zoomLevelService.nextIndex +
                '&xmin='+ this.zoomLevelService.getViewExtent(100).west +
                '&xmax='+ this.zoomLevelService.getViewExtent(100).east +
                '&ymin='+ this.zoomLevelService.getViewExtent(100).south +
                '&ymax='+ this.zoomLevelService.getViewExtent(100).north;

            console.log("summary query: "+this.serviceUrl + args);


            return this.$http({
                method: 'GET',

                // real service
                //url: this.serviceUrl + 'summary' + args

                // mock
                url: this.serviceUrl +'mock-summary-'+ this.zoomLevelService.nextIndex + '.json'
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

                if(response.data && response.data.features){

                    var clusters: [any] = response.data.features;

                    // use d3 to build a scale for our extrude heights; we need to build a diff scale
                    // for each zoom level, as we can't guarantee they'll start at the top and work down
                    // (if we add persistence)
                    this.clusterRangeMeta.maxCount = d3.max(clusters, function(d: any) { return d.properties.count; });
                    this.clusterRangeMeta.scale = d3.scale.linear()
                        .domain([0, this.clusterRangeMeta.maxCount])
                        .range([0, this.clusterRangeMeta.maxExtrudeHeight]);

                    for(var i = 0; i < clusters.length; i++){

                        // tag id with type for pick handling
                        clusters[i].properties['featureType'] = 'rockPropsCluster';

                        var clusterProps: any = this.computeClusterAttributes(clusters[i].properties.count);
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

            this.clusterInspectorService.setClusterPrimitive((this.clusterPrimitive));

            this.clustersCollection.add(this.clusterPrimitive);
            this.clustersCollection.add(labelCollection);
        }

        buildClusterInstance(cluster: any, clusterProps: any): any {

            return new Cesium.GeometryInstance({
                geometry : new Cesium.CircleGeometry({
                    center : Cesium.Cartesian3.fromDegrees(
                        cluster.geometry.coordinates[0],
                        cluster.geometry.coordinates[1]
                    ),
                    radius : clusterProps.radius,
                    vertexFormat : Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
                    extrudedHeight: clusterProps.extrudeHeight
                }),
                id : cluster,
                attributes : {
                    color : Cesium.ColorGeometryInstanceAttribute.fromColor(clusterProps.color)
                }
            });
        }

        buildLabel(cluster: any, clusterProps: any): any {

            return {
                position : Cesium.Cartesian3.fromDegrees(
                    cluster.geometry.coordinates[0],
                    cluster.geometry.coordinates[1],
                    100 + clusterProps.extrudeHeight
                ),
                text: cluster.properties.count.toString(),
                fillColor: Cesium.Color.BLACK,
                outlineColor: Cesium.Color.RED,
                // TODO review labelling
                font: (40 - this.zoomLevelService.nextIndex)+'px arial, sans-serif',
                horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                id: cluster
            };
        }

        computeClusterAttributes(count: number): any {

            var attrs: any = {
                // tweak these to scale cluster size/extrude on zoom
                radius: 100000 / (this.zoomLevelService.nextIndex / 5),
                extrudeHeight: this.clusterRangeMeta.scale(count) / (this.zoomLevelService.nextIndex / 3)
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
            "clusterInspectorService",
        (
            $http: ng.IHttpService,
            $rootScope: ng.IRootScopeService,
            zoomLevelService: rpComponents.zoom.IZoomLevelService,
            clusterChartService: rpComponents.chartService.IClusterChartService,
            chartSpinnerService: rpComponents.spinnerService.ILoadingSpinnerService,
            rocksConfigService: rpComponents.config.IRocksConfigService,
            clusterInspectorService: rpComponents.clusterInspector.IClusterInspectorService
        ) =>
        new rpComponents.clusterService.ClusterService(
            $http,
            $rootScope,
            zoomLevelService,
            clusterChartService,
            chartSpinnerService,
            rocksConfigService,
            clusterInspectorService
        )]);

}
