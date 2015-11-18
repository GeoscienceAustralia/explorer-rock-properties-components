/// <reference path="../../typings/tsd.d.ts" />

declare var Cesium: any;

module rpComponents.clusterService {

    'use strict';

    export interface IClusterService {

        viewer: any;
        serviceUrl: string;
        clustersCollection: any;

        toggleClusters(): void;
        getClusters(): [rpComponents.cluster.ICluster];
        addClusters(): void;
        buildSphereInstance(cluster: rpComponents.cluster.ICluster): any;
        buildLabel(cluster: rpComponents.cluster.ICluster): any;
        drawClusters(sphereInstances: any, labelCollection: any): void;
    }

    export class ClusterService implements IClusterService {

        http: ng.IHttpService;
        viewer: any;
        serviceUrl: string;
        clustersCollection: any;

        static $inject = [
            "$http",
            "$rootScope"
        ];

        constructor(
            public $http: ng.IHttpService,
            public $rootScope: ng.IRootScopeService
        ) {}

        init(viewer: any, serviceUrl: string): void {
            this.viewer = viewer;
            this.serviceUrl = serviceUrl;
        }

        toggleClusters(): void {

            if(this.clustersCollection){
                this.clustersCollection.show = !this.clustersCollection.show;
            }
            else {
                this.clustersCollection = new Cesium.PrimitiveCollection();
                this.viewer.scene.primitives.add(this.clustersCollection);

                this.addClusters();
            }
        }

        /**
         *
         * This will be extended to use extent + zoom on cluster service
         *
         * @returns {IHttpPromise<T>}
         */
        getClusters(): any {
            return this.$http.get(this.serviceUrl + 'clusters');
        }

        /**
         *
         * We get a performance benefit when we use fewer primitives/collections to draw multiple static geometries.
         *
         */
        addClusters(): void {

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
                new Cesium.Cartesian3(cluster.lon, cluster.lat, cluster.elev + clusterProps.size), new Cesium.Matrix4()
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
                attributes : {
                    color : Cesium.ColorGeometryInstanceAttribute.fromColor(clusterProps.color)
                }
            });

            return sphereInstance;
        }

        buildLabel(cluster: rpComponents.cluster.ICluster): any{

            var clusterProps: {size: number, color: any} = this.computeClusterAttributes(cluster.count);

            return {
                position : Cesium.Cartesian3.fromDegrees(cluster.lon, cluster.lat, cluster.elev + 20 + (clusterProps.size * 2)),
                text: cluster.count.toString(),
                fillColor: Cesium.Color.BLACK,
                outlineColor: Cesium.Color.RED,
                font: '30px arial, sans-serif',
                horizontalOrigin: Cesium.HorizontalOrigin.CENTER//,
                //eyeOffset: new Cesium.Cartesian3.fromDegrees(0, 0, cluster.elev)
            };
        }

        computeClusterAttributes(count: number): any {

            if(count < 10){
                 return {size: 60000, color: Cesium.Color.fromCssColorString('#4781cd').withAlpha(0.5) };
            }
            else if(count >= 10 && count < 250){
                return {size: 80000, color: Cesium.Color.fromCssColorString('#0fc70e').withAlpha(0.5) };
            }
            else {
                return {size: 90000, color: Cesium.Color.fromCssColorString('#ff0000').withAlpha(0.5) };
            }
        }
    }

    // ng register
    angular
        .module('explorer.rockproperties.clusters', [])
        .factory("clusterService", ["$http", "$rootScope",
            ($http: ng.IHttpService, $rootScope: ng.IRootScopeService) =>
                new rpComponents.clusterService.ClusterService($http, $rootScope)]);

}
