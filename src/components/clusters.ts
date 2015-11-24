/// <reference path="../../typings/tsd.d.ts" />

declare var Cesium: any;

module rpComponents.clusterService {

    'use strict';

    export interface IClusterService {

        viewer: any;
        serviceUrl: string;
        clustersCollection: any;

        toggleClusters(): void;
        getClusters(heightIndex: number, extent: any): [rpComponents.cluster.ICluster];
        reCluster(): void;
        buildSphereInstance(cluster: rpComponents.cluster.ICluster): any;
        buildLabel(cluster: rpComponents.cluster.ICluster): any;
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
        targetId: any;
        summarySpinner: any;

        static $inject = [
            "$http",
            "$rootScope",
            "zoomLevelService",
            "clusterChartService",
            "chartSpinnerService"
        ];

        constructor(
            public $http: ng.IHttpService,
            public $rootScope: ng.IRootScopeService,
            public zoomLevelService: rpComponents.zoom.IZoomLevelService,
            public clusterChartService: rpComponents.chartService.IClusterChartService,
            public chartSpinnerService: rpComponents.spinnerService.IChartSpinnerService
        ) {}

        /**
         *
         * @param viewer
         * @param serviceUrl
         * @param usePicking
         */
        init(viewer: any, serviceUrl: string, usePicking: boolean): void {

            this.viewer = viewer;
            this.zoomLevelService.viewer = viewer;
            this.serviceUrl = serviceUrl;

            this.$rootScope.$on('rocks.clusters.update', () => {
                this.reCluster();
            });

            // disable picking if you don't need charts
            if(usePicking){

                this.pickHandler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
                this.pickHandlerAction = (movement: any) => {

                    // TODO revise cluster pick validation when we decide on format for service
                    var pick = this.viewer.scene.pick(movement.position);
                    if (Cesium.defined(pick) && pick.hasOwnProperty('id') && pick.id.hasOwnProperty('lat')) {

                        //if(this.targetId) this.setHighlighted(this.targetId, false);

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
                attributes.color = Cesium.ColorGeometryInstanceAttribute.toValue(Cesium.Color.fromCssColorString('#F5ED05').withAlpha(1));
            }
            //else if(attributes && attributes.hasOwnProperty('prevColor')) {
            //    attributes.color = attributes.prevColor;
            //}
        }

        clearHighlighted(){
            if(this.targetId){
                var attributes = this.clusterPrimitive.getGeometryInstanceAttributes(this.targetId);
                if(attributes && attributes.hasOwnProperty('prevColor')) {
                    attributes.color = attributes.prevColor;
                }
            }
        }

        toggleClusters(): void {

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
                url: this.serviceUrl + this.zoomLevelService.nextIndex + '.json',
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
                this.summarySpinner = this.chartSpinnerService.addSpinner({
                    width: 100,
                    height: 100,
                    container: "#cluster-summary-chart-loading",
                    id: "chart-spinner"
                });
                this.summarySpinner();
            }

            // debug
            this.$http({
                method: 'GET',
                url: this.serviceUrl + 'cluster-summary.json',
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
         * We get a performance benefit when we use fewer primitives/collections to draw multiple static geometries.
         *
         */
        reCluster = (): void => {

            var sphereInstances: any = [];
            var labelCollection: any = new Cesium.LabelCollection();

            this.getClusters().then((response: any) => {

                if(response.data){

                    var clusters: [rpComponents.cluster.ICluster] = response.data;

                    for(var i = 0; i < clusters.length; i++){
                        sphereInstances.push(this.buildSphereInstance(clusters[i]));
                        labelCollection.add(this.buildLabel(clusters[i]));
                    }

                    this.drawClusters(sphereInstances, labelCollection);
                }
                else {
                    console.log("got no clusters");
                }
            });
        }


        drawClusters(sphereInstances: any, labelCollection: any): void {

            this.clustersCollection.removeAll();
            this.clusterPrimitive = new Cesium.Primitive({
                geometryInstances : sphereInstances,
                appearance : new Cesium.PerInstanceColorAppearance({
                    translucent : true,
                    closed : true
                })
            });
            this.clustersCollection.add(this.clusterPrimitive);
            this.clustersCollection.add(labelCollection);
        }

        buildSphereInstance(cluster: rpComponents.cluster.ICluster): any{

            var clusterProps: {size: number, color: any} = this.computeClusterAttributes(cluster.count);

            // Sphere geometries are initially centered on the origin.
            // We can use a model matrix to position the sphere on the globe surface.
            var positionOnEllipsoid = Cesium.Cartesian3.fromDegrees(cluster.lon, cluster.lat);
            var modelMatrix = Cesium.Matrix4.multiplyByTranslation(
                Cesium.Transforms.eastNorthUpToFixedFrame(positionOnEllipsoid),
                new Cesium.Cartesian3(cluster.lon, cluster.lat, clusterProps.size), new Cesium.Matrix4()
            );
            // Create a sphere geometry.
            var sphereGeometry = new Cesium.SphereGeometry({
                vertexFormat : Cesium.PerInstanceColorAppearance.VERTEX_FORMAT,
                radius : clusterProps.size
            });

            // Create a geometry instance using the geometry and model matrix created above.
            var sphereInstance = new Cesium.GeometryInstance({
                geometry : sphereGeometry,
                modelMatrix : modelMatrix,
                vertexFormat : Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT,
                attributes : {
                    color : Cesium.ColorGeometryInstanceAttribute.fromColor(clusterProps.color)
                },
                id: cluster
            });

            return sphereInstance;
        }

        buildLabel(cluster: rpComponents.cluster.ICluster): any{

            var clusterProps: {size: number, color: any} = this.computeClusterAttributes(cluster.count);

            return {
                position : Cesium.Cartesian3.fromDegrees(cluster.lon, cluster.lat, 20 + (clusterProps.size * 2)),
                text: cluster.count.toString(),
                fillColor: Cesium.Color.BLACK,
                outlineColor: Cesium.Color.RED,
                font: '30px arial, sans-serif',
                horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                id: cluster
            };
        }

        computeClusterAttributes(count: number): any {

            if(count < 100){
                 return {
                     size: 10000 * this.zoomLevelService.nextIndex,
                     color: Cesium.Color.fromCssColorString('#4781cd').withAlpha(0.5)
                 };
            }
            else if(count >= 10 && count < 1000){
                return {
                    size: 10000  * this.zoomLevelService.nextIndex,
                    color: Cesium.Color.fromCssColorString('#0fc70e').withAlpha(0.5)
                };
            }
            else {
                return {
                    size: 10000  * this.zoomLevelService.nextIndex,
                    color: Cesium.Color.fromCssColorString('#ff0000').withAlpha(0.5)
                };
            }
        }
    }

    // ng register
    angular
        .module('explorer.rockproperties.clusters', [])
        .factory("clusterService", ["$http", "$rootScope", "zoomLevelService", "clusterChartService", "chartSpinnerService",
            (
                $http: ng.IHttpService,
                $rootScope: ng.IRootScopeService,
                zoomLevelService: rpComponents.zoom.IZoomLevelService,
                clusterChartService: rpComponents.chartService.IClusterChartService,
                chartSpinnerService: rpComponents.spinnerService.IChartSpinnerService
            ) =>

                new rpComponents.clusterService.ClusterService(
                    $http,
                    $rootScope,
                    zoomLevelService,
                    clusterChartService,
                    chartSpinnerService
                )]);

}
