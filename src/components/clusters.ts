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
    }

    export class ClusterService implements IClusterService {

        viewer: any;
        serviceUrl: string;
        clustersCollection: any;

        static $inject = [
            "$http",
            "$rootScope",
            "zoomLevelService"
        ];

        constructor(
            public $http: ng.IHttpService,
            public $rootScope: ng.IRootScopeService,
            public zoomLevelService: rpComponents.zoom.IZoomLevelService
        ) {

        }

        init(viewer: any, serviceUrl: string): void {

            this.viewer = viewer;
            this.zoomLevelService.viewer = viewer;
            this.serviceUrl = serviceUrl;

            this.$rootScope.$on('rocks.clusters.update', () => {
                this.reCluster();
            });
        }

        toggleClusters(): void {

            if(this.clustersCollection){

                this.clustersCollection.show = !this.clustersCollection.show;
                this.zoomLevelService.setActive(this.clustersCollection.show);
                this.reCluster();
            }

            // init clusters
            else {
                this.clustersCollection = new Cesium.PrimitiveCollection();
                this.viewer.scene.primitives.add(this.clustersCollection);

                this.zoomLevelService.setActive(true);
                this.reCluster();

                var handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
                handler.setInputAction((movement: any) => {
                    var pick = this.viewer.scene.pick(movement.position);

                    //if (Cesium.defined(pick) && (pick.id === 'hello id')) {
                    if (Cesium.defined(pick)) {
                        console.log('id: ');
                        console.log(pick.id);
                    }
                }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
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
         *
         *
         * @param cluster
         */
        public getClusterInfo(cluster: rpComponents.cluster.ICluster): any {
            console.log("TODO query service for cluster info for:");
            console.log(cluster);
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
            this.clustersCollection.add(new Cesium.Primitive({
                geometryInstances : sphereInstances,
                appearance : new Cesium.PerInstanceColorAppearance({
                    translucent : true,
                    closed : true
                })
            }));

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
                id: cluster // for picking
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
                horizontalOrigin: Cesium.HorizontalOrigin.CENTER//,
            };
        }

        computeClusterAttributes(count: number): any {

            if(count < 10){
                 return {size: 10000 * this.zoomLevelService.nextIndex, color: Cesium.Color.fromCssColorString('#4781cd').withAlpha(0.5) };
            }
            else if(count >= 10 && count < 1000){
                return {size: 10000  * this.zoomLevelService.nextIndex, color: Cesium.Color.fromCssColorString('#0fc70e').withAlpha(0.5) };
            }
            else {
                return {size: 10000  * this.zoomLevelService.nextIndex, color: Cesium.Color.fromCssColorString('#ff0000').withAlpha(0.5) };
            }
        }
    }

    // ng register
    angular
        .module('explorer.rockproperties.clusters', [])
        .factory("clusterService", ["$http", "$rootScope", "zoomLevelService",
            ($http: ng.IHttpService, $rootScope: ng.IRootScopeService, zoomLevelService: rpComponents.zoom.IZoomLevelService) =>
                new rpComponents.clusterService.ClusterService($http, $rootScope, zoomLevelService)]);

}
