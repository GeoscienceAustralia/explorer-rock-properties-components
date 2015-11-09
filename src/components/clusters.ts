/// <reference path="../../typings/tsd.d.ts" />

declare var Cesium: any;

module rpComponents.clusterService {

    'use strict';

    export interface IClusterService {

        viewer: any;
        serviceUrl: string;
        clustersEntity: any;

        toggleClusters(): void;
        getClusters(): [rpComponents.cluster.ICluster];
        addClusters(): void;
        drawCluster(cluster: rpComponents.cluster.ICluster): void;
    }

    export class ClusterService implements IClusterService {

        http: ng.IHttpService;
        viewer: any;
        serviceUrl: string;
        clustersEntity: any;

        static $inject = [
            "$http",
        ];

        constructor(
            public $http: ng.IHttpService
        ) {}

        init(viewer: any, serviceUrl: string): void {
            this.viewer = viewer;
            this.serviceUrl = serviceUrl;
        }

        toggleClusters(): void {

            if(this.clustersEntity){
                this.clustersEntity.show = !this.clustersEntity.show;
            }
            else {
                this.clustersEntity = new Cesium.Entity();
                this.viewer.entities.add(this.clustersEntity);
                this.addClusters();
            }
        }

        getClusters(): any {
            return this.$http.get(this.serviceUrl + 'clusters');
        }

        addClusters(): void {

            this.getClusters().then((response: any) => {

                if(response.data){

                    var clusters: [rpComponents.cluster.ICluster] = response.data;

                    for(var i = 0; i < clusters.length; i++){
                        this.drawCluster(clusters[i]);
                    }
                }
                else {
                    console.log("got no clusters");
                }
            });
        }

        drawCluster(cluster: rpComponents.cluster.ICluster): void{

            var clusterProps: {size: number, color: any} = this.computeClusterAttributes(cluster.count);

            this.viewer.entities.add({
                parent: this.clustersEntity,
                label: {
                    text: cluster.count.toString(),
                    fillColor: Cesium.Color.BLACK,
                    outlineColor: Cesium.Color.WHITE,
                    eyeOffset: new Cesium.Cartesian3(0, (clusterProps.size * 2) + cluster.elev, 0)
                },
                position: Cesium.Cartesian3.fromDegrees(cluster.lon, cluster.lat, cluster.elev + clusterProps.size),
                ellipsoid : {
                    radii : new Cesium.Cartesian3(clusterProps.size, clusterProps.size, clusterProps.size),
                    material : clusterProps.color
                }
            });
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
        .factory("clusterService", ["$http", ($http: ng.IHttpService) => new rpComponents.clusterService.ClusterService($http)]);

}
